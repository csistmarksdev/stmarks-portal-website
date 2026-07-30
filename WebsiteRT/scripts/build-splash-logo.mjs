#!/usr/bin/env node
/**
 * Render the splash screen's crest from `public/Logo1.svg`.
 *
 * `Logo1.svg` is not a drawn emblem — it is a 1254px bitmap embedded as base64
 * inside an SVG shell, with a second copy of itself as a luminance mask. That
 * is why it weighs 1.4 MB. The header can afford it (one fetch, cached, and the
 * page is readable while it lands); a splash screen cannot, because the whole
 * proposition of a splash is that it is *already there*, and an emblem the
 * reader has to wait 1.4 MB for is a blank screen with extra steps.
 *
 * So the splash gets a raster reduction: the same artwork, rendered once at
 * 512px — enough for the 96–128px it is displayed at on a 3x screen — as WebP
 * with the alpha channel intact. That lands around 40 KB, about 1/35th of the
 * source, and is the same picture at the size it is actually shown.
 *
 * Run after changing `Logo1.svg`:
 *
 *   node scripts/build-splash-logo.mjs
 *
 * Not wired into `predev`/`build`: the source changes roughly never, and the
 * output is committed. `sharp` arrives as a transitive dependency of Next's
 * image optimizer rather than something this project declares, which is fine
 * for a script run by hand and would not be for one on the build path.
 */

import { existsSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const source = path.join(projectRoot, "public", "Logo1.svg");
const output = path.join(projectRoot, "public", "splash-logo.webp");


/** Displayed at 96–128px; 512 covers a 3x screen with room to spare. */
const SIZE = 512;

/*
 * The SVG declares 940px but carries a 1254px bitmap. Rasterising at a high
 * density and letting `resize` come back down means the downscale samples the
 * bitmap's own pixels rather than an already-degraded 940px rendering of them —
 * it costs nothing here and keeps the seal's lettering legible.
 */
const DENSITY = 600;

if (!existsSync(source)) {
  console.error(`Source not found: ${path.relative(projectRoot, source)}`);
  process.exit(1);
}

const { default: sharp } = await import("sharp").catch(() => {
  console.error(
    "sharp is not installed. It normally comes in with Next's image optimizer;\n" +
      "otherwise: npm i -D sharp",
  );
  process.exit(1);
});

const rendered = await sharp(source, { density: DENSITY })
  .resize(SIZE, SIZE, {
    fit: "contain",
    // The seal sits on a white disc, but the disc is drawn — the corners around
    // it must stay transparent so the crest reads on the parchment ground.
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .webp({ quality: 92, effort: 6 })
  .toBuffer();

writeFileSync(output, rendered);

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const report = (from, to, bytes, dims) => {
  const before = statSync(from).size;
  console.log(
    `${path.relative(projectRoot, to)}  ${dims}  ${kb(bytes)}` +
      `  (from ${kb(before)}, ${(before / bytes).toFixed(1)}x smaller)`,
  );
};

report(source, output, rendered.length, `${SIZE}x${SIZE}`);

