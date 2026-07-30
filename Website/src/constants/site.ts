/**
 * Static, non-translated site configuration.
 *
 * Anything a content editor would eventually change lives in the service
 * layer; this file holds build-time constants only (URLs, analytics ids).
 */
export const SITE_CONFIG = {
  /** Canonical origin — override per environment via NEXT_PUBLIC_SITE_URL. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://csistmarksmadipakkam.org",
  ogImage: "/og/default.jpg",
  locale: {
    en: "en_IN",
    ta: "ta_IN",
  },
} as const;

/** Where the NestJS API will live. Unused until the backend exists. */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const ROUTES = {
  home: "/",
  about: "/about",
  leadership: "/leadership",
  fellowships: "/fellowships",
  fellowship: (slug: string) => `/fellowships/${slug}`,
  events: "/events",
  event: (slug: string) => `/events/${slug}`,
  // Static segment, so it resolves ahead of /events/[slug].
  blog: "/events/blog",
  blogPost: (slug: string) => `/events/blog/${slug}`,
  gallery: "/gallery",
  album: (slug: string) => `/gallery/${slug}`,
  announcements: "/announcements",
  downloads: "/downloads",
  contact: "/contact",
} as const;
