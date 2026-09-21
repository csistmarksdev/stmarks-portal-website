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

  /*
   * One route, because the site is one route.
   *
   * About, leadership, fellowships, events, the blog index, the gallery,
   * announcements, downloads and contact are chapters of `/`, not pages, and a
   * sitemap that lists `/#about` as a URL is listing the home page nine times.
   * The three archives are the exceptions and are listed below on their own. The old paths still answer - as redirects - and a sitemap should
   * never advertise a redirect. So the fragments are simply left out: search
   * engines index the page they belong to, which is the one entry below.
   */
  const staticPaths: { path: string; priority: number; freq: "daily" | "weekly" | "monthly" }[] = [
    // Everything the parish publishes, apart from the three archives and the
    // detail pages below, is on this one URL - hence the daily frequency it
    // inherits from the announcements it carries.
    { path: ROUTES.home, priority: 1, freq: "daily" },
    // The three archives are their own URLs: the home page carries only the
    // most recent few of each, so these are the only addresses at which the
    // rest exist.
    { path: ROUTES.eventArchive, priority: 0.7, freq: "weekly" },
    { path: ROUTES.blogArchive, priority: 0.7, freq: "weekly" },
    { path: ROUTES.albumArchive, priority: 0.6, freq: "monthly" },
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
