/* eslint-disable no-console */
/**
 * Checks that `docker build` will produce a working image, before running it.
 *
 *   node scripts/preflight-image.mjs                 (expects a linux/x64 bundle)
 *   node scripts/preflight-image.mjs --arch arm64
 *
 * `Dockerfile` verifies most of this itself, in a layer near the end. That is
 * the right place for it and it is late: the context upload and every apt and
 * Node install happen first, so a bundle assembled for the wrong architecture —
 * or one missing `frontend/.next/static` — is found after a couple of minutes
 * of work rather than immediately. This runs the same assertions in about a
 * second, on the machine that just built the bundle.
 *
 * It also checks three things the Dockerfile cannot:
 *
 *   - CRLF in `docker/launch.sh`. A Windows checkout turns the shebang into
 *     `/bin/sh\r`, and the container dies with `no such file or directory`
 *     naming a file that is plainly there. `.gitattributes` prevents this;
 *     a zip transferred by hand still reintroduces it.
 *   - Native binaries for the *build* machine's platform inside the bundle.
 *     Those build and start perfectly and then fail on the first uploaded
 *     image, far from the cause.
 *   - A `.env` left in `dist-portal/` while testing the bundle by hand, which
 *     would be baked into a layer and pushed to whatever registry receives it.
 *
 * Exits non-zero with the fix for each problem it finds.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const BUNDLE = join(ROOT, "dist-portal");

const archFlag = process.argv.indexOf("--arch");
const WANT_CPU = archFlag !== -1 ? process.argv[archFlag + 1] : "x64";

const problems = [];
const notes = [];
const fail = (what, fix) => problems.push({ what, fix });

const ok = (msg) => console.log(`  ✓ ${msg}`);

console.log(`Preflight: ${BUNDLE}\n`);

/* ------------------------------------------------------------- the bundle -- */

if (!existsSync(BUNDLE)) {
  console.error("dist-portal/ does not exist.\n");
  console.error("  The image copies this folder in and compiles nothing. Build it:");
  console.error("      node scripts/build-production-bundle.mjs\n");
  process.exit(1);
}

/*
 * Everything the entrypoint reaches for on boot. Each has a plausible way of
 * going missing — a stale bundle from before a rename, a capture step skipped,
 * a Next build that did not emit standalone output — and each would otherwise
 * surface as a container that starts and then dies.
 */
const REQUIRED = [
  ["start.mjs", "the entrypoint"],
  ["backend/dist/main.js", "the compiled API"],
  ["backend/dist/seed/initialize.js", "the first-run initializer"],
  ["backend/restore-snapshot.mjs", "the snapshot restorer"],
  ["backend/node_modules/mongodb", "the MongoDB driver the restore uses"],
  ["backend/node_modules/bson", "Extended JSON support for the snapshot"],
  ["frontend/server.js", "the Next standalone CMS server"],
  ["frontend/.next/static", "the CMS's CSS and JavaScript"],
  ["snapshot/db", "the church's content"],
  ["snapshot/uploads", "the church's media"],
  ["bundle-info.json", "the bundle's own metadata"],
];

for (const [rel, what] of REQUIRED) {
  if (existsSync(join(BUNDLE, rel))) continue;
  fail(
    `dist-portal/${rel} is missing — ${what}`,
    "node scripts/build-production-bundle.mjs",
  );
}

if (problems.length === 0) ok(`all ${REQUIRED.length} required paths present`);

/* ------------------------------------------------------------ architecture - */

const infoPath = join(BUNDLE, "bundle-info.json");
if (existsSync(infoPath)) {
  const info = JSON.parse(readFileSync(infoPath, "utf8"));

  if (info.target.os !== "linux") {
    fail(
      `the bundle targets ${info.target.os}, but the image is Linux`,
      "node scripts/build-production-bundle.mjs   (TARGET_OS defaults to linux)",
    );
  } else if (info.target.cpu !== WANT_CPU) {
    fail(
      `the bundle targets linux/${info.target.cpu}, and the image being built is ${WANT_CPU}`,
      `TARGET_CPU=${WANT_CPU} node scripts/build-production-bundle.mjs`,
    );
  } else {
    ok(`bundle targets linux/${info.target.cpu}, built with node ${info.node}`);
  }

  if (!info.snapshot) {
    fail(
      "the bundle carries no snapshot — this image would start an EMPTY portal",
      "node scripts/capture-live-data.mjs && node scripts/build-production-bundle.mjs",
    );
  } else {
    ok(
      `snapshot: ${info.snapshot.documents} documents, ` +
        `${info.snapshot.uploads.files} uploads, captured ${info.snapshot.capturedAt}`,
    );

    /*
     * A snapshot much older than the bundle usually means a rebuild happened
     * without a re-capture — the image then ships the code the parish asked for
     * and the data from whenever anyone last remembered this step.
     */
    const ageDays =
      (Date.parse(info.builtAt) - Date.parse(info.snapshot.capturedAt)) / 86_400_000;
    if (ageDays > 14) {
      notes.push(
        `the snapshot is ${Math.round(ageDays)} days older than the bundle. ` +
          "Re-capture if this image is meant to carry current content: " +
          "node scripts/capture-live-data.mjs",
      );
    }
  }
}

/* ------------------------------------------------- foreign native binaries - */

/**
 * Native modules built for something other than the target.
 *
 * `sharp` is the one that bites: its binaries are per-platform, and a bundle
 * carrying the build machine's copy installs, builds and starts — then throws
 * on the first image upload, in a message that names a runtime rather than a
 * build step.
 */
const FOREIGN = /(win32|darwin|linuxmusl|android)/;
const foreign = [];

for (const tree of [
  join(BUNDLE, "node_modules", "@img"),
  join(BUNDLE, "backend", "node_modules", "@img"),
]) {
  if (!existsSync(tree)) continue;
  for (const name of readdirSync(tree)) {
    if (FOREIGN.test(name)) foreign.push(`@img/${name}`);
    // `sharp-linux-arm64` in an x64 image is just as broken as win32.
    else if (/^sharp-linux/.test(name) && !name.endsWith(WANT_CPU)) {
      foreign.push(`@img/${name}`);
    }
  }
}

if (foreign.length > 0) {
  fail(
    `native binaries for another platform are in the bundle: ${foreign.join(", ")}`,
    `TARGET_OS=linux TARGET_CPU=${WANT_CPU} node scripts/build-production-bundle.mjs`,
  );
} else {
  ok(`no foreign native binaries (sharp resolved for linux/${WANT_CPU})`);
}

/* ------------------------------------------------------------- launch.sh --- */

const launch = join(ROOT, "docker", "launch.sh");
if (!existsSync(launch)) {
  fail("docker/launch.sh is missing — the image has no entrypoint", "restore it from git");
} else {
  const text = readFileSync(launch, "latin1");
  if (text.includes("\r\n")) {
    fail(
      "docker/launch.sh has CRLF line endings; the container would fail with " +
        "`exec /usr/local/bin/launch.sh: no such file or directory`",
      "dos2unix docker/launch.sh    (and commit .gitattributes so it stays fixed)",
    );
  } else if (!text.startsWith("#!")) {
    fail("docker/launch.sh has no shebang", "restore it from git");
  } else {
    ok("docker/launch.sh is LF with a shebang");
  }
}

/* ------------------------------------------------------------ secret leak -- */

for (const rel of [".env", "backend/.env", "frontend/.env"]) {
  if (!existsSync(join(BUNDLE, rel))) continue;
  fail(
    `dist-portal/${rel} exists and would be baked into the image and pushed with it`,
    `rm dist-portal/${rel}`,
  );
}

/* ---------------------------------------------------------------- drift ---- */

/**
 * The entrypoint and the restorer live in `docker/` and are *copied* into the
 * bundle. Editing one and rebuilding nothing leaves an image running the old
 * copy, which is invisible: both files are present, both are plausible, and the
 * behaviour is the previous build's.
 */
const same = (a, b) =>
  existsSync(a) &&
  existsSync(b) &&
  readFileSync(a, "utf8").split("\r\n").join("\n") ===
    readFileSync(b, "utf8").split("\r\n").join("\n");

for (const [source, bundled] of [
  ["docker/entrypoint.mjs", "start.mjs"],
  ["docker/restore-snapshot.mjs", "backend/restore-snapshot.mjs"],
]) {
  if (same(join(ROOT, source), join(BUNDLE, bundled))) continue;
  fail(
    `${source} differs from the copy in the bundle (dist-portal/${bundled})`,
    "node scripts/build-production-bundle.mjs   (the bundle is stale)",
  );
}

/* -------------------------------------------------------- the snapshot ----- */

try {
  execFileSync(
    process.execPath,
    [join(ROOT, "scripts", "verify-snapshot.mjs"), join(BUNDLE, "snapshot")],
    { stdio: "pipe" },
  );
  ok("bundled snapshot is complete: every referenced media file is present");
} catch (error) {
  fail(
    "the bundled snapshot is incomplete — some referenced media is missing",
    "node scripts/verify-snapshot.mjs dist-portal/snapshot    (for the detail)",
  );
  notes.push(String(error.stdout ?? "").trim().split("\n").slice(-6).join("\n  "));
}

/* --------------------------------------------------------- context size ---- */

const size = (dir) => {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    total += s.isDirectory() ? size(full) : s.size;
  }
  return total;
};
ok(`build context (dist-portal): ${(size(BUNDLE) / 1024 / 1024).toFixed(1)} MB`);

/* --------------------------------------------------------------- verdict --- */

for (const note of notes) console.log(`\n  ! ${note}`);

if (problems.length === 0) {
  console.log("\n✓ Ready to build:\n");
  console.log("    ./scripts/build-image.sh --use-dist-portal");
  console.log("    docker build -t csistmarkscmsportal .\n");
  process.exit(0);
}

console.error(`\n✗ ${problems.length} problem(s) — the image would fail to build or to run:\n`);
for (const { what, fix } of problems) {
  console.error(`  - ${what}`);
  console.error(`      fix: ${fix}\n`);
}
process.exit(1);
