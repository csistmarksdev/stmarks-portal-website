import type {
  BaseEntity,
  ImageAsset,
  LocalizedText,
  LocalizedTextOptional,
  SocialLink,
} from "./common";

/* -------------------------------------------------------------------------- */
/* Church profile                                                             */
/* -------------------------------------------------------------------------- */

export interface ServiceTiming {
  id: string;
  day: LocalizedText;
  time: LocalizedText;
  service: LocalizedText;
  venue: LocalizedText;
}

export interface ChurchAddress {
  lines: LocalizedText;
  city: LocalizedText;
  state: LocalizedText;
  postalCode: string;
  country: LocalizedText;
  mapsUrl: string;
  embedUrl: string;
  latitude: number;
  longitude: number;
}

export interface ChurchProfile {
  name: LocalizedText;
  address: ChurchAddress;
  phone: string[];
  email: string[];
  officeHours: LocalizedText;
  socials: SocialLink[];
}

/* -------------------------------------------------------------------------- */
/* About                                                                      */
/* -------------------------------------------------------------------------- */

export interface HistoryMilestone {
  id: string;
  year: string;
  title: LocalizedText;
  description: LocalizedText;
}

export interface ChurchHistory {
  intro: LocalizedText;
  body: LocalizedText[];
  milestones: HistoryMilestone[];
  image?: ImageAsset;
}

export interface ChurchValue {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
}

export interface VisionMission {
  vision: LocalizedText;
  mission: LocalizedText;
  values: ChurchValue[];
}

export interface DioceseInfo {
  name: LocalizedText;
  description: LocalizedText[];
  bishop: LocalizedText;
  websiteUrl: string;
  image?: ImageAsset;
}

/* -------------------------------------------------------------------------- */
/* Leadership                                                                 */
/* -------------------------------------------------------------------------- */

export type LeaderRole =
  | "pastor"
  | "assistant-pastor"
  | "committee"
  /** Employed by the church rather than elected to the committee. */
  | "staff"
  | "former-pastor";

export interface Leader extends BaseEntity {
  name: LocalizedText;
  role: LeaderRole;
  /** Displayed title, e.g. "Presbyter-in-charge" / "Secretary". */
  designation: LocalizedText;
  bio?: LocalizedText;
  image?: ImageAsset;
  email?: string;
  phone?: string;
  /** ISO year the person began serving. */
  servingSince?: string;
  /** Only meaningful for `former-pastor`. */
  tenureFrom?: string;
  tenureTo?: string;
  /** Controls display order within a role group. */
  order: number;
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
}

/* -------------------------------------------------------------------------- */
/* Event blog                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A written piece about church life — a report on an event, a reflection, a
 * testimony. Authored in the CMS and served by the API; `body` is an ordered
 * list of paragraphs so it maps cleanly onto a rich-text field later.
 */
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

/**
 * One item in a gallery: a photograph, or — when `video` is set — a video whose
 * `image` is its poster/thumbnail. Modelling both as one type keeps albums a
 * single ordered stream the lightbox can page through, the way Google Photos
 * mixes stills and clips.
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
   * shows in every fellowship's gallery rather than belonging to one. Set by
   * the admin in the portal; a shared album needs no `fellowshipSlug`.
   */
  shared?: boolean;
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
