/* eslint-disable no-console */
/**
 * Captures the *entire* live installation as a snapshot baked into the image.
 *
 *   node scripts/capture-live-data.mjs        (reads backend/.env for MONGODB_URI)
 *
 * Writes:
 *   snapshot/db/<collection>.json   every collection, canonical Extended JSON
 *   snapshot/db/_manifest.json      what was captured, and when
 *   snapshot/uploads/<path>         every file under backend/uploads
 *
 * How this differs from `backend/scripts/export-demo-data.mjs`
 * -----------------------------------------------------------
 * That script builds a *demo* set: content collections only, `_id`s dropped,
 * users and operational records deliberately excluded. It exists to hand a
 * stranger something presentable.
 *
 * This one is a *clone*. The container is meant to come up as the installation
 * it was taken from — same accounts, same audit trail, same media library, same
 * gallery videos — so nothing is filtered and `_id` is preserved. Documents
 * reference each other by id (a gallery album's cover is a `media` record's
 * file, a `contact_message` belongs to a user); dropping ids the way a demo
 * export does would quietly sever those.
 *
 * Extended JSON, not JSON
 * -----------------------
 * `JSON.stringify` flattens a `Date` to a string and an `ObjectId` to a hex
 * string, and nothing on the far side can tell those from ordinary text. The
 * demo importer guesses with a regex over every string, which works only
 * because it knows the shape of the data it wrote. Canonical Extended JSON
 * (`{"$date":…}`, `{"$oid":…}`) round-trips types exactly, so a snapshot of a
 * database nobody has read the schema of still restores correctly.
 *
 * Media URLs are rewritten to the token `{{MEDIA}}/…` so the snapshot is not
 * pinned to the host it was taken from; `restore-snapshot.mjs` resolves it.
 */
import { EJSON } from "bson";
import { MongoClient } from "mongodb";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

/*
 * Normally the repository this script sits in. `PORTAL_ROOT` overrides it so
 * the capture can be driven from a checkout that has the MongoDB driver
 * installed while writing into one that does not — which is the ordinary case
 * here, because this tree is built in Docker and never has `node_modules`.
 */
const ROOT = process.env.PORTAL_ROOT
  ? process.env.PORTAL_ROOT
  : join(import.meta.dirname, "..");
const UPLOADS = join(ROOT, "backend", "uploads");
const OUT = join(ROOT, "snapshot");
const OUT_DB = join(OUT, "db");
const OUT_UPLOADS = join(OUT, "uploads");

/**
 * Collections that are rebuilt from the data rather than carried.
 *
 * Mongo recreates `system.*` itself and refuses writes to them; including them
 * turns a restore into a pile of errors that hide the real ones.
 */
const SKIP = /^system\./;

function loadEnv() {
  for (const file of [join(ROOT, "backend", ".env"), join(ROOT, ".env")]) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      if (key in process.env) continue;
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
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
 * Absolute media URLs -> a portable token.
 *
 * Only plain objects and arrays are walked. A `Date` is `typeof "object"`, and
 * an `ObjectId` and a `Binary` are too — recursing into them and rebuilding
 * with `Object.fromEntries` would replace each with a meaningless plain object
 * and destroy every timestamp and id in the snapshot.
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
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Put it in backend/.env, or pass it in the environment.",
    );
  }

  console.log(`Capturing from ${uri.replace(/\/\/[^@]*@/, "//***@")}\n`);

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15_000 });
  await client.connect();
  const db = client.db();

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT_DB, { recursive: true });

  const collections = (await db.listCollections().toArray())
    .map((c) => c.name)
    .filter((name) => !SKIP.test(name))
    .sort();

  const counts = {};
  let totalDocs = 0;

  for (const name of collections) {
    const docs = await db.collection(name).find({}).toArray();

    /*
     * Empty collections are still written out. An empty `downloads` is a fact
     * about the installation — the restore then knows the collection was seen
     * and considered, rather than leaving a later reader wondering whether it
     * was missed.
     */
    const clean = docs.map(tokenise);
    writeFileSync(
      join(OUT_DB, `${name}.json`),
      EJSON.stringify(clean, undefined, 2, { relaxed: false }) + "\n",
      "utf8",
    );
    counts[name] = clean.length;
    totalDocs += clean.length;
    console.log(`  ${name.padEnd(24)} ${String(clean.length).padStart(5)} document(s)`);
  }

  /*
   * Every upload is copied, not only the files some record links to.
   *
   * The demo export copies just the referenced ones, which is right for a demo
   * and wrong here: an admin who deletes a gallery album leaves its images in
   * the library, and a reference-only capture would silently drop them — the
   * media page would come up in the container with holes in it.
   */
  const files = walk(UPLOADS);
  let bytes = 0;
  for (const rel of files) {
    const from = join(UPLOADS, rel);
    const to = join(OUT_UPLOADS, rel);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    bytes += statSync(from).size;
  }

  const manifest = {
    capturedAt: new Date().toISOString(),
    source: uri.replace(/\/\/[^@]*@/, "//***@"),
    collections: counts,
    documents: totalDocs,
    uploads: { files: files.length, bytes },
  };
  writeFileSync(
    join(OUT_DB, "_manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );

  console.log(
    `\n  ${totalDocs} documents across ${collections.length} collections` +
      `\n  ${files.length} upload(s), ${(bytes / 1024 / 1024).toFixed(1)} MB` +
      `\n\nSnapshot written to snapshot/`,
  );

  await client.close();
}

main().catch((error) => {
  console.error("Capture failed:", error.message);
  process.exit(1);
});
