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
