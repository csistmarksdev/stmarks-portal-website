/**
 * Zip mechanics for backup and restore — everything that is about the archive
 * format rather than about this application's data.
 *
 * Kept apart from `backup.service.ts` so that file reads as "what a backup
 * contains" and this one as "how it is written and read". The service never
 * touches `archiver` or `yauzl` directly.
 */
import archiver from "archiver";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";

/* -------------------------------------------------------------------------- */
/* Entry names                                                                */
/* -------------------------------------------------------------------------- */

/**
 * A zip entry name is attacker-controlled input. An archive can name an entry
 * `../../etc/passwd` or `C:\Windows\System32\x.dll`, and a naive extractor
 * writes exactly there — "zip slip", and the reason a restore is not simply a
 * loop over `createWriteStream(join(root, entry.fileName))`.
 *
 * Returns a clean forward-slash relative path, or `null` when the name is a
 * directory marker or cannot be trusted. Callers must treat `null` as "skip",
 * never as "use the original".
 */
export function safeEntryName(raw: string): string | null {
  // Some Windows zip tools write `\` as the separator even though the spec
  // says `/`. Normalising is kinder than rejecting, and loses nothing: `\` is
  // not a legal character in a filename on either platform we run on.
  const name = raw.replace(/\\/g, "/").replace(/^\.\//, "");

  if (name === "" || name.endsWith("/")) return null; // directory entry
  if (name.startsWith("/")) return null; // absolute
  if (/^[A-Za-z]:/.test(name)) return null; // drive-qualified
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(name)) return null; // control characters
  if (name.split("/").some((part) => part === "." || part === "..")) return null;

  return name;
}

/**
 * Absolute path for `relative` inside `root`, or `null` if it would escape.
 *
 * `safeEntryName` already rejects the obvious escapes; this is the check that
 * does not depend on having reasoned about every one of them correctly. A
 * symlinked `root` resolves before the comparison, so the prefix test is made
 * against the real directory.
 */
export function resolveWithin(root: string, relative: string): string | null {
  const base = resolve(root);
  const target = resolve(base, relative);
  return target === base || target.startsWith(base + sep) ? target : null;
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Builds a zip on disk, one entry at a time.
 *
 * Written to a file rather than straight to the HTTP response because the
 * caller needs the finished size before it answers — the CMS shows it, and a
 * download with a `Content-Length` is a progress bar instead of a spinner.
 */
export class ZipWriter {
  private readonly archive: archiver.Archiver;
  private readonly closed: Promise<number>;

  constructor(targetPath: string) {
    /*
     * Level 6, not 9. The bulk of a backup is JPEG, MP4 and PDF — already
     * compressed, and squeezed no further by trying harder. Level 9 costs
     * minutes of CPU on a large media library to save a fraction of a percent,
     * on a machine the church is also using to serve the site.
     */
    this.archive = archiver("zip", { zlib: { level: 6 } });

    const out = createWriteStream(targetPath);
    this.closed = new Promise<number>((resolveClose, rejectClose) => {
      out.on("close", () => resolveClose(this.archive.pointer()));
      out.on("error", rejectClose);
      this.archive.on("error", rejectClose);
      // `warning` covers recoverable trouble — a file that vanished between
      // being listed and being read. Loud failure beats a silently short
      // backup, so even ENOENT is promoted to an error here.
      this.archive.on("warning", rejectClose);
    });
    this.archive.pipe(out);
  }

  /** A text entry — manifest and collection dumps. These compress well. */
  text(name: string, contents: string): void {
    this.archive.append(contents, { name });
  }

  /**
   * A file copied in from disk, streamed rather than read into memory.
   *
   * `store` skips deflate entirely. Uploads are images and video; asking zlib
   * to compress a 200 MB MP4 burns CPU to produce a slightly larger entry.
   */
  file(diskPath: string, name: string, options: { store?: boolean } = {}): void {
    // `store` is a zip-specific entry option; `Archiver.file` is typed against
    // the format-agnostic `EntryData`, which does not carry it.
    const entry: archiver.ZipEntryData = { name, store: options.store ?? false };
    this.archive.file(diskPath, entry);
  }

  /** Closes the archive and resolves with its size in bytes. */
  finish(): Promise<number> {
    void this.archive.finalize();
    return this.closed;
  }
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                    */
/* -------------------------------------------------------------------------- */

export interface ArchiveEntry {
  /** Sanitised, forward-slash relative path. */
  name: string;
  /** Declared uncompressed size — read before extracting, to bound the cost. */
  uncompressedSize: number;
  readonly handle: yauzl.Entry;
}

/**
 * A zip opened for random access.
 *
 * Every entry is listed up front so the caller can validate the whole archive
 * before writing a single byte of it. That ordering is the point: a restore
 * that discovers a bad entry halfway through has already replaced half the
 * database.
 */
export class ZipReader {
  private constructor(
    private readonly zip: yauzl.ZipFile,
    readonly entries: ArchiveEntry[],
    /** Entries whose names were rejected, kept so the caller can report them. */
    readonly rejected: string[],
  ) {}

  static open(path: string): Promise<ZipReader> {
    return new Promise((resolveOpen, reject) => {
      // `lazyEntries` puts us in control of the walk; `autoClose: false` keeps
      // the handle open for the random-access reads that follow the listing.
      yauzl.open(path, { lazyEntries: true, autoClose: false }, (error, zip) => {
        if (error || !zip) {
          reject(error ?? new Error("Could not open archive"));
          return;
        }

        const entries: ArchiveEntry[] = [];
        const rejected: string[] = [];

        zip.on("entry", (entry: yauzl.Entry) => {
          const name = safeEntryName(entry.fileName);
          if (name === null) {
            // Directory markers are normal and uninteresting; a name that was
            // rejected for any other reason is worth surfacing.
            if (!entry.fileName.endsWith("/")) rejected.push(entry.fileName);
          } else {
            entries.push({ name, uncompressedSize: entry.uncompressedSize, handle: entry });
          }
          zip.readEntry();
        });
        zip.on("end", () => resolveOpen(new ZipReader(zip, entries, rejected)));
        zip.on("error", reject);
        zip.readEntry();
      });
    });
  }

  find(name: string): ArchiveEntry | undefined {
    return this.entries.find((entry) => entry.name === name);
  }

  private stream(entry: ArchiveEntry): Promise<Readable> {
    return new Promise((resolveStream, reject) => {
      this.zip.openReadStream(entry.handle, (error, stream) => {
        if (error || !stream) {
          reject(error ?? new Error(`Could not read ${entry.name}`));
          return;
        }
        resolveStream(stream);
      });
    });
  }

  /** Whole entry as a buffer. For the manifest and collection dumps only. */
  async read(entry: ArchiveEntry): Promise<Buffer> {
    const stream = await this.stream(entry);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  }

  /** Streams an entry to disk, creating parent directories as needed. */
  async extractTo(entry: ArchiveEntry, targetPath: string): Promise<void> {
    await mkdir(dirname(targetPath), { recursive: true });
    await pipeline(await this.stream(entry), createWriteStream(targetPath));
  }

  close(): void {
    this.zip.close();
  }
}
