import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  OnModuleDestroy,
  OnModuleInit,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectConnection } from "@nestjs/mongoose";
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  type BackupManifest,
  type BackupPreview,
  type BackupTicket,
  type RestoreMode,
  type RestoreResult,
  type StagedRestore,
} from "@portal/shared";
import mongoose, { Connection } from "mongoose";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { humanFileSize } from "../../common/utils/format";
import { AuditService } from "../audit/audit.service";
import { RevalidateService } from "../revalidate/revalidate.service";
import { ZipReader, ZipWriter, resolveWithin, type ArchiveEntry } from "./archive";
import { resolveMedia, tokeniseMedia } from "./media-tokens";

const { EJSON } = mongoose.mongo.BSON;

/**
 * How long a built archive or a staged upload survives before being swept.
 *
 * Long enough to download a large file over a slow office connection and to
 * read the manifest before deciding; short enough that a database dump
 * containing every password hash is not sitting in the temp directory for the
 * rest of the day.
 */
const TICKET_TTL_MS = 30 * 60 * 1000;

/**
 * Collections Mongo maintains itself. It rebuilds them from the data and
 * refuses writes to them, so carrying them turns a restore into a pile of
 * errors that hide the real ones.
 */
const INTERNAL_COLLECTION = /^system\./;

/** Names a restore will accept. Anything else is a malformed or hostile archive. */
const COLLECTION_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$/;

/** Website cache tags to refresh after a restore — every content surface moved. */
const ALL_CONTENT_TAGS = [
  "events",
  "blog",
  "gallery",
  "announcements",
  "downloads",
  "fellowships",
  "church",
];

/** Already-compressed uploads; deflating them again costs CPU and saves nothing. */
const INCOMPRESSIBLE = /\.(jpe?g|png|webp|avif|gif|mp4|webm|mov|ogg|pdf|zip|docx|xlsx|pptx)$/i;

/**
 * Where built archives and incoming uploads both live.
 *
 * Exported because multer's `diskStorage` is configured in the controller's
 * decorators, which are evaluated before any provider exists — it cannot ask
 * the service where to write. One constant keeps the two ends from drifting
 * into separate directories, only one of which is ever swept.
 *
 * Overridable because the default is the container's own writable layer, which
 * on a small host has far less room than the volume the media lives on — and a
 * backup is, by definition, about as large as the media library. Point
 * `BACKUP_WORK_DIR` at a mounted volume when `/tmp` is tight.
 */
export const BACKUP_WORK_DIR =
  process.env.BACKUP_WORK_DIR ?? join(tmpdir(), "csistmc-portal-backup");

/**
 * Ceiling on what an uploaded archive is allowed to expand to.
 *
 * The upload itself is already capped, but a zip's compressed size says nothing
 * about its expanded one: a few megabytes of zeros unpack to hundreds of
 * gigabytes. Restoring one would fill the disk, and on the single-container
 * deployment that disk is also MongoDB's — so a bad archive takes the database
 * with it rather than just failing.
 *
 * Checked before a single byte is written, from the sizes in the zip's own
 * directory. A hostile archive can of course under-declare them; that case ends
 * at the real disk rather than here, which is the ordinary out-of-space failure
 * and recoverable. This catches the accident, which is the likely one.
 */
const MAX_EXPANDED_BYTES =
  Number(process.env.MAX_BACKUP_EXPANDED_MB ?? 16_384) * 1024 * 1024;

/** `1 record` / `570 records` — audit lines are read, not parsed. */
function plural(count: number, noun: string): string {
  return `${count.toLocaleString("en-IN")} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * `8 Aug 2026` — for an audit line someone reads at a glance.
 *
 * The manifest keeps the full ISO instant; this is only how it is narrated. A
 * raw `2026-08-08T17:41:16.044Z` in the activity feed is precision nobody asked
 * for, at the cost of a line too long to read.
 */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface BackupRecord {
  id: string;
  token: string;
  path: string;
  filename: string;
  sizeBytes: number;
  manifest: BackupManifest;
  expiresAt: number;
}

interface StagedRecord {
  id: string;
  path: string;
  manifest: BackupManifest;
  expiresAt: number;
  detail: StagedRestore;
}

@Injectable()
export class BackupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupService.name);
  private readonly uploadRoot: string;
  private readonly publicUrl: string;
  private readonly workDir = BACKUP_WORK_DIR;

  /*
   * In memory, not in Mongo. Both maps describe files in a temp directory that
   * does not survive a restart either, so persisting the index would only
   * create rows pointing at files that are gone. The Portal is a single
   * process — the Docker image runs one container — so there is no second
   * instance that would need to see these.
   */
  private readonly backups = new Map<string, BackupRecord>();
  private readonly staged = new Map<string, StagedRecord>();

  constructor(
    @InjectConnection() private readonly connection: Connection,
    config: ConfigService,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
  ) {
    this.uploadRoot = resolve(process.cwd(), config.get<string>("uploadDir", "uploads"));
    this.publicUrl = config.get<string>("publicUrl", "http://localhost:4000");
  }

  /** Clears anything a previous run left behind — its tokens died with it. */
  async onModuleInit(): Promise<void> {
    await rm(this.workDir, { recursive: true, force: true }).catch(() => undefined);
    await mkdir(this.workDir, { recursive: true });
  }

  onModuleDestroy(): void {
    // Fire-and-forget: shutdown must not block on a directory removal, and the
    // next boot wipes it anyway.
    void rm(this.workDir, { recursive: true, force: true }).catch(() => undefined);
  }

  /* ------------------------------------------------------------------------ */
  /* Shared helpers                                                           */
  /* ------------------------------------------------------------------------ */

  private get db() {
    const db = this.connection.db;
    if (!db) throw new UnprocessableEntityException("Database is not connected");
    return db;
  }

  /** Where `{{MEDIA}}` resolves to on this installation. */
  private get mediaBase(): string {
    return `${this.publicUrl.replace(/\/$/, "")}/uploads`;
  }

  private async collectionNames(): Promise<string[]> {
    const all = await this.db.listCollections({}, { nameOnly: true }).toArray();
    return all
      .map((entry) => entry.name)
      .filter((name) => !INTERNAL_COLLECTION.test(name))
      .sort();
  }

  /** Every file under `dir`, as forward-slash paths relative to it. */
  private async walkUploads(dir = this.uploadRoot): Promise<string[]> {
    const found: string[] = [];
    const visit = async (current: string): Promise<void> => {
      const entries = await readdir(current, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        const full = join(current, entry.name);
        if (entry.isDirectory()) await visit(full);
        else if (entry.isFile()) found.push(relative(dir, full).split("\\").join("/"));
      }
    };
    await visit(dir);
    return found.sort();
  }

  /**
   * Drops expired archives and staged uploads, and the files behind them.
   *
   * Called at the top of every entry point rather than on a timer. There is no
   * background work to keep alive between requests, and a temp directory that
   * is tidied when someone visits the page is tidied often enough — the boot
   * wipe in `onModuleInit` covers whatever a quiet week leaves behind.
   */
  private sweep(): void {
    const now = Date.now();
    for (const store of [this.backups, this.staged]) {
      for (const [id, record] of store) {
        if (record.expiresAt > now) continue;
        store.delete(id);
        void rm(record.path, { force: true }).catch(() => undefined);
      }
    }
  }

  private toTicket(record: BackupRecord): BackupTicket {
    return {
      id: record.id,
      filename: record.filename,
      sizeBytes: record.sizeBytes,
      size: humanFileSize(record.sizeBytes),
      downloadPath: `/admin/backup/${record.id}/download?token=${record.token}`,
      expiresAt: new Date(record.expiresAt).toISOString(),
      manifest: record.manifest,
    };
  }

  /* ------------------------------------------------------------------------ */
  /* Backup                                                                   */
  /* ------------------------------------------------------------------------ */

  /** What a backup taken right now would contain, without building it. */
  async preview(): Promise<BackupPreview> {
    const names = await this.collectionNames();
    const collections: Record<string, number> = {};
    let documents = 0;

    for (const name of names) {
      const count = await this.db.collection(name).countDocuments();
      collections[name] = count;
      documents += count;
    }

    const files = await this.walkUploads();
    let bytes = 0;
    for (const file of files) {
      const info = await stat(join(this.uploadRoot, file)).catch(() => null);
      if (info) bytes += info.size;
    }

    return {
      collections,
      documents,
      uploads: { files: files.length, bytes },
      /*
       * The media is stored uncompressed in the archive and dominates the
       * total, so its byte count is a close and honest lower bound. Estimating
       * the JSON's compressed size would be guesswork dressed up as precision.
       */
      estimatedSize: humanFileSize(bytes),
    };
  }

  /**
   * Builds a complete archive of the installation and returns a ticket for it.
   *
   * Everything goes in: content, media library, admin accounts, the audit
   * trail, the contact inbox. This is a clone, not an export — the point is
   * that restoring it produces the installation that was backed up, and an
   * archive missing the user table produces a site nobody can sign in to.
   *
   * `_id` is preserved for the same reason. Documents reference each other by
   * id — a gallery album's cover is a `media` record — and letting Mongo assign
   * fresh ones on restore would sever every one of those.
   */
  async create(
    actor: AuthenticatedUser | null,
    ip?: string,
    /** How the audit line describes it — a plain download, or a pre-restore net. */
    reason: "download" | "safety" = "download",
  ): Promise<BackupTicket> {
    this.sweep();

    const id = randomUUID();
    const path = join(this.workDir, `${id}.zip`);
    const writer = new ZipWriter(path);
    const capturedAt = new Date();

    const collections: Record<string, number> = {};
    let documents = 0;

    for (const name of await this.collectionNames()) {
      /*
       * Whole collection in memory at once. Correct at this scale — a parish
       * CMS holds thousands of documents, not millions — and the alternative
       * (interleaving a cursor with archiver's entry queue) trades real
       * clarity for headroom nobody here will use.
       */
      const docs = await this.db.collection(name).find({}).toArray();

      /*
       * Empty collections are still written. An empty `downloads` is a fact
       * about the installation: the restore then knows it was seen and
       * considered, rather than leaving a reader wondering whether it was
       * missed.
       */
      writer.text(
        `db/${name}.json`,
        EJSON.stringify(docs.map(tokeniseMedia), undefined, 2, { relaxed: false }) + "\n",
      );
      collections[name] = docs.length;
      documents += docs.length;
    }

    /*
     * Every upload is copied, not only the files some record links to. An
     * admin who deletes a gallery album leaves its images in the library, and
     * a reference-only capture would silently drop them — the media page would
     * come back with holes in it.
     */
    const files = await this.walkUploads();
    let uploadBytes = 0;
    for (const file of files) {
      const full = join(this.uploadRoot, file);
      const info = await stat(full).catch(() => null);
      if (!info) continue; // deleted between the listing and now
      writer.file(full, `uploads/${file}`, { store: INCOMPRESSIBLE.test(file) });
      uploadBytes += info.size;
    }

    const manifest: BackupManifest = {
      format: BACKUP_FORMAT,
      formatVersion: BACKUP_FORMAT_VERSION,
      capturedAt: capturedAt.toISOString(),
      publicUrl: this.publicUrl,
      database: this.db.databaseName,
      createdBy: actor
        ? { id: actor.userId, name: actor.name, email: actor.email }
        : undefined,
      collections,
      documents,
      uploads: { files: files.length, bytes: uploadBytes },
    };
    writer.text("manifest.json", JSON.stringify(manifest, null, 2) + "\n");

    const sizeBytes = await writer.finish();

    const record: BackupRecord = {
      id,
      // 256 bits, because this token alone authorises the download (see the
      // controller for why it cannot be a Bearer header).
      token: randomBytes(32).toString("base64url"),
      path,
      filename: `csistmc-portal-backup-${capturedAt.toISOString().slice(0, 19).replace(/[:T]/g, "-")}.zip`,
      sizeBytes,
      manifest,
      expiresAt: Date.now() + TICKET_TTL_MS,
    };
    this.backups.set(id, record);

    await this.audit.log(
      actor,
      "create",
      "backup",
      id,
      /*
       * Verb-first and without the actor's name, like every other summary
       * here. The audit feed renders the name beside the line already, so
       * naming them again reads as "Administrator downloaded a backup —
       * Administrator".
       */
      (reason === "safety" ? "Backed up before restoring" : "Downloaded a backup") +
        ` — ${plural(documents, "record")}, ${plural(files.length, "file")}, ` +
        humanFileSize(sizeBytes),
      ip,
    );

    return this.toTicket(record);
  }

  /**
   * Resolves a download ticket.
   *
   * The token is compared in constant time. The window is small and the token
   * is long, but a comparison that returns early on the first wrong byte is a
   * measurable oracle, and there is no reason to leave one in the path that
   * hands out every password hash in the database.
   */
  claim(id: string, token: string): { path: string; filename: string; sizeBytes: number } {
    this.sweep();

    const record = this.backups.get(id);
    if (!record) throw new NotFoundException("That backup has expired — please build a new one");

    const expected = Buffer.from(record.token);
    const supplied = Buffer.from(token ?? "");
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    ) {
      throw new NotFoundException("That backup has expired — please build a new one");
    }

    return { path: record.path, filename: record.filename, sizeBytes: record.sizeBytes };
  }

  /* ------------------------------------------------------------------------ */
  /* Restore — staging                                                        */
  /* ------------------------------------------------------------------------ */

  /**
   * Reads an uploaded archive, checks it over, and holds it.
   *
   * Nothing is written to the database or the upload directory here. A restore
   * cannot be undone, so the CMS gets to show what is actually in the file —
   * when it was taken, from which installation, how much of it there is —
   * before anyone commits to it. The alternative, uploading the file a second
   * time to confirm, is not a kindness on a church's connection.
   */
  async stage(zipPath: string, actor: AuthenticatedUser): Promise<StagedRestore> {
    this.sweep();

    let reader: ZipReader;
    try {
      reader = await ZipReader.open(zipPath);
    } catch {
      await rm(zipPath, { force: true }).catch(() => undefined);
      throw new BadRequestException("That file is not a readable zip archive");
    }

    /*
     * The reader is closed on both paths before the file is touched. On Windows
     * an open handle makes the file undeletable, so a `finally` that removed
     * the upload while yauzl still held it would leave the temp directory
     * filling up with archives nothing has a record of.
     */
    try {
      const manifest = await this.readManifest(reader);
      const warnings: string[] = [];

      if (reader.rejected.length > 0) {
        /*
         * Unsafe names are dropped, not fatal. A zip built by a third-party
         * tool can carry `__MACOSX/` junk and a stray absolute path; refusing
         * the whole restore over one would be brittle. But an admin should be
         * told what is being ignored rather than discovering it afterwards.
         */
        warnings.push(
          `${reader.rejected.length} entr${reader.rejected.length === 1 ? "y was" : "ies were"} ` +
            `skipped for an unsafe path (e.g. "${reader.rejected[0]}")`,
        );
      }

      const dbEntries = this.databaseEntries(reader);
      if (dbEntries.length === 0) {
        throw new UnprocessableEntityException(
          "This archive contains no collections — it is not a Portal backup",
        );
      }

      const uploadEntries = reader.entries.filter((entry) => entry.name.startsWith("uploads/"));
      const uploadBytes = uploadEntries.reduce((sum, entry) => sum + entry.uncompressedSize, 0);

      /*
       * Every entry, not just the media — a single enormous `db/*.json` is
       * parsed into memory in one go and would exhaust the heap long before
       * the disk.
       */
      const expandedBytes = reader.entries.reduce(
        (sum, entry) => sum + entry.uncompressedSize,
        0,
      );
      if (expandedBytes > MAX_EXPANDED_BYTES) {
        throw new PayloadTooLargeException(
          `That archive expands to ${humanFileSize(expandedBytes)}; the limit is ` +
            `${humanFileSize(MAX_EXPANDED_BYTES)}. Raise MAX_BACKUP_EXPANDED_MB if this is genuine.`,
        );
      }

      const present = new Set(await this.collectionNames());
      const inArchive = new Set(dbEntries.map((entry) => entry.collection));
      const untouched = [...present].filter((name) => !inArchive.has(name)).sort();

      if (manifest.publicUrl.replace(/\/$/, "") !== this.publicUrl.replace(/\/$/, "")) {
        warnings.push(
          `Taken from ${manifest.publicUrl}. Media links will be rewritten to ${this.publicUrl}.`,
        );
      }
      if (manifest.database !== this.db.databaseName) {
        warnings.push(
          `Taken from database "${manifest.database}"; this installation uses "${this.db.databaseName}".`,
        );
      }
      if (inArchive.has("users")) {
        warnings.push(
          "Admin accounts and passwords will be restored as they were. " +
            "You may have to sign in again with the password from that time.",
        );
      }

      const id = randomUUID();
      const detail: StagedRestore = {
        id,
        expiresAt: new Date(Date.now() + TICKET_TTL_MS).toISOString(),
        manifest,
        uploadBytes,
        untouchedCollections: untouched,
        warnings,
      };

      this.staged.set(id, {
        id,
        path: zipPath,
        manifest,
        expiresAt: Date.now() + TICKET_TTL_MS,
        detail,
      });

      this.logger.log(
        `${actor.name} staged a backup from ${manifest.capturedAt} ` +
          `(${manifest.documents} document(s), ${uploadEntries.length} file(s))`,
      );

      reader.close();
      return detail;
    } catch (error) {
      reader.close();
      await rm(zipPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  private async readManifest(reader: ZipReader): Promise<BackupManifest> {
    const entry = reader.find("manifest.json");
    if (!entry) {
      throw new UnprocessableEntityException(
        "This archive has no manifest.json — it was not produced by this Portal",
      );
    }

    let manifest: BackupManifest;
    try {
      manifest = JSON.parse((await reader.read(entry)).toString("utf8")) as BackupManifest;
    } catch {
      throw new UnprocessableEntityException("The archive's manifest.json is not valid JSON");
    }

    if (manifest?.format !== BACKUP_FORMAT) {
      throw new UnprocessableEntityException(
        "This is not a Portal backup archive (unexpected manifest format)",
      );
    }
    /*
     * Newer archives are refused outright rather than read optimistically. A
     * future format will mean fields this code does not know to restore, and a
     * partial restore that reports success is worse than one that declines.
     */
    if (!(manifest.formatVersion <= BACKUP_FORMAT_VERSION)) {
      throw new UnprocessableEntityException(
        `This backup is version ${manifest.formatVersion}; this Portal reads up to ` +
          `${BACKUP_FORMAT_VERSION}. Update the Portal and try again.`,
      );
    }

    return manifest;
  }

  /** `db/<collection>.json` entries, with the collection name validated. */
  private databaseEntries(
    reader: ZipReader,
  ): Array<{ collection: string; entry: ArchiveEntry }> {
    return reader.entries.flatMap((entry) => {
      const match = /^db\/(.+)\.json$/.exec(entry.name);
      if (!match) return [];
      const collection = match[1];
      // `_manifest.json` is what the Docker snapshot writer puts beside its
      // collection dumps; skipping leading underscores keeps that layout
      // readable here rather than trying to insert it as a collection.
      if (collection.startsWith("_")) return [];
      if (!COLLECTION_NAME.test(collection) || INTERNAL_COLLECTION.test(collection)) {
        throw new UnprocessableEntityException(
          `The archive contains an unusable collection name: "${collection}"`,
        );
      }
      return [{ collection, entry }];
    });
  }

  /* ------------------------------------------------------------------------ */
  /* Restore — applying                                                       */
  /* ------------------------------------------------------------------------ */

  /**
   * Applies a staged archive.
   *
   * Order matters. Media is written first, then the database: if the run dies
   * between the two, the installation is left with files nothing references,
   * which is harmless. The reverse — records restored and their images missing
   * — is a site full of broken pictures.
   */
  async apply(
    id: string,
    mode: RestoreMode,
    safetyBackup: boolean,
    actor: AuthenticatedUser,
    ip?: string,
  ): Promise<RestoreResult> {
    this.sweep();

    const record = this.staged.get(id);
    if (!record) {
      throw new NotFoundException("That upload has expired — please upload the backup again");
    }

    /*
     * Taken before anything is touched, and offered back in the response. A
     * `replace` restore is the one irreversible action in the CMS; this is the
     * difference between a mistake that costs an afternoon and one that costs
     * everything since the last backup. The ticket's download link carries its
     * own token, so it still works even if this restore replaces the account
     * making the request.
     */
    const rollback = safetyBackup ? await this.create(actor, ip, "safety") : undefined;

    const reader = await ZipReader.open(record.path);
    try {
      const uploads = await this.restoreUploads(reader, mode);
      const collections = await this.restoreCollections(reader, mode);

      const documents = collections.reduce(
        (sum, entry) => sum + entry.inserted + entry.updated,
        0,
      );
      const usersReplaced = collections.some((entry) => entry.name === "users");

      /*
       * Written after the restore, deliberately. In `replace` mode the archive
       * has just overwritten `audit_logs` with the trail as it stood when the
       * backup was taken; this line then lands on top of it, so the history
       * ends with the fact that it was replaced rather than pretending the
       * intervening months never happened.
       */
      await this.audit.log(
        actor,
        "update",
        "backup",
        record.id,
        `Restored the ${shortDate(record.manifest.capturedAt)} backup, ` +
          `${mode === "replace" ? "replacing everything" : "merging"} — ` +
          `${plural(documents, "record")}, ${plural(uploads.written, "file")}`,
        ip,
      );

      this.revalidate.trigger(...ALL_CONTENT_TAGS);

      return {
        mode,
        manifest: record.manifest,
        collections,
        documents,
        uploads,
        usersReplaced,
        safetyBackup: rollback,
      };
    } finally {
      reader.close();
      this.staged.delete(id);
      await rm(record.path, { force: true }).catch(() => undefined);
    }
  }

  private async restoreUploads(
    reader: ZipReader,
    mode: RestoreMode,
  ): Promise<{ written: number; skipped: number }> {
    let written = 0;
    let skipped = 0;

    for (const entry of reader.entries) {
      if (!entry.name.startsWith("uploads/")) continue;
      const relativePath = entry.name.slice("uploads/".length);
      if (relativePath === "") continue;

      const target = resolveWithin(this.uploadRoot, relativePath);
      if (target === null) {
        // `safeEntryName` should have caught this already. Belt and braces: the
        // cost of being wrong here is writing outside the upload directory.
        this.logger.warn(`Refusing upload entry outside the media root: ${entry.name}`);
        skipped += 1;
        continue;
      }

      /*
       * In `merge`, an existing file wins. The two are supposed to be the same
       * bytes under the same generated name, and if they are not, the live one
       * is what current records point at.
       */
      if (mode === "merge" && (await stat(target).catch(() => null))) {
        skipped += 1;
        continue;
      }

      await reader.extractTo(entry, target);
      written += 1;
    }

    return { written, skipped };
  }

  private async restoreCollections(
    reader: ZipReader,
    mode: RestoreMode,
  ): Promise<RestoreResult["collections"]> {
    const results: RestoreResult["collections"] = [];

    for (const { collection, entry } of this.databaseEntries(reader)) {
      const raw = (await reader.read(entry)).toString("utf8");

      let docs: Record<string, unknown>[];
      try {
        /*
         * Canonical Extended JSON, so `{"$date":…}` and `{"$oid":…}` come back
         * as a real `Date` and a real `ObjectId`. Plain `JSON.parse` would
         * restore both as strings, and every query that filters on a date or
         * joins on an id would then quietly match nothing.
         */
        docs = EJSON.parse(raw, { relaxed: false }) as Record<string, unknown>[];
      } catch {
        throw new UnprocessableEntityException(
          `The archive's copy of "${collection}" is corrupt and could not be read`,
        );
      }
      if (!Array.isArray(docs)) {
        throw new UnprocessableEntityException(
          `The archive's copy of "${collection}" is not a list of documents`,
        );
      }

      const target = this.db.collection(collection);
      const resolved = docs.map((doc) => resolveMedia(doc, this.mediaBase));

      let removed = 0;
      let inserted = 0;
      let updated = 0;

      if (mode === "replace") {
        // Emptied even when the archive's copy is empty — that is what makes a
        // replace a rollback rather than an overlay.
        removed = (await target.deleteMany({})).deletedCount ?? 0;
        if (resolved.length > 0) {
          const { insertedCount } = await target.insertMany(resolved, { ordered: false });
          inserted = insertedCount;
        }
      } else if (resolved.length > 0) {
        const result = await target.bulkWrite(
          resolved.map((doc) => ({
            replaceOne: {
              filter: { _id: doc._id } as Record<string, unknown>,
              replacement: doc,
              upsert: true,
            },
          })),
          { ordered: false },
        );
        inserted = result.upsertedCount;
        updated = result.matchedCount;
      }

      results.push({ name: collection, inserted, updated, removed });
    }

    return results;
  }

  /**
   * Where multer writes an incoming archive.
   *
   * The same directory the built backups live in, so one sweep covers both and
   * one boot wipe clears both. A restore upload is potentially gigabytes; it
   * goes to disk rather than through multer's default memory storage, which
   * would hold the whole archive in the heap before anything had looked at it.
   */
  get uploadDestination(): string {
    return this.workDir;
  }
}
