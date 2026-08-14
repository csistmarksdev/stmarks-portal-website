/* eslint-disable no-console */
/**
 * Restores the baked-in snapshot into an empty database.
 *
 * Run by the entrypoint on every boot, before the API starts. Captured by
 * `scripts/capture-live-data.mjs`; see that file for what a snapshot contains
 * and why it is Extended JSON rather than plain JSON.
 *
 * Per-collection, not all-or-nothing
 * ----------------------------------
 * A collection is filled only when it is empty, and the decision is made for
 * each one independently. All-or-nothing on "is the database empty" sounds
 * tidier and is worse: a half-finished first boot — the container killed while
 * inserting `media` — leaves a database that is neither empty nor complete, and
 * an all-or-nothing check would then decline to touch it forever. Per
 * collection, the next boot fills in exactly what is missing.
 *
 * Restarting a container the church has been editing for a year therefore
 * changes nothing, which is the property that matters most here: the snapshot
 * is a starting point, never a reset.
 *
 * `_id` is preserved. Documents reference each other by id, and the snapshot is
 * a clone of a working installation rather than a demo set — letting Mongo
 * assign fresh ids would sever those references.
 */
import { EJSON } from "bson";
import { MongoClient } from "mongodb";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/*
 * This file is installed inside `backend/` rather than beside the entrypoint,
 * so that `mongodb` and `bson` resolve from the API's own `node_modules`. They
 * are already there — Mongoose depends on them — which is the difference
 * between reusing a driver that is present and shipping a second copy of it.
 */
const APP_ROOT = join(import.meta.dirname, "..");
const SNAPSHOT_DB = process.env.SNAPSHOT_DB_DIR ?? join(APP_ROOT, "snapshot", "db");
const SNAPSHOT_UPLOADS =
  process.env.SNAPSHOT_UPLOADS_DIR ?? join(APP_ROOT, "snapshot", "uploads");
/*
 * `resolve`, not `join`: an absolute `UPLOAD_DIR` must win outright.
 * `join("/app/backend", "/data/uploads")` quietly produces
 * `/app/backend/data/uploads`, so the bundled media would be written into the
 * container's ephemeral layer instead of the volume the deployment mounted —
 * accepted, ignored, and gone on the next redeploy. Every other consumer of
 * `uploadDir` (the API, the seed, the initializer) resolves it the same way;
 * this is what makes `UPLOAD_DIR=/data/uploads` single-disk hosting work.
 */
const UPLOAD_DIR = resolve(import.meta.dirname, process.env.UPLOAD_DIR ?? "uploads");

/**
 * Origin that `{{MEDIA}}` resolves to.
 *
 * Stored media URLs are absolute because the public Website reads this API
 * cross-origin and cannot resolve a relative path against its own domain. The
 * value written here is a starting point only — `MediaOriginInterceptor`
 * rewrites it to the request's own origin on the way out, so a wrong guess at
 * this moment is corrected on every response rather than baked in.
 */
function mediaBase() {
  const publicUrl = (process.env.PUBLIC_URL ?? "").replace(/\/$/, "");
  if (publicUrl) return `${publicUrl}/uploads`;
  return `http://localhost:${process.env.PORT ?? 8080}/uploads`;
}

/** `{{MEDIA}}` -> this installation's media origin, everywhere in a document. */
function resolveTokens(value, base) {
  if (typeof value === "string") {
    return value.includes("{{MEDIA}}") ? value.split("{{MEDIA}}").join(base) : value;
  }
  if (Array.isArray(value)) return value.map((v) => resolveTokens(v, base));
  // Only plain objects are rebuilt — a Date or an ObjectId revived by EJSON is
  // `typeof "object"` and would be destroyed by `Object.fromEntries`.
  if (value !== null && typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, resolveTokens(v, base)]),
      );
    }
  }
  return value;
}

/** Every file under `dir`, as forward-slash paths relative to it. */
function walk(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory()
      ? walk(full, base)
      : [relative(base, full).split("\\").join("/")];
  });
}

/**
 * Install the bundled media into the upload directory.
 *
 * Copied rather than served from the snapshot in place, because uploads are
 * writable: the church replaces a photo through the CMS and the new file has to
 * land somewhere that is not a read-only part of the image. Files already
 * present are never overwritten — an admin's replacement outranks the snapshot,
 * and re-copying on every boot would silently undo their edit.
 */
function restoreUploads() {
  const files = walk(SNAPSHOT_UPLOADS);
  if (files.length === 0) {
    console.log("· No bundled media in this image");
    return;
  }

  let copied = 0;
  for (const rel of files) {
    const target = join(UPLOAD_DIR, rel);
    if (existsSync(target)) continue;
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(SNAPSHOT_UPLOADS, rel), target);
    copied += 1;
  }

  console.log(
    `${copied > 0 ? "✓" : "·"} Media: ${copied} installed, ` +
      `${files.length - copied} already present`,
  );
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  restoreUploads();

  if (!existsSync(SNAPSHOT_DB)) {
    console.log("· No snapshot baked into this image — starting empty");
    return;
  }

  const files = readdirSync(SNAPSHOT_DB).filter(
    (f) => f.endsWith(".json") && !f.startsWith("_"),
  );
  if (files.length === 0) {
    console.log("· Snapshot contains no collections");
    return;
  }

  const manifestPath = join(SNAPSHOT_DB, "_manifest.json");
  if (existsSync(manifestPath)) {
    const { capturedAt } = JSON.parse(readFileSync(manifestPath, "utf8"));
    console.log(`· Snapshot captured ${capturedAt}`);
  }

  const base = mediaBase();
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 30_000 });
  await client.connect();

  try {
    const db = client.db();
    let restored = 0;
    let skipped = 0;

    for (const file of files) {
      const name = file.replace(/\.json$/, "");
      const existing = await db.collection(name).countDocuments();

      if (existing > 0) {
        skipped += 1;
        continue;
      }

      const docs = EJSON.parse(readFileSync(join(SNAPSHOT_DB, file), "utf8"), {
        relaxed: false,
      });
      if (!Array.isArray(docs) || docs.length === 0) continue;

      const resolved = docs.map((d) => resolveTokens(d, base));
      await db.collection(name).insertMany(resolved, { ordered: false });
      console.log(`✓ ${name}: restored ${resolved.length} document(s)`);
      restored += 1;
    }

    console.log(
      restored === 0
        ? `· Database already populated (${skipped} collection(s) left untouched)`
        : `✓ Restored ${restored} collection(s); ${skipped} already had data`,
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Snapshot restore failed:", error.message);
  process.exit(1);
});
