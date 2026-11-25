/**
 * Public content models.
 *
 * ⚠️ These mirror `Website/src/types/content.ts` field-for-field - they are
 * the exact response schemas of the public API. Do not rename fields or
 * change shapes here without a matching Website change.
 */

import type {
  BaseEntity,
  ImageAsset,
  LocalizedText,
  LocalizedTextOptional,
  SeoMeta,
} from "./common";

/* -------------------------------------------------------------------------- */
/* Church singletons                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Only the church content that genuinely changes is modelled here.
 *
 * The church profile, history, vision & mission, diocese details, the
 * leadership roll and hero slide imagery are **hardcoded in the Website**:
 * they are written once and revised years apart (or, for leadership, about
 * once a year), so routing them through a CMS bought ceremony and no benefit.
 * The Website owns those types; the Portal neither stores nor serves them.
 * See docs/API.md §Church.
 */
/**
 * How many services can be pinned in the homepage hero at once - the strip
 * under the title stays one line and the timings scene one row. Enforced by
 * the CMS switch, the API, and (as a last guard) the Website.
 */
export const MAX_FEATURED_SERVICES = 3;

export interface ServiceTiming {
  id: string;
  day: LocalizedText;
  /**
   * The time as the Website prints it ("6:00 AM – 7:30 AM", "காலை 6:00 –
   * 7:30"). The CMS writes it from `startTime`/`endTime`; it stays the field
   * every Website page reads, so older entries without clock values still show.
   */
  time: LocalizedText;
  /** Start on a 24-hour clock, "HH:mm". Absent on entries saved before 1.7.4. */
  startTime?: string;
  /** End on a 24-hour clock, "HH:mm". Optional - many services have no fixed end. */
  endTime?: string;
  /**
   * Pinned in the homepage's cinematic hero (the "Sunday services" strip and
   * the timings scene). When nothing is featured the hero falls back to every
   * Sunday service.
   */
  featured?: boolean;
  /**
   * The weeks of the month the service is held: 1-5 for the nth occurrence of
   * its day, -1 for the last. Absent or empty means every week. E.g. [1, 3] is
   * "1st & 3rd Sunday of the month".
   */
  weeks?: number[];
  service: LocalizedText;
  venue: LocalizedText;
}

/* -------------------------------------------------------------------------- */
/* Fellowships                                                                */
/* -------------------------------------------------------------------------- */

export type FellowshipSlug =
  | "youth-fellowship"
  | "young-couple-fellowship"
  | "sunday-school"
  | "choir"
  | "womens-fellowship"
  | "mens-fellowship"
  | "prayer-fellowship"
  | "other-fellowships";

export const FELLOWSHIP_SLUGS: readonly FellowshipSlug[] = [
  "youth-fellowship",
  "young-couple-fellowship",
  "sunday-school",
  "choir",
  "womens-fellowship",
  "mens-fellowship",
  "prayer-fellowship",
  "other-fellowships",
] as const;

export interface FellowshipCommitteeMember {
  id: string;
  name: LocalizedText;
  designation: LocalizedText;
  image?: ImageAsset;
}

export interface Fellowship extends BaseEntity {
  slug: FellowshipSlug;
  name: LocalizedText;
  tagline: LocalizedText;
  about: LocalizedText[];
  vision: LocalizedText;
  /** Human-readable meeting schedule, e.g. "Every Sunday, 4:00 PM". */
  schedule: LocalizedText;
  memberCount?: number;
  banner: ImageAsset;
  committee: FellowshipCommitteeMember[];
  coordinator: {
    name: LocalizedText;
    phone?: string;
    email?: string;
  };
  order: number;
}

/* -------------------------------------------------------------------------- */
/* Events                                                                     */
/* -------------------------------------------------------------------------- */

export type EventStatus = "upcoming" | "ongoing" | "past";

export interface ChurchEvent extends BaseEntity {
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText[];
  /** ISO 8601 datetime. */
  startDate: string;
  endDate?: string;
  location: LocalizedText;
  image?: ImageAsset;
  /** Links the event to a fellowship, when one is hosting it. */
  fellowshipSlug?: FellowshipSlug;
  organiser?: LocalizedText;
  featured: boolean;
  /** Search-engine title, description and keywords. */
  seo?: SeoMeta;
}

/* -------------------------------------------------------------------------- */
/* Event blog                                                                 */
/* -------------------------------------------------------------------------- */

export interface BlogPost extends BaseEntity {
  title: LocalizedText;
  excerpt: LocalizedText;
  body: LocalizedText[];
  /** ISO date. */
  publishedAt: string;
  author: LocalizedText;
  coverImage?: ImageAsset;
  /** Links the post back to the event it reports on. */
  eventSlug?: string;
  fellowshipSlug?: FellowshipSlug;
  /** Estimated reading time in minutes, computed by the CMS. */
  readingMinutes?: number;
  /** Search-engine title, description and keywords. */
  seo?: SeoMeta;
}

/* -------------------------------------------------------------------------- */
/* Gallery                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A playable clip attached to a gallery item. `url` is either a direct file
 * (mp4/webm), which plays inline through the HTML5 player, or a YouTube/Vimeo
 * link, which is embedded. `provider` is inferred from the URL when omitted.
 */
export interface GalleryVideo {
  url: string;
  provider?: "file" | "youtube" | "vimeo";
}

export const VIDEO_PROVIDERS = ["file", "youtube", "vimeo"] as const;

/**
 * One item in a gallery: a photograph, or - when `video` is set - a video whose
 * `image` is its poster/thumbnail. Modelling both as one type keeps albums a
 * single ordered stream the lightbox can page through.
 */
export interface GalleryPhoto {
  id: string;
  image: ImageAsset;
  caption?: LocalizedTextOptional;
  video?: GalleryVideo;
}

export interface GalleryAlbum extends BaseEntity {
  title: LocalizedText;
  description?: LocalizedText;
  /** ISO date the album's event took place. */
  date: string;
  cover: ImageAsset;
  photos: GalleryPhoto[];
  /** Ties the album to a single fellowship's own events. */
  fellowshipSlug?: FellowshipSlug;
  /**
   * A common, churchwide album (e.g. Christmas or a harvest festival) that
   * shows in every fellowship's gallery rather than belonging to one. A shared
   * album needs no `fellowshipSlug`.
   */
  shared?: boolean;
  /** Search-engine title, description and keywords. */
  seo?: SeoMeta;
}

/* -------------------------------------------------------------------------- */
/* Announcements                                                              */
/* -------------------------------------------------------------------------- */

export interface Announcement extends BaseEntity {
  title: LocalizedText;
  body: LocalizedText;
  /** ISO date. */
  publishedAt: string;
  pinned: boolean;
  fellowshipSlug?: FellowshipSlug;
}

/* -------------------------------------------------------------------------- */
/* Downloads                                                                  */
/* -------------------------------------------------------------------------- */

export type DownloadCategory = "bulletin" | "form" | "document";

export const DOWNLOAD_CATEGORIES: readonly DownloadCategory[] = [
  "bulletin",
  "form",
  "document",
] as const;

export const DOWNLOAD_CATEGORY_LABELS: Record<DownloadCategory, string> = {
  bulletin: "Bulletin",
  form: "Form",
  document: "Document",
};

export interface DownloadFile extends BaseEntity {
  title: LocalizedText;
  description?: LocalizedText;
  category: DownloadCategory;
  fileUrl: string;
  /** Uppercase extension, e.g. "PDF". */
  format: string;
  /** Human-readable, e.g. "1.2 MB". */
  size: string;
  publishedAt: string;
  fellowshipSlug?: FellowshipSlug;
}

/* -------------------------------------------------------------------------- */
/* Misc home-page content                                                     */
/* -------------------------------------------------------------------------- */

export interface PastorMessage {
  authorName: LocalizedText;
  authorRole: LocalizedText;
  authorImage?: ImageAsset;
  excerpt: LocalizedText;
  body: LocalizedText[];
}

export interface WeeklyVerse {
  reference: LocalizedText;
  text: LocalizedText;
  /** ISO date of the week this verse belongs to. */
  weekOf: string;
}

/* -------------------------------------------------------------------------- */
/* Contact                                                                    */
/* -------------------------------------------------------------------------- */

export interface ContactFormValues {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface ContactSubmissionResult {
  success: boolean;
  /** Translation key the UI should surface, not a raw message. */
  messageKey: string;
}
