import type { Locale } from "@/i18n/routing";

/**
 * The curtain drawn while the site changes language.
 *
 * Switching language re-renders the whole root layout under the new locale,
 * so the curtain cannot live in React state: whatever held it would itself be
 * re-rendered (or remounted) half-way through. It is a plain element on
 * `<body>` instead, raised here by the language switch and lowered by
 * `LanguageTransitionWatcher` once the page has rendered in the new language.
 *
 * It is drawn in the opening splash's vocabulary - the white field, the parish
 * crest, a gilded rule - with the destination language named in its own
 * script, so the change reads as the site turning to the other language
 * rather than as a page loading. Styles: the `#lang-transition` block in
 * `globals.css`, which also quiets it under reduced motion.
 *
 * It cannot get stuck: it lowers itself after `FALLBACK_MS` whatever happens.
 */

const ID = "lang-transition";

/** Long enough to read as a deliberate turn, short enough not to be a wait. */
const MIN_VISIBLE_MS = 650;
const LEAVE_MS = 450;
const FALLBACK_MS = 6000;

const WORDS: Record<Locale, { name: string; switching: string }> = {
  en: { name: "English", switching: "Switching to English" },
  ta: { name: "தமிழ்", switching: "தமிழுக்கு மாறுகிறது" },
};

let target: Locale | null = null;
let shownAt = 0;
let fallback: number | undefined;
let lowering: number | undefined;

function element(): HTMLElement {
  let el = document.getElementById(ID);
  if (!el) {
    el = document.createElement("div");
    el.id = ID;
    document.body.appendChild(el);
  }
  return el;
}

/** Raise the curtain on the way to `next`. */
export function beginLanguageTransition(next: Locale): void {
  if (typeof document === "undefined") return;

  window.clearTimeout(fallback);
  window.clearTimeout(lowering);

  const el = element();
  const words = WORDS[next];
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.innerHTML = `
    <div class="lt-stack">
      <img class="lt-crest" src="/brand/csi-emblem-96-v2.webp" alt="" width="96" height="96" aria-hidden="true" />
      <p class="lt-name" lang="${next}" aria-hidden="true">${words.name}</p>
      <span class="lt-rule" aria-hidden="true"></span>
      <p class="lt-note" lang="${next}">${words.switching}</p>
    </div>`;

  el.dataset.phase = "entering";
  // Two frames: the first paints the "entering" state, the second animates
  // from it - a single frame is sometimes coalesced and the fade is skipped.
  requestAnimationFrame(() => requestAnimationFrame(() => (el.dataset.phase = "shown")));

  target = next;
  shownAt = performance.now();
  fallback = window.setTimeout(lower, FALLBACK_MS);
}

/**
 * Called whenever the page's language is known to be `current`; lowers the
 * curtain if it was raised for that language (after its minimum time up).
 */
export function completeLanguageTransition(current: Locale): void {
  if (typeof document === "undefined" || target !== current) return;
  const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt));
  window.clearTimeout(lowering);
  lowering = window.setTimeout(lower, wait);
}

function lower(): void {
  window.clearTimeout(fallback);
  target = null;
  const el = document.getElementById(ID);
  if (!el) return;
  el.dataset.phase = "leaving";
  window.setTimeout(() => {
    // A new switch may have raised it again in the meantime.
    if (el.dataset.phase === "leaving") el.remove();
  }, LEAVE_MS);
}
