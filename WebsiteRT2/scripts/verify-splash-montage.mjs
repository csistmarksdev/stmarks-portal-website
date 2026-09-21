/**
 * Assert that the splash montage shows every photograph under `public/hero`.
 *
 *     node --import ./scripts/ts-resolve-hook.mjs scripts/verify-splash-montage.mjs
 *
 * Three counts have to agree, and the reason this script exists is that they
 * once did not: the montage capped itself at three images on any machine with
 * reduced motion turned on, and a build, a typecheck and a lint all passed
 * while it did. Nothing in the toolchain could execute that branch, because
 * nothing in the toolchain has a browser.
 *
 *     files on disk  ==  manifest  ==  images the sequence actually visits
 *
 * The third of those is the real thing, not a model of it: `lib/splash-montage.ts`
 * is imported and driven here with a virtual clock, so this exercises the same
 * director the component runs. Both pacing profiles are checked, along with the
 * two failure modes that would silently shorten a montage in the wild - a slow
 * connection where images decode late, and an image that 404s.
 */

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const IMAGE_PATTERN = /\.(jpe?g|png|webp|avif|gif)$/i;
const HERO = join(process.cwd(), "public", "hero");

const load = (relative) =>
  import(pathToFileURL(join(process.cwd(), relative)).href);

const failures = [];
const fail = (message) => failures.push(message);

/* ------------------------------------------------------- A: files on disk -- */

function walk(dir, prefix) {
  const out = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      out.push(...walk(join(dir, entry.name), `${prefix}/${entry.name}`));
    } else if (entry.isFile() && IMAGE_PATTERN.test(entry.name)) {
      out.push(`${prefix}/${entry.name}`);
    }
  }

  return out;
}

if (!existsSync(HERO)) {
  console.error(`No hero folder at ${HERO}.`);
  process.exit(1);
}

const onDisk = walk(HERO, "/hero").sort();

/* --------------------------------------------------------- B: the manifest -- */

const { heroImages } = await load("src/generated/hero-images.ts");
const manifest = [...heroImages].sort();

const missing = onDisk.filter((file) => !manifest.includes(file));
const phantom = manifest.filter((file) => !onDisk.includes(file));

if (missing.length) fail(`${missing.length} file(s) the manifest misses:\n    ${missing.join("\n    ")}`);
if (phantom.length) fail(`${phantom.length} manifest path(s) not on disk:\n    ${phantom.join("\n    ")}`);
if (manifest.length !== new Set(manifest).size) fail("The manifest contains duplicates.");

const malformed = manifest.filter((f) => f.includes("\\") || !f.startsWith("/hero/"));
if (malformed.length) fail(`${malformed.length} manifest path(s) are not usable URLs:\n    ${malformed.join("\n    ")}`);

/* ---------------------------------------------------- C: the real sequence -- */

const { CINEMATIC, GENTLE, createMontage, planMontage, shuffleOrder } =
  await load("src/lib/splash-montage.ts");

/**
 * Runs the real director against a virtual clock.
 *
 * `readyAfter` decides when each image is treated as decoded, in virtual
 * milliseconds, so a slow connection can be simulated exactly; `brokenSet` is
 * the set that never arrives at all.
 */
function run(
  count,
  profile,
  { readyAfter = () => 0, brokenSet = new Set(), lateness = 0 } = {},
) {
  const order = shuffleOrder(count);
  const beats = planMontage(count, profile);

  if (beats.length !== count) {
    fail(`planMontage returned ${beats.length} beats for ${count} images.`);
  }

  if (new Set(order).size !== count || order.length !== count) {
    fail(`shuffleOrder returned ${order.length} entries (${new Set(order).size} unique) for ${count}.`);
  }

  let now = 0;
  let handle = 0;
  const pending = new Map();

  const shown = [];
  let completedAt = null;

  const montage = createMontage({
    order,
    beats,
    isReady: (index) => !brokenSet.has(index) && readyAfter(index) <= now,
    isBroken: (index) => brokenSet.has(index),
    onShow: ({ index, position }) => shown.push({ index, position, at: now }),
    onComplete: () => {
      completedAt = now;
    },
    schedule: (run_, delay) => {
      handle += 1;
      pending.set(handle, { run: run_, at: now + delay });
      return handle;
    },
    cancel: (id) => pending.delete(id),
    /*
     * The director schedules against an absolute timeline rather than a chain
     * of relative delays, so it needs a clock - and it has to be this one, or
     * it would be compensating a virtual schedule against the wall clock and
     * every delay would collapse to the minimum.
     */
    now: () => now,
  });

  montage.start();

  // Drain the clock. The guard is generous - a stalling montage retries - but
  // finite, so a director that never completes fails rather than hangs.
  for (let tick = 0; tick < count * 40 && pending.size > 0; tick += 1) {
    const [id, next] = [...pending.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    pending.delete(id);
    /*
     * Every beat fires `lateness` milliseconds after it was asked to, which is
     * what a real browser does when the main thread is busy hydrating and
     * decoding. This is the pressure that used to break the montage.
     */
    now = next.at + lateness;
    next.run();
  }

  montage.stop();

  return { order, beats, shown, completedAt, now };
}

function check(label, count, profile, options, expected) {
  const { shown, beats, completedAt } = run(count, profile, options);

  const indices = shown.map((entry) => entry.index);
  const unique = new Set(indices);

  if (indices.length !== expected) {
    fail(`${label}: showed ${indices.length} image(s), expected ${expected}.`);
  }

  if (unique.size !== indices.length) {
    fail(`${label}: an image was shown more than once.`);
  }

  if (completedAt === null) {
    fail(`${label}: the montage never completed.`);
  }

  const positions = shown.map((entry) => entry.position);
  const monotonic = positions.every((value, k) => value === k);

  if (!monotonic) {
    fail(`${label}: positions were not 0..n-1 in order.`);
  }

  return {
    shown,
    beats,
    completedAt,
    duration: beats.reduce((sum, b) => sum + b.hold, 0),
  };
}

const N = manifest.length;

const cinematic = check("cinematic", N, CINEMATIC, {}, N);
const gentle = check("gentle (reduced motion)", N, GENTLE, {}, N);

// A slow connection: every image decodes at a staggered, late time.
check(
  "cinematic on a slow connection",
  N,
  CINEMATIC,
  { readyAfter: (index) => index * 120 },
  N,
);

// Two images that never load at all: the rest must still all be shown.
const dead = new Set([3, 17]);
check("cinematic with two broken images", N, CINEMATIC, { brokenSet: dead }, N - dead.size);

// Collection sizes the parish does not have today, so the pacing cannot quietly
// depend on there being exactly fifty-four.
for (const size of [1, 2, 3, 7, 20, 120]) {
  check(`cinematic with ${size} image(s)`, size, CINEMATIC, {}, size);
}

/* --------------------------------- D: the montage finishes before it is cut off -- */

/**
 * The bug this whole file exists to catch, in its most recent form.
 *
 * The splash used to dismiss on a clock - the montage's *planned* length plus
 * the finale - and stop the sequence wherever it had got to. A planned length
 * is not a real one: every beat pays for whatever the main thread was doing
 * when its timer fired, and at the fast end the holds are shorter than that
 * debt. The montage ran long, the splash left on time, and two thirds of the
 * photographs were never seen. Every count in this script agreed with every
 * other one while it happened, because the sequence was correct - it was simply
 * being interrupted.
 *
 * Two things have to hold, and both are checked here against a browser modelled
 * as running every single beat late:
 *
 *   1. The director compensates. Running each beat 25ms late must not stretch
 *      the montage by fifty-four times 25ms; it must absorb the lateness by
 *      shortening the delays that follow.
 *   2. The component waits. The splash's ceiling has to sit beyond the montage's
 *      worst realistic finish, or the ceiling becomes the truncation the two
 *      gates were meant to remove.
 */
const LATE_MS = 25;

const late = check(
  `cinematic with every beat ${LATE_MS}ms late`,
  N,
  CINEMATIC,
  { lateness: LATE_MS },
  N,
);

const planned = late.duration;
const naive = planned + LATE_MS * N;

if (late.completedAt > naive * 0.9) {
  fail(
    `drift compensation is not working: a montage planned at ${Math.round(planned)}ms took ${Math.round(late.completedAt)}ms with ${LATE_MS}ms of lateness per beat, which is the uncompensated ${Math.round(naive)}ms.`,
  );
}

/*
 * The component's own arithmetic, mirrored: it leaves at the montage's end plus
 * the finale, and the ceiling is the hold plus the montage's length again.
 */
const FINAL_HOLD_MS = 550;
const MIN_VISIBLE_MS = 1900;
const MAX_OVERRUN_MS = 900;

const minHold = Math.max(MIN_VISIBLE_MS, Math.round(planned) + FINAL_HOLD_MS);
const ceiling = Math.max(
  3600,
  minHold + Math.max(MAX_OVERRUN_MS, Math.round(planned)),
);

if (late.completedAt + FINAL_HOLD_MS > ceiling) {
  fail(
    `the ceiling would truncate the montage: it finishes at ${Math.round(late.completedAt)}ms under load, and the splash leaves at ${ceiling}ms.`,
  );
}

/* ------------------------------------------------- E: the acceleration is real -- */

/**
 * The montage has to keep speeding up all the way to its last photograph.
 *
 * This is not decoration: a power curve converges on its asymptote, so it is
 * easy to produce a sequence that accelerates for forty frames and then plays
 * its final fifteen at one flat speed. That looks like the montage giving up
 * exactly where it should be at its most urgent, and it is invisible in a
 * summary that only prints the first and last hold.
 *
 * Compared fifth by fifth rather than frame by frame, because the holds carry a
 * few percent of deliberate jitter and two neighbours may cross.
 */
function fifths(beats) {
  const size = Math.ceil(beats.length / 5);
  const out = [];

  for (let k = 0; k < beats.length; k += size) {
    const slice = beats.slice(k, k + size);
    out.push(slice.reduce((sum, b) => sum + b.hold, 0) / slice.length);
  }

  return out;
}

const phases = fifths(cinematic.beats);

for (let k = 1; k < phases.length; k += 1) {
  if (phases[k] >= phases[k - 1]) {
    fail(
      `cinematic: fifth ${k + 1} (${Math.round(phases[k])}ms) is not faster than fifth ${k} (${Math.round(phases[k - 1])}ms).`,
    );
  }
}

const last = cinematic.beats[cinematic.beats.length - 1].hold;
const first = cinematic.beats[0].hold;

if (first / last < 5) {
  fail(
    `cinematic: the montage only accelerates ${(first / last).toFixed(1)}:1 - the finale should be several times faster than the opening.`,
  );
}

// The last stretch is meant to be the climax: the closing frames should be
// flying, not merely quick.
const closing = cinematic.beats.slice(-Math.ceil(cinematic.beats.length * 0.1));
const closingMean = closing.reduce((sum, b) => sum + b.hold, 0) / closing.length;

if (closingMean > 200) {
  fail(`cinematic: the final tenth averages ${Math.round(closingMean)}ms, which is not a rapid finish.`);
}

/* ------------------------------------------------------------------ report -- */

const ladder = cinematic.beats.map((b) => Math.round(b.hold));

console.log("");
console.log(`  Files on disk:     ${onDisk.length}`);
console.log(`  Manifest images:   ${manifest.length}`);
console.log(`  Splash sequence:   ${cinematic.shown.length}`);
console.log("");
console.log(`  Cinematic: ${(cinematic.duration / 1000).toFixed(2)}s`);
console.log(`    holds ${ladder[0]}ms -> ${ladder[ladder.length - 1]}ms  (${(ladder[0] / ladder[ladder.length - 1]).toFixed(1)}:1)`);
console.log(`    by fifth: ${phases.map((v) => `${Math.round(v)}ms`).join("  ->  ")}`);
console.log(`    ladder:   ${ladder.join(" ")}`);
console.log(
  `    under load: finishes at ${(late.completedAt / 1000).toFixed(2)}s (splash ceiling ${(ceiling / 1000).toFixed(2)}s)`,
);
console.log(`  Gentle:    ${(gentle.duration / 1000).toFixed(2)}s`);
console.log(
  `    holds ${Math.round(gentle.beats[0].hold)}ms -> ${Math.round(gentle.beats[gentle.beats.length - 1].hold)}ms`,
);
console.log("");

if (failures.length > 0) {
  console.error("FAILED:\n");
  for (const problem of failures) console.error(`  - ${problem}\n`);
  process.exit(1);
}

console.log("  All checks passed: every hero image is discovered and shown.\n");
