import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SITE_CONFIG } from "@/constants/site";
import { defaultLocale, locales, type Locale } from "@/i18n/routing";
import type { SeoMeta } from "@/types/common";

/**
 * Per-page metadata: self-referencing canonical, hreflang pair and Open Graph.
 *
 * F-002: every inner page used to inherit the root layout's `alternates`, so
 * ~60 inner URLs declared the home page as their canonical. Metadata merges
 * shallowly in the App Router, so each route now sets `alternates` and
 * `openGraph` for itself through this helper and the layout sets neither.
 *
 * F-016: og:url, og:locale and og:locale:alternate on every page, a default
 * share image, and CMS images routed through the HTTPS image optimiser so a
 * share preview never points at the Portal's plain-HTTP origin.
 */

/** `/events` in `ta` → `/events`; in `en` → `/en/events`. `/` → `/` / `/en`. */
export function localePath(path: string, locale: Locale): string {
  const clean = path === "/" ? "" : path;
  if (locale === defaultLocale) return clean || "/";
  return `/${locale}${clean}`;
}

/** hreflang map for a path: ta, en, and x-default → Tamil. */
export function languageAlternates(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(locales.map((l) => [l, localePath(path, l)])),
    "x-default": localePath(path, defaultLocale),
  };
}

/**
 * A share-safe image URL.
 *
 * Site-relative files (`/og/default.jpg`) are used as they are. Absolute URLs on
 * another host - the Portal's `/uploads/**` - go through `/_next/image`, which
 * serves them over the site's own HTTPS origin.
 */
export function shareImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.origin === new URL(SITE_CONFIG.url).origin) return parsed.pathname;
  } catch {
    return undefined;
  }
  return `/_next/image?url=${encodeURIComponent(url)}&w=1200&q=75`;
}

export interface PageMetadataInput {
  locale: Locale;
  /** Path without locale prefix, e.g. `/events/christmas-carol-service-2026`. */
  path: string;
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  authors?: string[];
  /** Meta keywords, as set in the Portal. */
  keywords?: string[];
  /** og:video — a share video set in the Portal. */
  video?: SeoMeta["video"];
  /**
   * The title is a complete headline the writer chose in the Portal's
   * "SEO title": used as it is, without the " · St. Mark's" every other page
   * gets from the layout's title template.
   */
  titleIsCustom?: boolean;
}

const YOUTUBE_ID = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/;
const VIMEO_ID = /vimeo\.com\/(?:video\/)?(\d+)/;

/**
 * Where a share video can be played and pictured: the embeddable player for
 * YouTube/Vimeo, the file itself otherwise, plus a YouTube still.
 */
export function videoSources(video: SeoMeta["video"]):
  | { embedUrl?: string; contentUrl?: string; thumbnailUrl?: string }
  | undefined {
  if (!video?.url) return undefined;
  const youtube = video.url.match(YOUTUBE_ID)?.[1];
  if (youtube) {
    return {
      embedUrl: `https://www.youtube.com/embed/${youtube}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${youtube}/hqdefault.jpg`,
    };
  }
  const vimeo = video.url.match(VIMEO_ID)?.[1];
  if (vimeo) return { embedUrl: `https://player.vimeo.com/video/${vimeo}` };
  return { contentUrl: video.url };
}

/**
 * Title, description and keywords for a CMS record's page: what the writer set
 * under "Search engines" in the Portal, in this page's language, else the
 * record's own title and summary.
 */
export function recordSeo(
  seo: SeoMeta | undefined,
  locale: Locale,
  fallback: { title: string; description?: string; image?: string },
): {
  title: string;
  titleIsCustom: boolean;
  description?: string;
  keywords?: string[];
  image?: string;
  video?: SeoMeta["video"];
} {
  const custom = seo?.title?.[locale]?.trim();
  const title = custom || fallback.title;
  const description = seo?.description?.[locale]?.trim() || fallback.description;
  const keywords = seo?.keywords?.filter(Boolean);
  // A chosen share image wins; then the record's own; then a YouTube still.
  const image =
    seo?.image?.url ?? fallback.image ?? videoSources(seo?.video)?.thumbnailUrl;
  return {
    title,
    titleIsCustom: !!custom,
    description,
    ...(keywords?.length ? { keywords } : {}),
    ...(image ? { image } : {}),
    ...(seo?.video?.url ? { video: seo.video } : {}),
  };
}

export async function pageMetadata({
  locale,
  path,
  title,
  description,
  image,
  type = "website",
  publishedTime,
  authors,
  keywords,
  video,
  titleIsCustom = false,
}: PageMetadataInput): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "site" });
  const siteName = t("name");
  const ogTitle = title ?? siteName;
  const ogDescription = description ?? t("description");
  const url = localePath(path, locale);
  const sources = videoSources(video);
  // A hosted video is shared as its embeddable player page; a file as itself.
  const ogVideo = sources?.embedUrl
    ? { url: sources.embedUrl, type: "text/html", width: 1280, height: 720 }
    : sources?.contentUrl
      ? { url: sources.contentUrl, width: 1280, height: 720 }
      : undefined;
  const imageUrl = shareImageUrl(image) ?? SITE_CONFIG.ogImage;
  const images = [
    imageUrl === SITE_CONFIG.ogImage
      ? { url: imageUrl, width: 1200, height: 630, alt: siteName }
      : { url: imageUrl, alt: ogTitle },
  ];

  return {
    ...(title ? { title: titleIsCustom ? { absolute: title } : title } : {}),
    ...(description ? { description } : {}),
    ...(keywords?.length ? { keywords } : {}),
    alternates: {
      canonical: url,
      languages: languageAlternates(path),
    },
    openGraph: {
      type,
      siteName,
      url,
      title: ogTitle,
      description: ogDescription,
      locale: SITE_CONFIG.locale[locale],
      alternateLocale: locales
        .filter((l) => l !== locale)
        .map((l) => SITE_CONFIG.locale[l]),
      images,
      ...(ogVideo ? { videos: [ogVideo] } : {}),
      ...(type === "article" && publishedTime ? { publishedTime } : {}),
      ...(type === "article" && authors?.length ? { authors } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [imageUrl],
    },
  };
}
