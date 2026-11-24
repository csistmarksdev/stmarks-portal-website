/**
 * Core shared shapes.
 *
 * ⚠️ These mirror `Website/src/types/common.ts` field-for-field. They are the
 * public API contract — do not change them without updating the Website in
 * the same change set.
 */

export type Locale = "en" | "ta";

export const LOCALES: readonly Locale[] = ["en", "ta"] as const;

/** A field the API returns in every supported language. */
export type LocalizedText = Record<Locale, string>;

/** Optional localized field — not every record has every translation. */
export type LocalizedTextOptional = Partial<Record<Locale, string>>;

/** Every content record shares these. */
export interface BaseEntity {
  id: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImageAsset {
  url: string;
  alt: LocalizedText;
  width: number;
  height: number;
  /** Tiny base64 preview, when the media service provides one. */
  blurDataURL?: string;
}

/**
 * Search-engine metadata a writer can set on a record with its own public
 * page (events, blog posts, gallery albums). Every part is optional: the
 * website falls back to the record's title and summary/excerpt.
 */
export interface SeoMeta {
  /** <title> and og:title. Best kept under ~60 characters. */
  title?: LocalizedTextOptional;
  /** Meta description and og:description. Best kept under ~160 characters. */
  description?: LocalizedTextOptional;
  /** Meta keywords — short phrases, lowercase. */
  keywords?: string[];
  /**
   * og:image — the picture shown when the page is shared and beside it in
   * search results. Falls back to the record's own cover/image.
   */
  image?: ImageAsset;
  /**
   * og:video and a VideoObject for video search: a YouTube/Vimeo link or a
   * direct mp4/webm file. `provider` is inferred from the URL by the API.
   */
  video?: { url: string; provider?: "file" | "youtube" | "vimeo" };
}

/** Soft limits search engines display; the CMS shows counters against them. */
export const SEO_LIMITS = {
  title: 60,
  description: 160,
  keywords: 20,
  keywordLength: 60,
} as const;

export interface SocialLink {
  platform: "facebook" | "instagram" | "youtube" | "whatsapp" | "x";
  url: string;
}

/** Shape returned by list endpoints when pagination is requested. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}
