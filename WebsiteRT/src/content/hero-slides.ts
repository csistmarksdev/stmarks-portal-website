import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Backdrop slides for each inner page's hero.
 *
 * Permanent site content: the imagery is shipped with the build, not
 * administered in the Portal. Each section owns a folder under
 * `public/hero/<section>/` — to change a page's hero, drop files into its
 * folder. Nothing else needs to move, and there is no `/hero-slides` endpoint
 * to wire up.
 *
 * The folder is read at build time rather than described by a hand-kept count.
 * That count used to live here as a `SLIDE_COUNT` map, so every change to the
 * photography was two edits in two places — and it failed silently in both
 * directions: a count set too high requested files that were not there, and one
 * set too low quietly ignored photographs someone had already added. Reading
 * the directory makes the folder the single source of truth, which is what the
 * instruction above always implied it was.
 *
 * Safe as a module-scope read: every importer is a server component, so this
 * runs during the build and never reaches the browser.
 *
 * The files currently in those folders are placeholders lifted from the
 * cinematic sequence in `public/frames`, one distinct run per section. Replace
 * them with real photography as it comes in — no code change needed.
 */

export type HeroSlideKey =
  | "about"
  | "leadership"
  | "fellowships"
  | "events"
  | "blog"
  | "gallery"
  | "announcements"
  | "downloads"
  | "contact";

const SECTIONS: HeroSlideKey[] = [
  "about",
  "leadership",
  "fellowships",
  "events",
  "blog",
  "gallery",
  "announcements",
  "downloads",
  "contact",
];

/** Web-deliverable stills. Anything else in the folder is ignored. */
const IMAGE_PATTERN = /\.(jpe?g|png|webp|avif)$/i;

function slides(section: HeroSlideKey): string[] {
  const dir = join(process.cwd(), "public", "hero", section);

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    // A missing folder is a hero with no backdrop, not a broken build — the
    // slideshow falls back to its own ground.
    return [];
  }

  return (
    entries
      .filter((name) => IMAGE_PATTERN.test(name))
      /*
       * Numeric-aware, so `10.jpg` sorts after `9.jpg` rather than between
       * `1.jpg` and `2.jpg`. The existing zero-padded names order correctly
       * either way; an unpadded set dropped in by hand now does too.
       */
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((name) => `/hero/${section}/${name}`)
  );
}

export const HERO_SLIDES: Record<HeroSlideKey, string[]> = Object.fromEntries(
  SECTIONS.map((key) => [key, slides(key)]),
) as Record<HeroSlideKey, string[]>;
