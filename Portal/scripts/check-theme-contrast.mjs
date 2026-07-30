/**
 * Contrast-checks both themes against the *compiled* CSS.
 *
 *   node scripts/check-theme-contrast.mjs
 *
 * Reads the values the browser will actually use — not the ones intended in
 * source — so a token that silently fails to resolve shows up as a failure
 * rather than shipping as invisible text.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cssDir = join(root, "frontend", ".next", "static", "chunks");

const cssFile = readdirSync(cssDir)
  .filter((f) => f.endsWith(".css"))
  .map((f) => ({ f, t: statSync(join(cssDir, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t)[0]?.f;

if (!cssFile) {
  console.error("No compiled CSS found — run `npm run build:frontend` first.");
  process.exit(1);
}
const css = readFileSync(join(cssDir, cssFile), "utf8");

/** Raw palette steps, e.g. brand-400 → #27aeff. */
const palette = {};
for (const m of css.matchAll(/--color-([a-z0-9-]+):(#[0-9a-f]{6});/g)) {
  palette[m[1]] = m[2];
}

/** Semantic tokens declared inside a scope, resolving `var(--color-*)`. */
function scopeTokens(scopeRegex) {
  const out = {};
  for (const block of css.matchAll(scopeRegex)) {
    for (const d of block[1].matchAll(
      /--([a-z-]+):\s*(#[0-9a-f]{3,8}|var\(--color-[a-z0-9-]+\))/g,
    )) {
      const ref = d[2].match(/var\(--color-([a-z0-9-]+)\)/);
      const value = ref ? palette[ref[1]] : d[2];
      if (value) out[d[1]] = value;
    }
  }
  return out;
}

const light = { ...scopeTokens(/:root\{([^}]*)\}/g) };
const dark = { ...light, ...scopeTokens(/\[data-theme=dark\]\{([^}]*)\}/g) };

const toRgb = (hex) => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const luminance = (rgb) => {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(toRgb(a)), luminance(toRgb(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** [label, foreground token, background token, minimum ratio]. */
const PAIRS = [
  ["body text", "foreground", "background", 4.5],
  ["card text", "card-foreground", "card", 4.5],
  ["muted text on background", "muted-foreground", "background", 4.5],
  ["muted text on card", "muted-foreground", "card", 4.5],
  ["primary button label", "primary-foreground", "primary", 4.5],
  ["primary text on background", "primary", "background", 4.5],
  ["destructive button label", "destructive-foreground", "destructive", 4.5],
  ["destructive text on card", "destructive", "card", 4.5],
  ["secondary chip", "secondary-foreground", "secondary", 4.5],
  ["accent eyebrow on background", "accent-fg", "background", 4.5],
  ["accent eyebrow on card", "accent-fg", "card", 4.5],
  ["success text on card", "success", "card", 4.5],
  // Non-text: these only need to be perceptible.
  ["border against card", "border", "card", 1.2],
  ["card against background", "card", "background", 1.05],
];

let failures = 0;
for (const [name, tokens] of [
  ["LIGHT", light],
  ["DARK", dark],
]) {
  console.log(`\n${name}`);
  for (const [label, fg, bg, min] of PAIRS) {
    const a = tokens[fg];
    const b = tokens[bg];
    if (!a || !b) {
      failures++;
      console.log(`  UNRESOLVED  ${label} (${fg}=${a}, ${bg}=${b})`);
      continue;
    }
    const ratio = contrast(a, b);
    if (ratio < min) failures++;
    console.log(
      `  ${(ratio >= min ? "ok" : "FAIL").padEnd(5)}${ratio.toFixed(2).padStart(6)}  (min ${min})  ${label}`,
    );
  }
}

console.log(
  failures
    ? `\n${failures} problem(s) — text may be unreadable in one of the themes.`
    : "\n✓ both themes pass every contrast requirement",
);
process.exit(failures ? 1 : 0);
