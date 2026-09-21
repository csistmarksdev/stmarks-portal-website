/**
 * Static, non-translated site configuration.
 *
 * Anything a content editor would eventually change lives in the service
 * layer; this file holds build-time constants only (URLs, analytics ids).
 */
export const SITE_CONFIG = {
  /** Canonical origin - override per environment via NEXT_PUBLIC_SITE_URL. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://csistmarksmadipakkam.org",
  ogImage: "/og/default.jpg",
  locale: {
    en: "en_IN",
    ta: "ta_IN",
  },
} as const;

/**
 * The Portal's NestJS API. Set in `.env.local`; when empty the service layer
 * falls back to `src/data/*.mock.ts` so the site still renders unconfigured.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * The site is one page.
 *
 * About, leadership, fellowships, events, the blog index, the gallery
 * chapter,
 * announcements and downloads are no longer routes of their own - each is a
 * chapter of `/`, rendered by a component under `src/features/sections/`. Only
 * Contact keeps a page to itself, along with the per-item detail routes an
 * album, an event, a post or a fellowship still needs.
 *
 * These are the ids those chapters carry in the document. Everything that
 * points at a chapter - the menu, the footer, the "view all" links on the
 * cards - derives its href from here, so the anchor and the element can only
 * ever agree.
 */
export const SECTION_IDS = {
  about: "about",
  leadership: "leadership",
  fellowships: "fellowships",
  events: "events",
  blog: "blog",
  gallery: "gallery",
  announcements: "announcements",
  downloads: "downloads",
  contact: "contact",
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];

/**
 * The chapters in the order the page lays them out.
 *
 * Declaration order of the record above is the page order, so the two cannot
 * drift: the header's scroll-spy walks this list top-down and takes the first
 * chapter crossing the reading band as the current one.
 */
export const SECTION_ORDER = Object.values(SECTION_IDS) as SectionId[];

/**
 * Which way a chapter's hero photography travels as it crosses the viewport.
 *
 * Alternated on page position, so one chapter's backdrop runs left and the next
 * one's runs right. Derived from `SECTION_ORDER` rather than written into each
 * section, because the thing being alternated is the *order on the page* - and
 * a hand-set direction in eight files is eight chances for two neighbours to
 * end up running the same way after a reshuffle.
 */
export function heroDirection(id: SectionId): "left" | "right" {
  return SECTION_ORDER.indexOf(id) % 2 === 0 ? "left" : "right";
}

/** An in-page anchor as a link target: `/#about`, and `/en/#about` after routing. */
export function sectionHref(id: string): string {
  return `/#${id}`;
}

export const ROUTES = {
  home: "/",

  /*
   * Chapters of the home page. Written as `/#id` rather than as a bare `#id`
   * so the same constant works from the contact page and from a detail page,
   * where a bare hash would resolve against the wrong document.
   */
  about: sectionHref(SECTION_IDS.about),
  leadership: sectionHref(SECTION_IDS.leadership),
  fellowships: sectionHref(SECTION_IDS.fellowships),
  events: sectionHref(SECTION_IDS.events),
  blog: sectionHref(SECTION_IDS.blog),
  gallery: sectionHref(SECTION_IDS.gallery),

  /*
   * The archives.
   *
   * Three subjects accumulate without limit - albums, events and posts - and a
   * chapter that grows after every festival eventually buries the chapters
   * beneath it. So each of the three keeps only its most recent handful in the
   * document and hands the rest to a page of its own.
   *
   * Note the pairing throughout: `gallery`, `events` and `blog` above are the
   * *chapters* (`/#gallery` and so on) and are what the navigation points at;
   * the three below are the *archives*, reached from each chapter's own button
   * and from the detail pages beneath them.
   *
   * All three paths are deliberately absent from `LEGACY_SECTION_PATHS` - a
   * redirect there is checked before the filesystem, so leaving one in place
   * would make its page silently unreachable.
   */
  albumArchive: "/gallery",
  eventArchive: "/events",
  blogArchive: "/events/blog",
  announcements: sectionHref(SECTION_IDS.announcements),
  downloads: sectionHref(SECTION_IDS.downloads),

  /*
   * Contact was the last exception - "the one page that is still a page" - and
   * it is a chapter now like the rest. Everything that was on `/contact` (the
   * register, the form and the map) lives in `features/sections/contact-section`
   * at the foot of the document, so the invitation and the thing it invites you
   * to do are finally in the same place instead of a click apart.
   */
  contact: sectionHref(SECTION_IDS.contact),

  /* Per-item detail routes. A single page cannot hold every album, event,
     post and fellowship at once, so these stay routes and are linked from
     their chapter above. */
  fellowship: (slug: string) => `/fellowships/${slug}`,
  event: (slug: string) => `/events/${slug}`,
  blogPost: (slug: string) => `/events/blog/${slug}`,
  album: (slug: string) => `/gallery/${slug}`,
} as const;

/**
 * Where the chapters used to live, against the id they became.
 *
 * The old paths are kept as redirect stubs rather than deleted: they are in
 * the church's printed material, in search results and in people's bookmarks,
 * and a 404 is a worse answer than a scroll to the right part of the page.
 * `src/app/[locale]/<segment>/page.tsx` reads this; nothing else should.
 */
export const LEGACY_SECTION_PATHS: Record<string, SectionId> = {
  "/about": SECTION_IDS.about,
  "/leadership": SECTION_IDS.leadership,
  "/fellowships": SECTION_IDS.fellowships,
  "/announcements": SECTION_IDS.announcements,
  "/downloads": SECTION_IDS.downloads,
  "/contact": SECTION_IDS.contact,
};
