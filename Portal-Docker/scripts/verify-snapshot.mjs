/* eslint-disable no-console */
/**
 * Checks that a captured snapshot is complete and portable, before it is baked
 * into an image.
 *
 *   node scripts/verify-snapshot.mjs            (checks ./snapshot)
 *   node scripts/verify-snapshot.mjs dist-portal/snapshot
 *
 * `capture-live-data.mjs` reads documents from the database and media files
 * from `backend/uploads`, which are two different places that are only assumed
 * to agree. When they do not — a file deleted from disk but still referenced by
 * a `media` record, a capture run against a database from a *different*
 * installation than the uploads folder — the failure does not appear at capture
 * time, or at build time, or at boot. It appears as a broken image in the CMS
 * weeks later, and by then the original is gone.
 *
 * So the two halves are cross-checked here, while the live installation is
 * still there to re-capture from.
 *
 * What is checked
 * ---------------
 *   1. every `media` document's `path` and `thumbnailPath` exists as a file
 *   2. every `{{MEDIA}}/…` reference anywhere in any collection exists
 *   3. no capture-host origin survived the rewrite to `{{MEDIA}}`, which would
 *      pin the image to a machine nobody deploying it can reach
 *   4. the manifest's document counts match the collection files beside it
 *
 * Unreferenced files are reported and are not an error: an upload that no
 * document points at yet is ordinary, and deleting it here would be the very
 * data loss this script exists to catch.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const SNAPSHOT = resolve(process.argv[2] ?? join(import.meta.dirname, "..", "snapshot"));
const DB_DIR = join(SNAPSHOT, "db");
const UPLOADS_DIR = join(SNAPSHOT, "uploads");

const problems = [];
const fail = (msg) => problems.push(msg);

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

if (!existsSync(DB_DIR)) {
  console.error(`No snapshot at ${SNAPSHOT} — nothing to verify.`);
  process.exit(1);
}

const files = new Set(walk(UPLOADS_DIR));
const collections = readdirSync(DB_DIR).filter(
  (f) => f.endsWith(".json") && !f.startsWith("_"),
);

console.log(`Snapshot: ${SNAPSHOT}`);
console.log(`  ${collections.length} collection(s), ${files.size} media file(s)\n`);

/* ------------------------------------------------------- references -------- */

/**
 * Where each referenced path came from, so a missing file names the document
 * that wants it rather than only the file that is gone.
 */
const referenced = new Map();
const refer = (path, where) => {
  if (!path) return;
  // Stored URLs are encoded; the filesystem is not.
  let clean = path.split("?")[0].split("#")[0];
  try {
    clean = decodeURIComponent(clean);
  } catch {
    /* not encoded */
  }
  if (!referenced.has(clean)) referenced.set(clean, where);
};

/*
 * Absolute origins that should have become `{{MEDIA}}` at capture time. A
 * survivor means the rewrite missed a field, and every deployment of the image
 * would then ask the capture host — usually a private address — for that file.
 */
const ORIGIN = /https?:\/\/[^"'\s]*?\/uploads\/([A-Za-z0-9._\-/%]+)/g;
const TOKEN = /\{\{MEDIA\}\}\/([A-Za-z0-9._\-/%]+)/g;

for (const file of collections) {
  const name = file.replace(/\.json$/, "");
  const text = readFileSync(join(DB_DIR, file), "utf8");

  for (const [, path] of text.matchAll(TOKEN)) refer(path, name);

  for (const [full, path] of text.matchAll(ORIGIN)) {
    fail(
      `${name}: a literal media URL survived the {{MEDIA}} rewrite — ` +
        `${full.slice(0, 90)}${full.length > 90 ? "…" : ""}`,
    );
    refer(path, name);
  }

  if (name !== "media") continue;

  // `media` records point at their file through fields rather than a URL, so
  // the token scan above never sees them.
  for (const doc of JSON.parse(text)) {
    refer(doc.path, `media/${doc.filename ?? doc._id?.$oid ?? "?"}`);
    refer(doc.thumbnailPath, `media/${doc.filename ?? doc._id?.$oid ?? "?"} (thumbnail)`);
  }
}

const missing = [...referenced].filter(([path]) => !files.has(path));
for (const [path, where] of missing) {
  fail(`${where}: references ${path}, which is not in the snapshot`);
}

console.log(`Media references: ${referenced.size} referenced, ${missing.length} missing`);

const orphans = [...files].filter((f) => !referenced.has(f));
if (orphans.length > 0) {
  console.log(
    `  ${orphans.length} file(s) present but unreferenced — carried anyway ` +
      `(e.g. ${orphans.slice(0, 3).join(", ")})`,
  );
}

/* --------------------------------------------------------- manifest -------- */

const manifestPath = join(DB_DIR, "_manifest.json");
if (!existsSync(manifestPath)) {
  fail("_manifest.json is missing — the image cannot report what it carries");
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  console.log(`\nManifest: captured ${manifest.capturedAt}`);

  let total = 0;
  for (const [name, count] of Object.entries(manifest.collections ?? {})) {
    const file = join(DB_DIR, `${name}.json`);
    if (!existsSync(file)) {
      fail(`manifest lists ${name} but ${name}.json is not there`);
      continue;
    }
    const actual = JSON.parse(readFileSync(file, "utf8")).length;
    total += actual;
    if (actual !== count) {
      fail(`${name}: manifest says ${count} document(s), file holds ${actual}`);
    }
  }

  if (manifest.documents !== total) {
    fail(`manifest totals ${manifest.documents} document(s); the files hold ${total}`);
  }
  if (manifest.uploads?.files !== files.size) {
    fail(
      `manifest counts ${manifest.uploads?.files} upload(s); ` +
        `${files.size} are on disk`,
    );
  }
  console.log(`  ${total} document(s) across ${collections.length} collection(s)`);

  /*
   * A snapshot with no users restores into a portal nobody can sign in to
   * except through the generated emergency admin — which is a working portal,
   * but not the installation it was supposed to be a clone of.
   */
  if (!manifest.collections?.users) {
    fail("no user accounts in the snapshot — the portal would restore with no way in");
  }
}

/* ------------------------------------------------------------ verdict ------ */

if (problems.length === 0) {
  console.log("\n✓ Snapshot is complete and portable.");
  process.exit(0);
}

console.error(`\n✗ ${problems.length} problem(s):\n`);
for (const problem of problems) console.error(`  - ${problem}`);
console.error(
  "\nRe-capture from a machine where the database and backend/uploads belong " +
    "to the same installation:\n    node scripts/capture-live-data.mjs\n",
);
process.exit(1);
