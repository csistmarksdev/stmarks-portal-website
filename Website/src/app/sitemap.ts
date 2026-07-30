import type { MetadataRoute } from "next";

import { ROUTES, SITE_CONFIG } from "@/constants/site";
import { defaultLocale, locales } from "@/i18n/routing";
import {
  getAlbumSlugs,
  getBlogSlugs,
  getEventSlugs,
  getFellowshipSlugs,
} from "@/services";

/** Build a locale-prefixed absolute URL (default locale has no prefix). */
function url(path: string, locale: string): string {
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  const suffix = path === "/" ? "" : path;
  return `${SITE_CONFIG.url}${prefix}${suffix}`;
}

/** Alternate-language links for a path, as required for hreflang. */
function alternates(path: string) {
  return {
    languages: Object.fromEntries(
      locales.map((locale) => [locale, url(path, locale)]),
    ),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [fellowshipSlugs, eventSlugs, albumSlugs, blogSlugs] =
    await Promise.all([
      getFellowshipSlugs(),
      getEventSlugs(),
      getAlbumSlugs(),
      getBlogSlugs(),
    ]);

  const staticPaths: { path: string; priority: number; freq: "daily" | "weekly" | "monthly" }[] = [
    { path: ROUTES.home, priority: 1, freq: "weekly" },
    { path: ROUTES.about, priority: 0.8, freq: "monthly" },
    { path: ROUTES.leadership, priority: 0.7, freq: "monthly" },
    { path: ROUTES.fellowships, priority: 0.8, freq: "monthly" },
    { path: ROUTES.events, priority: 0.9, freq: "weekly" },
    { path: ROUTES.gallery, priority: 0.7, freq: "weekly" },
    { path: ROUTES.announcements, priority: 0.9, freq: "daily" },
    { path: ROUTES.downloads, priority: 0.6, freq: "weekly" },
    { path: ROUTES.contact, priority: 0.7, freq: "monthly" },
    { path: ROUTES.blog, priority: 0.7, freq: "weekly" },
  ];

  const dynamicPaths = [
    ...fellowshipSlugs.map((slug) => ROUTES.fellowship(slug)),
    ...eventSlugs.map((slug) => ROUTES.event(slug)),
    ...albumSlugs.map((slug) => ROUTES.album(slug)),
    ...blogSlugs.map((slug) => ROUTES.blogPost(slug)),
  ];

  const lastModified = new Date();

  return [
    ...staticPaths.flatMap(({ path, priority, freq }) =>
      locales.map((locale) => ({
        url: url(path, locale),
        lastModified,
        changeFrequency: freq,
        priority,
        alternates: alternates(path),
      })),
    ),
    ...dynamicPaths.flatMap((path) =>
      locales.map((locale) => ({
        url: url(path, locale),
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: alternates(path),
      })),
    ),
  ];
}
