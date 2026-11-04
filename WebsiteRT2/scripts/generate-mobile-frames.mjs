/**
 * Generate the phone-sized copies of the two scroll-driven frame sequences.
 *
 *     node scripts/generate-mobile-frames.mjs
 *
 * The hero's 300 frames are 1920x1080 landscape, drawn with `cover`. On a
 * portrait phone that crops away three quarters of every frame - the reader
 * sees a ~500px-wide strip down the middle - yet the browser still has to
 * download and decode all two million pixels of each one, on the main thread,
 * every time a frame changes. That decode is what made the hero stutter on
 * phones.
 *
 * So portrait screens get their own set:
 *
 * - `public/frames-m/`: centre-cropped to 3:4 (the widest portrait screen, a
 *   tablet held upright, still only shows that much) and scaled to 675x900.
 *   About a third of the pixels, and nothing a phone would have shown is lost.
 * - `public/welcome-frames-m/`: these are drawn with `contain`, so the whole
 *   frame is visible and nothing can be cropped; they are only scaled down to
 *   854x480, which is still wider than a phone draws them.
 *
 * Outputs are committed, like the hero manifest. Re-run after replacing any
 * source frame; files whose output is newer than their source are skipped.
 */

import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const PUBLIC_DIR = join(process.cwd(), "public");

const JOBS = [
  {
    from: "frames",
    to: "frames-m",
    // Centre 3:4 crop of the 1920x1080 frame, then down to 675x900.
    transform: (image, { width, height }) => {
      const cropWidth = Math.round((height * 3) / 4);
      return image
        .extract({
          left: Math.round((width - cropWidth) / 2),
          top: 0,
          width: cropWidth,
          height,
        })
        .resize(675, 900);
    },
  },
  {
    from: "welcome-frames",
    to: "welcome-frames-m",
    transform: (image) => image.resize(854, 480),
  },
];

for (const job of JOBS) {
  const source = join(PUBLIC_DIR, job.from);
  const target = join(PUBLIC_DIR, job.to);
  mkdirSync(target, { recursive: true });

  const files = readdirSync(source)
    .filter((name) => /\.jpe?g$/i.test(name))
    .sort();

  let written = 0;

  for (const name of files) {
    const input = join(source, name);
    const output = join(target, name);

    if (existsSync(output) && statSync(output).mtimeMs >= statSync(input).mtimeMs) {
      continue;
    }

    const image = sharp(input);
    const meta = await image.metadata();

    await job
      .transform(image, meta)
      .jpeg({ quality: 60, mozjpeg: true, progressive: false })
      .toFile(output);

    written += 1;
  }

  console.log(`${job.to}: ${written} written, ${files.length - written} up to date`);
}
