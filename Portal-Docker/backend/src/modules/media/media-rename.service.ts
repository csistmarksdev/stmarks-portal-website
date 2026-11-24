import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { readdir, rename } from "node:fs/promises";
import { basename, extname, join, posix, resolve } from "node:path";
import type { Connection, Model } from "mongoose";

import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { slugify } from "../../common/utils/slugify";
import { AuditService } from "../audit/audit.service";
import { RevalidateService } from "../revalidate/revalidate.service";
import { readableFileStem } from "./media.service";
import { MediaEntity } from "./schemas/media.schema";

/* -------------------------------------------------------------------------- */
/* The rules — pure, so the live rename and a rename of the bundled snapshot   */
/* and seed data (scripts/rename-media-files.mjs) name files identically.      */
/* -------------------------------------------------------------------------- */

/** A stored name that is only a UUID — what every upload got before readable names. */
export const ID_ONLY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Any reference to a stored upload inside a record: `…/uploads/images/x.jpg`
 * in a live database, or `{{MEDIA}}/images/x.jpg` in the bundled snapshot and
 * seed data (the placeholder becomes the media origin on restore).
 * Group 1 is the prefix, group 2 the path under the upload directory.
 */
export const UPLOAD_REF = /(uploads|\{\{MEDIA\}\})\/((?:images|videos|files|thumbs)\/[^"'?#\s\\)]+)/g;

/** Cheap pre-check before scanning a whole document. */
export const mentionsUpload = (text: string): boolean =>
  text.includes("uploads/") || text.includes("{{MEDIA}}/");

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;

/** The title a record is known by, for naming the files it shows. */
export function recordTitle(record: Record<string, unknown>): string | undefined {
  const title = record.title as { en?: string } | undefined;
  const name = record.name as { en?: string } | string | undefined;
  return (
    title?.en?.trim() ||
    (typeof name === "object" ? name?.en?.trim() : undefined) ||
    (typeof name === "string" ? name.trim() : undefined) ||
    undefined
  );
}

/** upload path → titles of the records that reference it. */
export function buildUsage(records: Iterable<Record<string, unknown>>): Map<string, string[]> {
  const used = new Map<string, string[]>();
  for (const record of records) {
    const text = JSON.stringify(record);
    if (!mentionsUpload(text)) continue;
    const title = recordTitle(record);
    for (const match of text.matchAll(UPLOAD_REF)) {
      const list = used.get(match[2]) ?? [];
      if (title && !list.includes(title)) list.push(title);
      used.set(match[2], list);
    }
  }
  return used;
}

/**
 * The readable name for one file, and where it came from: alt text, then its
 * own file name, then the title of a record that shows it, then — last
 * resort — whatever its file name was, since `scene2` still beats an id.
 */
export function chooseStem(
  file: { filename: string; alt?: { en?: string } | null },
  usedBy: string[],
): { stem: string; source: string } {
  const fromAlt = readableFileStem("", file.alt?.en);
  if (fromAlt) return { stem: fromAlt, source: "alt text" };
  const fromName = readableFileStem(file.filename);
  if (fromName) return { stem: fromName, source: "original file name" };
  const fromTitle = usedBy.length ? readableFileStem("", undefined, usedBy[0]) : "";
  if (fromTitle) return { stem: fromTitle, source: `title of “${usedBy[0]}”` };
  const weak = slugify(file.filename.replace(/\.[^.]*$/, "")).slice(0, 60);
  if (/[a-z]/.test(weak) && !ID_ONLY.test(weak)) {
    return { stem: weak, source: "original file name (add alt text for a better one)" };
  }
  return {
    stem: "",
    source: "Nothing readable to name it by: add English alt text in the media library first.",
  };
}

export interface RenamePlanItem {
  id: string;
  /** The name the uploader gave it, for recognising it in the list. */
  filename: string;
  from: string;
  /** null when nothing readable could be found for it. */
  to: string | null;
  /** The thumbnail's current and new path, when it has one. */
  thumbFrom?: string;
  thumbTo?: string;
  /** Where the readable name came from, or why there is none. */
  source: string;
  /** Titles of the records that show it. */
  usedBy: string[];
}

/**
 * A readable name that still ends in a short id — `sunrise-over-the-church-47b63c8c`
 * — as the first version of readable names produced. Eight hex characters
 * with both a digit and a letter, so a real word or a date never matches.
 */
export const HASH_SUFFIX = /-(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{8}(?:-\d+)?$/;

/**
 * Whether a name carries an id on the end: by its look, or — for an id that
 * happens to be all digits (`-86323155`) — because the file was once stored
 * under the full id it was cut from.
 */
export function hasIdSuffix(name: string, previousPaths: string[] = []): boolean {
  if (HASH_SUFFIX.test(name)) return true;
  const tail = name.match(/-([0-9a-f]{8})(?:-\d+)?$/)?.[1];
  return (
    !!tail &&
    previousPaths.some((old) => {
      const id = basename(old, extname(old));
      return ID_ONLY.test(id) && id.startsWith(tail);
    })
  );
}

/** `images/foo.jpg` → `images/foo`: names clash whatever their extension. */
const nameKey = (path: string) => path.replace(/\.[^./]*$/, "");

/**
 * What renaming would do for these files — pure, nothing is touched.
 *
 * Files named only by an id, or by a name with an id on the end, get their
 * readable name with nothing added; when two would share one, the later gets
 * `-2`, `-3`… A name is never reused if any file has it now, if it is listed
 * in `reserved` (files on disk), or if a renamed file used to have it — that
 * old address redirects, so handing it out again would misroute it.
 */
export function planRenames(
  files: Array<{
    id: string;
    filename: string;
    path: string;
    thumbnailPath?: string | null;
    alt?: { en?: string } | null;
    previousPaths?: string[] | null;
  }>,
  usage: Map<string, string[]>,
  reserved: Iterable<string> = [],
): RenamePlanItem[] {
  const taken = new Set<string>();
  for (const path of reserved) taken.add(nameKey(path));
  for (const file of files) {
    taken.add(nameKey(file.path));
    for (const old of file.previousPaths ?? []) taken.add(nameKey(old));
  }
  const items: RenamePlanItem[] = [];

  for (const file of files) {
    const ext = extname(file.path);
    const current = basename(file.path, ext);
    if (!ID_ONLY.test(current) && !hasIdSuffix(current, file.previousPaths ?? [])) continue; // already readable

    const usedBy = [
      ...(usage.get(file.path) ?? []),
      ...(file.thumbnailPath ? (usage.get(file.thumbnailPath) ?? []) : []),
    ].filter((title, i, all) => all.indexOf(title) === i);
    const { stem, source } = chooseStem(file, usedBy);

    let to: string | null = null;
    if (stem) {
      const dir = posix.dirname(file.path);
      let name = stem;
      for (let n = 2; taken.has(`${dir}/${name}`); n += 1) name = `${stem}-${n}`;
      taken.add(`${dir}/${name}`);
      to = `${dir}/${name}${ext}`;
    }
    const thumbTo =
      to && file.thumbnailPath
        ? posix.join(posix.dirname(file.thumbnailPath), `${basename(to, ext)}${extname(file.thumbnailPath)}`)
        : undefined;

    items.push({
      id: file.id,
      filename: file.filename,
      from: file.path,
      to,
      ...(file.thumbnailPath ? { thumbFrom: file.thumbnailPath } : {}),
      ...(thumbTo ? { thumbTo } : {}),
      source,
      usedBy,
    });
  }
  return items;
}

/** old path → new path for every file (and thumbnail) a plan renames. */
export function movesOf(plan: RenamePlanItem[]): Map<string, string> {
  const moves = new Map<string, string>();
  for (const item of plan) {
    if (!item.to) continue;
    moves.set(item.from, item.to);
    if (item.thumbFrom && item.thumbTo) moves.set(item.thumbFrom, item.thumbTo);
  }
  return moves;
}

/**
 * The value with every reference to a moved upload pointed at its new path.
 * Walks plain objects and arrays only, so dates, ids and other BSON values —
 * or EJSON wrappers in a JSON file — are left exactly as they were.
 */
export function rewriteUploadRefs(
  value: unknown,
  moves: Map<string, string>,
): { value: unknown; changed: boolean } {
  if (typeof value === "string") {
    if (!mentionsUpload(value)) return { value, changed: false };
    const next = value.replace(UPLOAD_REF, (whole, prefix: string, path: string) => {
      const moved = moves.get(path);
      return moved ? `${prefix}/${moved}` : whole;
    });
    return { value: next, changed: next !== value };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((entry) => {
      const result = rewriteUploadRefs(entry, moves);
      changed ||= result.changed;
      return result.value;
    });
    return { value: changed ? next : value, changed };
  }
  if (isPlainObject(value)) {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      const result = rewriteUploadRefs(entry, moves);
      changed ||= result.changed;
      next[key] = result.value;
    }
    return { value: changed ? next : value, changed };
  }
  return { value, changed: false };
}

/* -------------------------------------------------------------------------- */
/* The service                                                                */
/* -------------------------------------------------------------------------- */

export interface RenameResult {
  renamed: number;
  skipped: number;
  recordsUpdated: number;
}

/**
 * Gives uploads stored under a bare UUID a readable, search-friendly name,
 * and keeps every link working.
 *
 * Renaming rewrites every stored reference in every collection, and the old
 * path is remembered: `/uploads/<old>` answers with a permanent redirect to
 * the new one, so links already shared or indexed keep working.
 */
@Injectable()
export class MediaRenameService implements OnModuleInit {
  private readonly logger = new Logger(MediaRenameService.name);
  private readonly uploadRoot: string;
  /** old path → current path, e.g. `images/<uuid>.jpg` → `images/harvest-….jpg`. */
  private redirects = new Map<string, string>();

  constructor(
    @InjectModel(MediaEntity.name) private readonly model: Model<MediaEntity>,
    @InjectConnection() private readonly connection: Connection,
    config: ConfigService,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
  ) {
    this.uploadRoot = resolve(process.cwd(), config.get<string>("uploadDir", "uploads"));
  }

  async onModuleInit(): Promise<void> {
    await this.loadRedirects().catch((error: Error) =>
      this.logger.warn(`Could not load media redirects: ${error.message}`),
    );
  }

  /** Where an old upload path now lives, or null. Synchronous: runs per request. */
  redirectFor(path: string): string | null {
    return this.redirects.get(path.replace(/^\/+/, "")) ?? null;
  }

  /** Re-reads the redirect table — after a rename, or a restore replaced the media. */
  async loadRedirects(): Promise<void> {
    const docs = await this.model
      .find(
        { previousPaths: { $exists: true, $ne: [] } },
        { path: 1, thumbnailPath: 1, previousPaths: 1 },
      )
      .lean();
    const next = new Map<string, string>();
    for (const doc of docs) {
      for (const old of doc.previousPaths ?? []) {
        // A thumbnail's old name redirects to the current thumbnail.
        next.set(old, old.startsWith("thumbs/") && doc.thumbnailPath ? doc.thumbnailPath : doc.path);
      }
    }
    this.redirects = next;
  }

  /** Every collection but the media library itself. */
  private async contentCollections() {
    const db = this.connection.db;
    if (!db) return [];
    const list = await db.listCollections({}, { nameOnly: true }).toArray();
    return list
      .map((entry) => entry.name)
      .filter((name) => name !== "media" && !name.startsWith("system."))
      .map((name) => db.collection(name));
  }

  private async usage(): Promise<Map<string, string[]>> {
    const records: Record<string, unknown>[] = [];
    for (const collection of await this.contentCollections()) {
      for await (const doc of collection.find({})) {
        if (mentionsUpload(JSON.stringify(doc))) records.push(doc as Record<string, unknown>);
      }
    }
    return buildUsage(records);
  }

  /** What renaming would do — nothing is changed. */
  async plan(): Promise<RenamePlanItem[]> {
    const docs = await this.model.find().sort({ createdAt: 1 });
    return planRenames(
      docs.map((doc) => ({
        id: doc.id as string,
        filename: doc.filename,
        path: doc.path,
        thumbnailPath: doc.thumbnailPath,
        alt: doc.alt,
        previousPaths: doc.previousPaths,
      })),
      await this.usage(),
      await this.filesOnDisk(),
    );
  }

  /** Every stored file, as `images/x.jpg` — names a rename must not take. */
  private async filesOnDisk(): Promise<string[]> {
    const paths: string[] = [];
    for (const dir of ["images", "videos", "files", "thumbs"]) {
      const names = await readdir(join(this.uploadRoot, dir)).catch(() => [] as string[]);
      for (const name of names) paths.push(`${dir}/${name}`);
    }
    return paths;
  }

  /** Renames the files, rewrites every reference, and starts redirecting the old paths. */
  async apply(actor: AuthenticatedUser): Promise<RenameResult> {
    const plan = await this.plan();
    let renamed = 0;

    for (const item of plan) {
      if (!item.to) continue;
      const doc = await this.model.findById(item.id);
      if (!doc) continue;

      await this.move(item.from, item.to);
      if (item.thumbFrom && item.thumbTo) await this.move(item.thumbFrom, item.thumbTo);

      doc.path = item.to;
      if (item.thumbTo) doc.thumbnailPath = item.thumbTo;
      doc.previousPaths = [
        ...(doc.previousPaths ?? []),
        item.from,
        ...(item.thumbFrom ? [item.thumbFrom] : []),
      ];
      await doc.save();
      renamed += 1;
    }

    const moves = movesOf(plan);
    const recordsUpdated = moves.size ? await this.rewriteReferences(moves) : 0;
    await this.loadRedirects();

    if (renamed) {
      await this.audit.log(
        actor,
        "update",
        "media",
        "seo-names",
        `Gave ${renamed} file(s) readable names; updated ${recordsUpdated} record(s)`,
      );
      // Every page that shows media needs the new addresses.
      this.revalidate.trigger(
        "events",
        "blog",
        "gallery",
        "announcements",
        "downloads",
        "fellowships",
        "church",
      );
    }
    return { renamed, skipped: plan.length - renamed, recordsUpdated };
  }

  /** A missing file still gets its new name in the database — nothing to move. */
  private async move(from: string, to: string): Promise<void> {
    try {
      await rename(join(this.uploadRoot, from), join(this.uploadRoot, to));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      this.logger.warn(`Rename: ${from} was not on disk; only its references were updated`);
    }
  }

  private async rewriteReferences(moves: Map<string, string>): Promise<number> {
    let updated = 0;
    for (const collection of await this.contentCollections()) {
      for await (const doc of collection.find({})) {
        if (!mentionsUpload(JSON.stringify(doc))) continue;
        const { value, changed } = rewriteUploadRefs(doc, moves);
        if (!changed) continue;
        await collection.replaceOne({ _id: doc._id }, value as typeof doc);
        updated += 1;
      }
    }
    return updated;
  }
}
