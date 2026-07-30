/**
 * Backdrop slides for each inner page's hero.
 *
 * Permanent site content: the imagery is shipped with the build, not
 * administered in the Portal. Each section owns a folder under
 * `public/hero/<section>/`, numbered `01.jpg` upward — to change a page's hero,
 * drop new files into its folder and adjust the count below. Nothing else
 * needs to move, and there is no `/hero-slides` endpoint to wire up.
 *
 * The files currently in those folders are placeholders lifted from the
 * cinematic sequence in `public/frames`, one distinct run per section. Replace
 * them with real photography as it comes in.
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

/** How many images sit in each section's folder. */
const SLIDE_COUNT: Record<HeroSlideKey, number> = {
  about: 6,
  leadership: 6,
  fellowships: 6,
  events: 6,
  blog: 6,
  gallery: 6,
  announcements: 6,
  downloads: 6,
  contact: 6,
};

function slides(section: HeroSlideKey): string[] {
  return Array.from(
    { length: SLIDE_COUNT[section] },
    (_, i) => `/hero/${section}/${String(i + 1).padStart(2, "0")}.jpg`,
  );
}

export const HERO_SLIDES: Record<HeroSlideKey, string[]> = Object.fromEntries(
  (Object.keys(SLIDE_COUNT) as HeroSlideKey[]).map((key) => [key, slides(key)]),
) as Record<HeroSlideKey, string[]>;
