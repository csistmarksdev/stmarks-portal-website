/**
 * Assert that the pre-paint season bootstrap agrees with `getSeason`.
 *
 * The bootstrap in `src/app/[locale]/layout.tsx` is a hand-inlined copy of the
 * arithmetic in `src/lib/liturgical-year.ts`. It exists because the season has
 * to be on the root element *before first paint* - the splash screen is up for
 * as little as 1.9 seconds, and an effect cannot run until React has hydrated
 * the cinematic hero - and an ES import cannot be made to run that early.
 *
 * Duplicated logic drifts. This is the thing that stops it: it runs both
 * implementations over every day of a twenty-year window and fails on the first
 * disagreement, naming the date.
 *
 *     node scripts/verify-season-script.mjs
 *
 * Run it after touching either copy. The failure mode it guards against is the
 * worst kind - nobody notices until Good Friday.
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FROM = 2024;
const TO = 2044;

/* ---------------------------------------------------------------- the copy -- */

const layout = readFileSync("src/app/[locale]/layout.tsx", "utf8");
const match = layout.match(/export const SEASON_BOOTSTRAP =\s*'([^']*)';/s);

if (!match) {
  console.error("Could not find SEASON_BOOTSTRAP in the layout.");
  process.exit(1);
}

const bootstrap = match[1];

/*
 * The script writes to `document.documentElement.dataset.season` and reads
 * `location.search`. Both are stubbed so it can run under Node unchanged -
 * testing a rewritten version of it would test the rewrite, not the shipped
 * code.
 */
function seasonFromBootstrap(date) {
  const root = { dataset: {} };
  const fn = new Function(
    "document",
    "location",
    "URLSearchParams",
    "Date",
    bootstrap,
  );

  class FrozenDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [date]));
    }
    static now() {
      return date.getTime();
    }
  }

  fn(
    { documentElement: root },
    { search: "" },
    URLSearchParams,
    FrozenDate,
  );

  return root.dataset.season;
}

/* -------------------------------------------------------------- the module -- */

const out = mkdtempSync(join(tmpdir(), "season-"));

/*
 * `shell: true` because on Windows `npx` is a `.cmd` shim, which Node will not
 * spawn directly - and the whole point of this script is that it runs for
 * whoever happens to be touching the calendar.
 */
execFileSync(
  "npx",
  [
    "tsc",
    "src/lib/liturgical-year.ts",
    "--outDir",
    out,
    "--module",
    "esnext",
    "--target",
    "es2022",
    "--moduleResolution",
    "bundler",
  ],
  { stdio: "inherit", shell: true },
);

const { getSeason } = await import(
  `file://${join(out, "liturgical-year.js").replace(/\\/g, "/")}`
);

/* ------------------------------------------------------------------- check -- */

let days = 0;
let failures = 0;

for (let year = FROM; year <= TO; year++) {
  for (let month = 0; month < 12; month++) {
    const last = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= last; day++) {
      const date = new Date(year, month, day, 12);
      const fromModule = getSeason(date);
      const fromScript = seasonFromBootstrap(date);
      days++;

      if (fromModule !== fromScript) {
        failures++;
        if (failures <= 10) {
          console.error(
            `  ${date.toISOString().slice(0, 10)}  module=${fromModule}  script=${fromScript}`,
          );
        }
      }
    }
  }
}

if (failures) {
  console.error(
    `\nFAIL - the bootstrap and getSeason disagree on ${failures} of ${days} days.`,
  );
  process.exit(1);
}

console.log(
  `ok - bootstrap and getSeason agree on all ${days} days, ${FROM}–${TO}.`,
);
