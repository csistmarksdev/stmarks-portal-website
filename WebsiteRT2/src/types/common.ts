import type { Locale } from "@/i18n/routing";

/**
 * A field that the CMS/backend will return in every supported language.
 *
 * UI copy lives in `src/messages/*.json` and is read with `useTranslations`.
 * *Content* (event titles, leader bios, album names) is authored per-language
 * and travels with the record, which is how the NestJS API will shape it.
 * Resolve these with `localize()` from `@/lib/localize`.
 */
export type LocalizedText = Record<Locale, string>;

/** Optional localized field - not every record has every translation. */
export type LocalizedTextOptional = Partial<Record<Locale, string>>;

/** Every content record shares these. Mirrors a typical API entity. */
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
 * Search-engine metadata set in the Portal for a record's public page. Every
 * part is optional; the page falls back to the record's own title and summary.
 */
export interface SeoMeta {
  title?: LocalizedTextOptional;
  description?: LocalizedTextOptional;
  keywords?: string[];
  /** Share image (og:image); else the record's own cover/image. */
  image?: ImageAsset;
  /** Share video: YouTube/Vimeo link or a direct file. */
  video?: { url: string; provider?: "file" | "youtube" | "vimeo" };
}

export interface SocialLink {
  platform: "facebook" | "instagram" | "youtube" | "whatsapp" | "x";
  url: string;
}

/** Shape returned by list endpoints, so pagination needs no refactor later. */
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
