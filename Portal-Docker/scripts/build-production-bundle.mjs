/* eslint-disable no-console */
/**
 * Assembles one self-contained production bundle: API + CMS + initial data.
 *
 *   npm run build:bundle          (from the repo root)
 *
 * Produces `dist-portal/`, which is everything needed to run the Portal on a
 * server with nothing installed but Node and a reachable MongoDB:
 *
 *   dist-portal/
 *     start.mjs              one entrypoint: wait for db -> initialize -> run both
 *     backend/dist           compiled NestJS API
 *     backend/node_modules   production dependencies only
 *     backend/seed-data      demo content captured from the CMS
 *     backend/seed-assets    the media that content references
 *     frontend/              Next.js standalone server, deps traced in
 *     .env.example           what has to be set
 *     README.md              how to run it
 *
 * Why a folder and not only a Docker image: this can be built and *tested* on
 * the machine that produces it, which an image cannot be without a Docker
 * daemon. The Dockerfile beside it wraps this same layout for anyone who wants
 * a container.
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  statSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "dist-portal");

/*
 * The platform the bundle will RUN on, which is not necessarily the one
 * building it.
 *
 * `sharp` ships prebuilt binaries per platform, so a bundle assembled on
 * Windows carries `@img/sharp-win32-x64` and dies on a Linux host the moment
 * anything touches an image — an upload, or Next optimizing one. npm resolves
 * optional dependencies for `--os`/`--cpu` rather than the current machine,
 * which is exactly what cross-building needs.
 *
 * Override for an ARM server (a Raspberry Pi, AWS Graviton):
 *   TARGET_OS=linux TARGET_CPU=arm64 npm run build:bundle
 */
const TARGET_OS = process.env.TARGET_OS ?? "linux";
const TARGET_CPU = process.env.TARGET_CPU ?? "x64";
const TARGET_ARGS = [`--os=${TARGET_OS}`, `--cpu=${TARGET_CPU}`];

const step = (msg) => console.log(`\n▸ ${msg}`);
const run = (cmd, args, cwd = ROOT) =>
  execFileSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });

function dirSize(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    total += s.isDirectory() ? dirSize(full) : s.size;
  }
  return total;
}
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/* ------------------------------------------------------------------ build */

step("Cleaning previous bundle");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

step("Building shared, backend and frontend");
run("npm", ["run", "build"]);

/* ---------------------------------------------------------------- backend */

step("Assembling the API");
mkdirSync(join(OUT, "backend"), { recursive: true });
cpSync(join(ROOT, "backend", "dist"), join(OUT, "backend", "dist"), { recursive: true });
cpSync(join(ROOT, "shared", "dist"), join(OUT, "shared", "dist"), { recursive: true });
cpSync(join(ROOT, "shared", "package.json"), join(OUT, "shared", "package.json"));

/*
 * Production dependencies only, installed into the bundle. `--omit=dev` drops
 * Nest's CLI, TypeScript and the test tooling, which is most of the weight and
 * none of the runtime.
 */
step("Installing production dependencies for the API");
const backendPkg = JSON.parse(
  readFileSync(join(ROOT, "backend", "package.json"), "utf8"),
);

/*
 * `@portal/shared` is dropped from the manifest before installing. It is a
 * workspace package that exists only in this repository, so a plain
 * `npm install` outside the workspace resolves it against the public registry
 * and fails with a 404. Its build output is copied into `node_modules/@portal/`
 * by hand just below, which is what the workspace symlink was doing anyway.
 */
const { "@portal/shared": _workspace, ...dependencies } = backendPkg.dependencies;

writeFileSync(
  join(OUT, "backend", "package.json"),
  JSON.stringify(
    {
      name: backendPkg.name,
      version: backendPkg.version,
      private: true,
      dependencies,
    },
    null,
    2,
  ) + "\n",
);
run(
  "npm",
  ["install", "--omit=dev", "--no-audit", "--no-fund", ...TARGET_ARGS],
  join(OUT, "backend"),
);

// `@portal/shared` is a workspace package: npm cannot resolve it from a plain
// install, so its build output is linked in by hand.
const sharedTarget = join(OUT, "backend", "node_modules", "@portal", "shared");
mkdirSync(sharedTarget, { recursive: true });
cpSync(join(ROOT, "shared", "dist"), join(sharedTarget, "dist"), { recursive: true });
cpSync(join(ROOT, "shared", "package.json"), join(sharedTarget, "package.json"));

/* ------------------------------------------------------- initial data set */

step("Bundling the initial data set");
for (const dir of ["seed-data", "seed-assets"]) {
  const from = join(ROOT, "backend", dir);
  if (!existsSync(from)) {
    console.warn(`  ! ${dir}/ is missing — run backend/scripts/export-demo-data.mjs first`);
    continue;
  }
  cpSync(from, join(OUT, "backend", dir), { recursive: true });
}

/* --------------------------------------------------------------- frontend */

step("Assembling the CMS");
const standalone = join(ROOT, "frontend", ".next", "standalone");
if (!existsSync(join(standalone, "frontend", "server.js"))) {
  throw new Error(
    'Standalone output missing. `output: "standalone"` must be set in frontend/next.config.ts.',
  );
}

// The standalone tree mirrors the monorepo, so its traced node_modules sit a
// level above the app.
cpSync(join(standalone, "frontend"), join(OUT, "frontend"), { recursive: true });
cpSync(join(standalone, "node_modules"), join(OUT, "node_modules"), { recursive: true });

/*
 * Next deliberately leaves these two out of the standalone trace — they are
 * served from disk rather than imported, so nothing references them. Without
 * them the CMS boots and then serves a page with no CSS or JavaScript.
 */
cpSync(join(ROOT, "frontend", ".next", "static"), join(OUT, "frontend", ".next", "static"), {
  recursive: true,
});
if (existsSync(join(ROOT, "frontend", "public"))) {
  cpSync(join(ROOT, "frontend", "public"), join(OUT, "frontend", "public"), {
    recursive: true,
  });
}

/* --------------------------------------------------- native binaries -----*/

/*
 * Replace sharp's prebuilt binaries with the target platform's.
 *
 * The API's dependencies were installed with `--os/--cpu` above, but the CMS's
 * were *copied* from the local build, so they carry whatever this machine runs.
 * Uploaded to a Linux host, Next fails on the first image it optimizes with
 * "Could not load the sharp module using the win32-x64 runtime" — and the CMS
 * looks broken for a reason nothing in the logs connects to the build machine.
 */
step(`Fetching sharp binaries for ${TARGET_OS}-${TARGET_CPU}`);

const sharpVersion = (() => {
  for (const tree of [join(OUT, "node_modules"), join(OUT, "backend", "node_modules")]) {
    const pkg = join(tree, "sharp", "package.json");
    if (existsSync(pkg)) return JSON.parse(readFileSync(pkg, "utf8")).version;
  }
  return null;
})();

if (!sharpVersion) {
  console.log("  sharp is not in the bundle — nothing to do");
} else {
  const staging = join(ROOT, ".sharp-staging");
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  writeFileSync(
    join(staging, "package.json"),
    JSON.stringify({ name: "sharp-staging", private: true }, null, 2) + "\n",
  );

  /*
   * The two platform packages are named explicitly rather than installed via
   * `sharp` itself. `--os/--cpu` alone resolves only the architecture-neutral
   * parts — npm still skips the binaries, because each declares an `os`/`cpu`
   * this machine does not satisfy. Naming them and passing `--force` is what
   * actually fetches a foreign platform's binaries.
   *
   * Versions come from sharp's own `optionalDependencies`, so they always match
   * the sharp in the bundle instead of being pinned here and drifting.
   */
  const sharpPkg = JSON.parse(
    readFileSync(
      existsSync(join(OUT, "node_modules", "sharp", "package.json"))
        ? join(OUT, "node_modules", "sharp", "package.json")
        : join(OUT, "backend", "node_modules", "sharp", "package.json"),
      "utf8",
    ),
  );

  const wanted = Object.entries(sharpPkg.optionalDependencies ?? {}).filter(([name]) =>
    name.endsWith(`-${TARGET_OS}-${TARGET_CPU}`),
  );

  if (wanted.length === 0) {
    throw new Error(
      `sharp ${sharpVersion} publishes no binaries for ${TARGET_OS}-${TARGET_CPU}. ` +
        `Valid suffixes: ${Object.keys(sharpPkg.optionalDependencies ?? {}).join(", ")}`,
    );
  }

  run(
    "npm",
    [
      "install",
      ...wanted.map(([name, version]) => `${name}@${version}`),
      "--no-audit",
      "--no-fund",
      "--force",
      ...TARGET_ARGS,
    ],
    staging,
  );

  const stagedImg = join(staging, "node_modules", "@img");
  const platformDirs = existsSync(stagedImg) ? readdirSync(stagedImg) : [];

  if (platformDirs.length === 0) {
    throw new Error(`npm produced no @img binaries for ${TARGET_OS}-${TARGET_CPU}`);
  }

  for (const tree of [join(OUT, "node_modules"), join(OUT, "backend", "node_modules")]) {
    const img = join(tree, "@img");
    if (!existsSync(img)) continue;

    // Drop binaries for the build machine, keep architecture-neutral packages.
    for (const entry of readdirSync(img)) {
      if (/win32|darwin|linux|linuxmusl/.test(entry) && !entry.includes(TARGET_OS)) {
        rmSync(join(img, entry), { recursive: true, force: true });
      }
    }
    for (const dir of platformDirs) {
      cpSync(join(stagedImg, dir), join(img, dir), { recursive: true });
    }
  }

  rmSync(staging, { recursive: true, force: true });
  console.log(`  installed: ${platformDirs.join(", ")}`);
}

/* -------------------------------------------------------- strip sourcemaps */

/*
 * Source maps map the compiled API back to its TypeScript. Useful while
 * developing, and 142 files of internal structure to hand to a hosting
 * provider — they buy nothing at runtime, since nothing reads them unless a
 * debugger is attached.
 */
step("Stripping source maps");
let stripped = 0;
const dropMaps = (dir) => {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) dropMaps(full);
    else if (name.endsWith(".map")) {
      rmSync(full);
      stripped += 1;
    }
  }
};
dropMaps(join(OUT, "backend", "dist"));
dropMaps(join(OUT, "shared", "dist"));
// Next emits maps for the server bundles too — same reasoning, and they are the
// larger half.
dropMaps(join(OUT, "frontend", ".next", "server"));
console.log(`  removed ${stripped} source map(s)`);

/* ------------------------------------------------------------- entrypoint */

step("Adding the entrypoint and documentation");
cpSync(join(ROOT, "docker", "entrypoint.mjs"), join(OUT, "start.mjs"));
// The bundle's own example, not the backend's: in the bundle `PORT` is the
// public router port, while the backend's example documents it as the API's
// own — following that one puts two servers on the same number.
cpSync(join(ROOT, "docker", "bundle.env.example"), join(OUT, ".env.example"));
if (existsSync(join(ROOT, "docker", "BUNDLE-README.md"))) {
  cpSync(join(ROOT, "docker", "BUNDLE-README.md"), join(OUT, "README.md"));
}

/* ------------------------------------------------------------------ report */

console.log("\n─────────────────────────────────────────────");
console.log("Bundle ready:", OUT);
for (const part of ["backend/dist", "backend/node_modules", "backend/seed-data", "backend/seed-assets", "frontend", "node_modules"]) {
  const size = dirSize(join(OUT, part));
  if (size > 0) console.log(`  ${part.padEnd(24)} ${mb(size).padStart(9)}`);
}
console.log(`  ${"TOTAL".padEnd(24)} ${mb(dirSize(OUT)).padStart(9)}`);
console.log("\nRun it with:  node start.mjs   (see README.md)");
