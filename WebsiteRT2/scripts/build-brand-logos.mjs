/**
 * Build the small raster logos in `public/brand/` from `public/Logo1.svg`
 * (the CSI emblem) and `public/Logo2.svg` (the arms).
 *
 * Both SVGs are only wrappers: each holds an RGB PNG plus a greyscale PNG used
 * as a luminance mask, base64-encoded, which makes them 1.5 MB and 1 MB for a
 * mark shown at 32-36 px. This decodes the two PNGs, applies the mask as the
 * alpha channel, crops to the SVG's own viewBox, and writes WebP at two
 * heights (96 for 1x-3x at ~32 px, 192 for larger placements).
 *
 * The SVGs are kept as the source of truth; rerun this if either changes:
 *
 *   node scripts/build-brand-logos.mjs
 *
 * `sharp` comes in as a dependency of Next's image optimizer.
 */

import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const publicDir = path.join(projectRoot, "public");
const outDir = path.join(publicDir, "brand");

const SOURCES = [
  { file: "Logo1.svg", name: "csi-emblem" },
  { file: "Logo2.svg", name: "arms" },
];

const HEIGHTS = [96, 192];

/**
 * Part of every output filename. /brand/* is served with a one-year immutable
 * cache, so a changed image under an unchanged name is never refetched - which
 * is how the first (black-background) build stayed on screens after the fix.
 * Bump this whenever the output changes, and update the references in
 * site-header.tsx, site-footer.tsx and splash-screen.tsx.
 */
const VERSION = "v2";

const number = String.raw`(-?[\d.]+)`;

/**
 * The embedded image, its mask, and the region of it the SVG actually shows.
 * Every one of these files has the same shape: one `<image>` inside a
 * luminance `<mask>`, the same `<image>` drawn under that mask, and both placed
 * with the same `matrix(a, 0, 0, d, e, f)`.
 */
async function decode(svg) {
  const pngs = [...svg.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)].map(
    (match) => Buffer.from(match[1], "base64"),
  );
  if (pngs.length !== 2) {
    throw new Error(`expected a mask and an image, found ${pngs.length} PNGs`);
  }

  // The mask is the one declared inside `<mask>`, which comes first.
  const [maskPng, colourPng] = pngs;

  const viewBox = svg.match(
    new RegExp(`viewBox="${number} ${number} ${number} ${number}"`),
  );
  const matrix = svg.match(
    new RegExp(
      String.raw`matrix\(${number},\s*0,\s*0,\s*${number},\s*${number},\s*${number}\)`,
    ),
  );
  if (!viewBox || !matrix) throw new Error("viewBox or transform not found");

  const [vx, vy, vw, vh] = viewBox.slice(1).map(Number);
  const [a, d, e, f] = matrix.slice(1).map(Number);

  const { width, height } = await sharp(colourPng).metadata();

  // The viewBox, mapped back into the bitmap's own pixels.
  const left = Math.max(0, Math.round((vx - e) / a));
  const top = Math.max(0, Math.round((vy - f) / d));
  const crop = {
    left,
    top,
    width: Math.min(width - left, Math.round(vw / a)),
    height: Math.min(height - top, Math.round(vh / d)),
  };

  const alpha = await sharp(maskPng).toColourspace("b-w").raw().toBuffer();
  const rgb = await sharp(colourPng).removeAlpha().raw().toBuffer();

  /*
   * Interleaved by hand. `joinChannel` produced a 4-band image whose fourth
   * band sharp did not treat as alpha, so the WebP came out RGB on black.
   */
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++, j += 4) {
    rgba[j] = rgb[i * 3];
    rgba[j + 1] = rgb[i * 3 + 1];
    rgba[j + 2] = rgb[i * 3 + 2];
    rgba[j + 3] = alpha[i];
  }

  const masked = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();

  // A separate pipeline, so the crop applies to the masked image.
  return sharp(masked).extract(crop).png().toBuffer();
}

mkdirSync(outDir, { recursive: true });

for (const { file, name } of SOURCES) {
  const source = path.join(publicDir, file);
  const rgba = await decode(readFileSync(source, "utf8"));

  for (const height of HEIGHTS) {
    const output = path.join(outDir, `${name}-${height}-${VERSION}.webp`);
    const { data, info } = await sharp(rgba)
      .resize({ height, kernel: "lanczos3" })
      .webp({ quality: 85, alphaQuality: 90, effort: 6 })
      .toBuffer({ resolveWithObject: true });

    writeFileSync(output, data);
    console.log(
      `${path.relative(projectRoot, output)}  ${info.width}x${info.height}  ${data.length} bytes` +
        `  (from ${file}, ${statSync(source).size} bytes)`,
    );
  }
}
