import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SITE_CONFIG } from "@/constants/site";
import { defaultLocale, locales, type Locale } from "@/i18n/routing";

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
}: PageMetadataInput): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "site" });
  const siteName = t("name");
  const ogTitle = title ?? siteName;
  const ogDescription = description ?? t("description");
  const url = localePath(path, locale);
  const imageUrl = shareImageUrl(image) ?? SITE_CONFIG.ogImage;
  const images = [
    imageUrl === SITE_CONFIG.ogImage
      ? { url: imageUrl, width: 1200, height: 630, alt: siteName }
      : { url: imageUrl, alt: ogTitle },
  ];

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
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
