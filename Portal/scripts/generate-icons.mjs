/**
 * Builds the Portal's icon set from the church crest.
 *
 *   node scripts/generate-icons.mjs
 *
 * Source: frontend/Logo.svg — a 1.4 MB SVG that wraps two base64 PNGs: an RGB
 * image plus a greyscale mask the SVG applies as an alpha channel. Neither is
 * usable on its own, so we recombine them here and emit optimised assets:
 *
 *   frontend/src/app/icon.png        favicon (Next.js file convention)
 *   frontend/src/app/apple-icon.png  iOS home-screen icon, on a solid ground
 *   frontend/public/logo.png         in-app mark (sidebar, sign-in)
 *
 * Re-run only if the crest artwork changes.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// sharp is a backend dependency; the frontend has no need for it at runtime.
const sharp = createRequire(join(root, "backend", "package.json"))("sharp");

const SOURCE = join(root, "frontend", "Logo.svg");
const APP_DIR = join(root, "frontend", "src", "app");
const PUBLIC_DIR = join(root, "frontend", "public");

/** Sand-50 from the design tokens — matches the app background. */
const GROUND = { r: 252, g: 251, b: 248, alpha: 1 };

function extractLayers() {
  const svg = readFileSync(SOURCE, "utf8");
  const images = [...svg.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)].map(
    (match) => Buffer.from(match[1], "base64"),
  );
  if (images.length < 2) {
    throw new Error(
      `Expected an image and a mask inside ${SOURCE}, found ${images.length}`,
    );
  }
  // The smaller buffer is the greyscale mask, the larger the colour artwork.
  const [mask, colour] = images.sort((a, b) => a.length - b.length);
  return { mask, colour };
}

async function buildCrest() {
  const { mask, colour } = extractLayers();
  const { width, height } = await sharp(colour).metadata();

  const alpha = await sharp(mask)
    .resize(width, height)
    .toColourspace("b-w")
    .raw()
    .toBuffer();

  const composited = await sharp(colour)
    .ensureAlpha()
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();

  // Drop the transparent margin so padding below is even on every side.
  return sharp(composited).trim({ threshold: 1 }).png().toBuffer();
}

/**
 * The crest is flat heraldry — a palette PNG is visually identical to
 * truecolour here and roughly a tenth the size, which matters for an asset
 * the browser fetches on every page load.
 */
const PNG_OPTS = { palette: true, quality: 90, effort: 10, compressionLevel: 9 };

/** Fits the crest inside a square canvas, leaving a little breathing room. */
function square(crest, size, background) {
  const inner = Math.round(size * 0.88);
  return sharp(crest)
    .resize(inner, inner, { fit: "contain", background: { ...GROUND, alpha: 0 } })
    .extend({
      top: Math.ceil((size - inner) / 2),
      bottom: Math.floor((size - inner) / 2),
      left: Math.ceil((size - inner) / 2),
      right: Math.floor((size - inner) / 2),
      background,
    })
    .png(PNG_OPTS)
    .toBuffer();
}

const crest = await buildCrest();
mkdirSync(PUBLIC_DIR, { recursive: true });

const outputs = [
  [join(APP_DIR, "icon.png"), await square(crest, 256, { ...GROUND, alpha: 0 })],
  [join(APP_DIR, "apple-icon.png"), await square(crest, 180, GROUND)],
  [
    join(PUBLIC_DIR, "logo.png"),
    // Displayed no larger than ~48px; 256 tall covers 3× density screens.
    await sharp(crest).resize({ height: 256 }).png(PNG_OPTS).toBuffer(),
  ],
];

for (const [path, buffer] of outputs) {
  writeFileSync(path, buffer);
  console.log(`✓ ${path.replace(root, ".")} (${(buffer.length / 1024).toFixed(0)} KB)`);
}
