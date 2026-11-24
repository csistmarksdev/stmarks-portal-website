#!/usr/bin/env node
/**
 * Gives id-named media in a JSON data set (the bundled snapshot, or the seed
 * data) readable, search-friendly names - the offline twin of the Media
 * library's "Readable file names" action, using the very same rules (it loads
 * them from the compiled backend, so run `npm run build -w backend` first).
 *
 *   node scripts/rename-media-files.mjs --db snapshot/db --uploads snapshot/uploads [--dry-run]
 *
 * It renames the files and thumbnails under --uploads, points every
 * `{{MEDIA}}/…` / `…/uploads/…` reference in the collection files at the new
 * names, and records each old path in the media record's `previousPaths`, so
 * an installation restored from this data redirects old links to new ones.
 *
 * Two data sets that must agree (the snapshot and the seed data hold the same
 * media) can share one plan:
 *
 *   --save-moves moves.json   write old→new paths after planning
 *   --moves moves.json        apply exactly these instead of planning
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const ROOT = resolve(import.meta.dirname, "..");
const rules = require(join(ROOT, "backend/dist/modules/media/media-rename.service.js"));

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dbDir = resolve(arg("--db") ?? "");
const uploadsDir = resolve(arg("--uploads") ?? "");
const dryRun = args.includes("--dry-run");
if (!arg("--db") || !arg("--uploads")) {
  console.error("usage: rename-media-files.mjs --db <dir> --uploads <dir> [--dry-run] [--moves f] [--save-moves f]");
  process.exit(2);
}

/** Reads JSON, remembering its line endings so it is written back identically. */
async function readJson(file) {
  const text = await readFile(file, "utf8");
  return { data: JSON.parse(text), crlf: text.includes("\r\n"), trailing: /\n$/.test(text) };
}
async function writeJson(file, { data, crlf, trailing }) {
  let text = JSON.stringify(data, null, 2) + (trailing ? "\n" : "");
  if (crlf) text = text.replace(/\n/g, "\r\n");
  await writeFile(file, text);
}

const files = (await readdir(dbDir)).filter(
  (name) => name.endsWith(".json") && !/^_?manifest\.json$/.test(name),
);
if (!files.includes("media.json")) throw new Error(`${dbDir} has no media.json`);

const media = await readJson(join(dbDir, "media.json"));
const collections = new Map();
for (const name of files.filter((n) => n !== "media.json")) {
  collections.set(name, await readJson(join(dbDir, name)));
}

const idOf = (doc, index) => doc._id?.$oid ?? String(doc._id ?? index);

/** Every stored file as `images/x.jpg` - names a rename must not take. */
async function filesOnDisk() {
  const paths = [];
  for (const dir of ["images", "videos", "files", "thumbs"]) {
    const names = await readdir(join(uploadsDir, dir)).catch(() => []);
    for (const name of names) paths.push(`${dir}/${name}`);
  }
  return paths;
}

let moves;
let plan = [];
if (arg("--moves")) {
  moves = new Map(Object.entries(JSON.parse(await readFile(arg("--moves"), "utf8"))));
} else {
  const records = [...collections.values()].flatMap(({ data }) => data);
  plan = rules.planRenames(
    media.data.map((doc, index) => ({
      id: idOf(doc, index),
      filename: doc.filename ?? "",
      path: doc.path,
      thumbnailPath: doc.thumbnailPath,
      alt: doc.alt,
      previousPaths: doc.previousPaths,
    })),
    rules.buildUsage(records),
    await filesOnDisk(),
  );
  moves = rules.movesOf(plan);
  for (const item of plan) {
    console.log(
      item.to
        ? `  ${item.from}  →  ${item.to}   (${item.source})`
        : `  ${item.from} - left as is: ${item.source}`,
    );
  }
}
if (arg("--save-moves")) {
  await writeFile(arg("--save-moves"), JSON.stringify(Object.fromEntries(moves), null, 2) + "\n");
}

const fileMoves = [...moves].filter(([from]) => !from.startsWith("thumbs/"));
console.log(`\n${fileMoves.length} file(s) to rename in ${dbDir}${dryRun ? " (dry run)" : ""}`);
if (dryRun || moves.size === 0) process.exit(0);

// 1. Files on disk.
let missing = 0;
for (const [from, to] of moves) {
  const source = join(uploadsDir, from);
  if (!existsSync(source)) {
    missing += 1;
    continue;
  }
  await mkdir(dirname(join(uploadsDir, to)), { recursive: true });
  await rename(source, join(uploadsDir, to));
}

// 2. The media records: new path, and the old one kept for redirects.
for (const doc of media.data) {
  const to = moves.get(doc.path);
  if (!to) continue;
  const previous = [doc.path];
  if (doc.thumbnailPath && moves.has(doc.thumbnailPath)) {
    previous.push(doc.thumbnailPath);
    doc.thumbnailPath = moves.get(doc.thumbnailPath);
  }
  doc.path = to;
  doc.previousPaths = [...(doc.previousPaths ?? []), ...previous];
}
await writeJson(join(dbDir, "media.json"), media);

// 3. Every reference in every other collection.
let records = 0;
for (const [name, file] of collections) {
  let changed = false;
  file.data = file.data.map((doc) => {
    const result = rules.rewriteUploadRefs(doc, moves);
    if (result.changed) {
      changed = true;
      records += 1;
    }
    return result.value;
  });
  if (changed) await writeJson(join(dbDir, name), file);
}

console.log(
  `Renamed ${fileMoves.length} file(s)${missing ? ` (${missing} path(s) were not on disk)` : ""}; ` +
    `updated ${records} record(s).`,
);
