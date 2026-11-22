/**
 * Builds public/og/default.jpg (1200x630) - the default share preview for
 * WhatsApp/Facebook (F-016): the church spire with its name in Tamil and
 * English. Run: node scripts/generate-og-image.mjs
 */
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(root, "public/hero/about/01.jpg");
const out = path.join(root, "public/og/default.jpg");

const band = Buffer.from(`
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.35" stop-color="#1c140f" stop-opacity="0"/>
      <stop offset="1" stop-color="#1c140f" stop-opacity="0.92"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="60" y="505" font-family="Nirmala UI, Noto Sans Tamil, Latha, sans-serif" font-size="40" font-weight="700" fill="#ffffff">சி.எஸ்.ஐ. தூய மாற்கு ஆலயம், மடிப்பாக்கம்</text>
  <text x="60" y="568" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="38" font-weight="600" fill="#f3e9dc">CSI St. Mark's Church, Madipakkam</text>
</svg>`);

await sharp(source)
  .resize(1200, 630, { fit: "cover", position: "top" })
  .composite([{ input: band }])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(out);

console.log(`wrote ${out}`);
