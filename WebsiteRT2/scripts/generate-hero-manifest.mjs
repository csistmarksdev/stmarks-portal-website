/**
 * Generate the splash screen's hero-image manifest from the filesystem.
 *
 *     node scripts/generate-hero-manifest.mjs
 *
 * Runs from `predev` and `prebuild`, so the list is rebuilt every time anyone
 * starts the site or ships it. Adding a photograph anywhere under
 * `public/hero` - at any depth - puts it in the montage with no edit to any
 * source file.
 *
 * This replaced a module that called `readdirSync` at import time. That worked
 * for a build and had one sharp edge in development: nothing in the bundler
 * knows that module depends on a *directory*, so photographs added while the
 * dev server was running never appeared until somebody restarted it, and the
 * manifest silently disagreed with the folder in the one situation where
 * somebody is actively looking at the folder. A file the toolchain can see
 * being written has no such problem.
 *
 * The output is committed. It is generated, but it is also the thing the
 * splash imports, so a checkout that has not run `predev` yet still builds.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * What counts as an image.
 *
 * Every raster format a browser will reliably decode, matched case
 * insensitively - `.JPG` off a camera and `.jpg` off a phone are the same
 * photograph, and a discovery system that silently drops one of them is the
 * exact failure this script exists to prevent.
 *
 * `.svg` is deliberately absent: it is an image the browser can draw, but a
 * vector in a folder of photographs is a logo or a diagram somebody filed in
 * the wrong place, and full-bleeding it across the opening frame would look
 * like a bug.
 */
const IMAGE_PATTERN = /\.(jpe?g|png|webp|avif|gif|bmp)$/i;

const PUBLIC_DIR = join(process.cwd(), "public");
const HERO_DIR = join(PUBLIC_DIR, "hero");
const OUTPUT = join(process.cwd(), "src", "generated", "hero-images.ts");

/**
 * Walks the tree depth first, collecting image files.
 *
 * `readdirSync(..., { recursive: true })` would do this in one call and is not
 * used: this walk sorts each directory as it descends, which is what makes the
 * output stable. The recursive flag returns entries in filesystem order, so a
 * run on Windows and a run on Linux would produce two different files and every
 * checkout would show a spurious diff.
 */
function walk(absolute, segments) {
  let entries;

  try {
    entries = readdirSync(absolute, { withFileTypes: true });
  } catch {
    return [];
  }

  const found = [];

  const sorted = entries.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );

  for (const entry of sorted) {
    if (entry.isDirectory()) {
      found.push(...walk(join(absolute, entry.name), [...segments, entry.name]));
      continue;
    }

    if (!entry.isFile() || !IMAGE_PATTERN.test(entry.name)) continue;

    /*
     * Built from path segments rather than by replacing separators in a joined
     * path. `path.join` produces backslashes on Windows, and `/hero\about\01.jpg`
     * is a 404 that looks perfectly healthy in a manifest.
     */
    found.push(`/${["hero", ...segments, entry.name].join("/")}`);
  }

  return found;
}

const images = walk(HERO_DIR, []);

const file = `// GENERATED FILE - do not edit.
//
// Written by \`scripts/generate-hero-manifest.mjs\`, which runs from \`predev\`
// and \`prebuild\`. Every image under \`public/hero\`, at any depth, in a stable
// order. To change what is in here, add or remove photographs in that folder.

/** Every hero photograph, for the splash montage. ${images.length} at last generation. */
export const heroImages: string[] = [
${images.map((src) => `  ${JSON.stringify(src)},`).join("\n")}
];
`;

mkdirSync(dirname(OUTPUT), { recursive: true });

/*
 * Only written when it differs. The dev server watches this file, and rewriting
 * identical bytes on every `predev` would be a rebuild for nothing.
 */
let previous = "";
try {
  previous = readFileSync(OUTPUT, "utf8");
} catch {
  /* First run. */
}

if (previous !== file) {
  writeFileSync(OUTPUT, file, "utf8");
  console.log(`Hero manifest: ${images.length} image(s) -> src/generated/hero-images.ts`);
} else {
  console.log(`Hero manifest: ${images.length} image(s), unchanged.`);
}

if (images.length === 0) {
  console.warn(
    "Hero manifest is empty - the splash will have no photographs to show.",
  );
}
