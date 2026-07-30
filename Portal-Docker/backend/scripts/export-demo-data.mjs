/* eslint-disable no-console */
/**
 * Captures the current database and its uploaded media as a portable demo set.
 *
 *   node scripts/export-demo-data.mjs        (from backend/, with .env present)
 *
 * Writes:
 *   seed-data/<collection>.json   content, with absolute media URLs made relative
 *   seed-assets/<path>            every upload those records actually reference
 *
 * Why capture rather than invent
 * ------------------------------
 * A handover build has to *look* like the finished site on first boot, and
 * plausible-looking invented content is exactly what put "sample-harvest-festival"
 * on a real parish's home page. This exports what the church has already put in
 * through the CMS, so the demo is its own material and every image is one that
 * genuinely exists.
 *
 * URLs are stored absolute (`http://host:4000/uploads/…`), which would pin the
 * export to the machine that made it. They are rewritten to `{{MEDIA}}/…` here
 * and resolved against the target's own `PUBLIC_URL` on import, so one export
 * restores correctly on any host.
 */
import { MongoClient } from "mongodb";
import { existsSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";

const ROOT = join(import.meta.dirname, "..");
const OUT_DATA = join(ROOT, "seed-data");
const OUT_ASSETS = join(ROOT, "seed-assets");
const UPLOADS = join(ROOT, "uploads");

/*
 * Content collections only.
 *
 * `users` is excluded so an export never carries a password hash, and the
 * receiving installation creates its own admin from SEED_ADMIN_*. `audit_logs`
 * and `contact_messages` are excluded because they are the church's own
 * records — an operational history and messages from real people — and have no
 * place in a demo dataset. `leaders` is excluded because the website renders
 * leadership from its own source and the Portal does not serve it.
 */
const COLLECTIONS = [
  "fellowships",
  "events",
  "blog_posts",
  "gallery_albums",
  "announcements",
  "downloads",
  "church_singletons",
  "media",
];

function loadEnv() {
  const file = join(ROOT, ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

/** Every `/uploads/...` path mentioned anywhere in a document tree. */
function collectUploadPaths(value, found = new Set()) {
  if (typeof value === "string") {
    const m = value.match(/\/uploads\/(.+?)(?:[?#]|$)/);
    if (m) found.add(m[1]);
  } else if (Array.isArray(value)) {
    for (const v of value) collectUploadPaths(v, found);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectUploadPaths(v, found);
  }
  return found;
}

/**
 * Absolute media URLs -> a portable token the importer resolves.
 *
 * Only plain objects and arrays are walked. Anything else is returned as-is,
 * which matters far more than it looks: a `Date` is `typeof "object"` with no
 * enumerable keys, so recursing into it produced `Object.fromEntries([])` —
 * `{}`. Every timestamp in the export was silently replaced by an empty object,
 * and `startDate` came back undefined on import, which would have left the
 * events page blank with nothing anywhere to explain why.
 */
function tokenise(value) {
  if (typeof value === "string") {
    return value.replace(/https?:\/\/[^/"\s]+\/uploads\//g, "{{MEDIA}}/");
  }
  if (Array.isArray(value)) return value.map(tokenise);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, tokenise(v)]),
    );
  }
  return value;
}

/** True only for `{}`-shaped objects — not Dates, ObjectIds, Buffers, RegExps. */
function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

async function main() {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (expected in backend/.env)");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  const present = new Set((await db.listCollections().toArray()).map((c) => c.name));

  rmSync(OUT_DATA, { recursive: true, force: true });
  rmSync(OUT_ASSETS, { recursive: true, force: true });
  mkdirSync(OUT_DATA, { recursive: true });

  const assets = new Set();
  const manifest = {};
  let totalDocs = 0;

  for (const name of COLLECTIONS) {
    if (!present.has(name)) continue;
    const docs = await db.collection(name).find({}).toArray();
    if (docs.length === 0) continue;

    for (const doc of docs) {
      collectUploadPaths(doc, assets);

      /*
       * Media records store `path`/`thumbnailPath` relative to the upload root
       * ("images/x.png", "thumbs/x.webp") rather than as `/uploads/` URLs, so
       * the URL scan above never sees them. Missing these exported a media
       * library whose every entry pointed at a file that was not shipped —
       * and no thumbnails at all.
       */
      if (name === "media") {
        for (const key of ["path", "thumbnailPath"]) {
          if (typeof doc[key] === "string" && doc[key]) assets.add(doc[key]);
        }
      }
    }

    // `_id` is dropped: the importer lets Mongo assign fresh ids, so an export
    // can be restored into a database that already has unrelated records.
    const clean = docs.map(({ _id, __v, ...rest }) => tokenise(rest));
    writeFileSync(
      join(OUT_DATA, `${name}.json`),
      JSON.stringify(clean, null, 2) + "\n",
      "utf8",
    );
    manifest[name] = clean.length;
    totalDocs += clean.length;
    console.log(`  ${name.padEnd(26)} ${clean.length} document(s)`);
  }

  let copied = 0;
  let missing = 0;
  for (const rel of assets) {
    const from = join(UPLOADS, rel);
    if (!existsSync(from)) {
      console.warn(`  ! referenced but not on disk: uploads/${rel}`);
      missing += 1;
      continue;
    }
    const to = join(OUT_ASSETS, rel);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    copied += 1;
  }

  writeFileSync(
    join(OUT_DATA, "manifest.json"),
    JSON.stringify({ exportedAt: new Date().toISOString(), collections: manifest, assets: copied }, null, 2) + "\n",
    "utf8",
  );

  console.log(`\n  ${totalDocs} documents, ${copied} media file(s) copied` +
    (missing ? `, ${missing} referenced file(s) missing` : ""));

  await client.close();
}

main().catch((error) => {
  console.error("Export failed:", error.message);
  process.exit(1);
});
