import type { MetadataRoute } from "next";

import { ROUTES, SITE_CONFIG } from "@/constants/site";
import { defaultLocale, locales, type Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import { videoSources } from "@/lib/seo";
import {
  getAlbumSlugs,
  getBlogPosts,
  getBlogSlugs,
  getEvents,
  getEventSlugs,
  getFellowships,
  getFellowshipSlugs,
  getGallery,
} from "@/services";
import type { ImageAsset, LocalizedText, SeoMeta } from "@/types/common";

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

/** An image's own address — the Portal's readable file name, which image search reads. */
function imageUrl(image: ImageAsset | undefined): string | undefined {
  if (!image?.url) return undefined;
  return image.url.startsWith("/") ? `${SITE_CONFIG.url}${image.url}` : image.url;
}

const unique = (urls: (string | undefined)[]) =>
  [...new Set(urls.filter((u): u is string => !!u))];

type SitemapVideo = NonNullable<MetadataRoute.Sitemap[number]["videos"]>[number];

/**
 * A sitemap video entry, or nothing when Google could not use it: every
 * entry needs a thumbnail and either the file or an embeddable player.
 */
function video(
  source: SeoMeta["video"] | undefined,
  meta: { title: string; description?: string; thumbnail?: string; published?: string },
): SitemapVideo | undefined {
  const where = videoSources(source);
  const thumbnail = meta.thumbnail ?? where?.thumbnailUrl;
  if (!where || !thumbnail || !meta.title) return undefined;
  return {
    title: meta.title,
    description: meta.description || meta.title,
    thumbnail_loc: thumbnail,
    ...(where.contentUrl ? { content_loc: where.contentUrl } : {}),
    ...(where.embedUrl ? { player_loc: where.embedUrl } : {}),
    ...(meta.published ? { publication_date: meta.published } : {}),
  };
}

interface PageEntry {
  path: string;
  lastModified?: string | Date;
  images?: string[];
  /** Per locale, since titles and descriptions are bilingual. */
  videos?: (locale: Locale) => SitemapVideo[];
}

const latest = (dates: (string | undefined)[]): Date | undefined => {
  const times = dates.map((d) => (d ? Date.parse(d) : NaN)).filter((t) => !Number.isNaN(t));
  return times.length ? new Date(Math.max(...times)) : undefined;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [
    fellowshipSlugs,
    eventSlugs,
    albumSlugs,
    blogSlugs,
    fellowships,
    events,
    albums,
    posts,
  ] = await Promise.all([
    getFellowshipSlugs(),
    getEventSlugs(),
    getAlbumSlugs(),
    getBlogSlugs(),
    getFellowships(),
    getEvents(),
    getGallery(),
    getBlogPosts(),
  ]);

  /*
   * The slug lists decide which pages exist (they already leave out anything
   * unpublished or withheld); the full records add when each page last
   * changed and the pictures and videos on it.
   */
  const fellowshipBySlug = new Map(fellowships.map((f) => [f.slug, f]));
  const eventBySlug = new Map(events.map((e) => [e.slug, e]));
  const albumBySlug = new Map(albums.map((a) => [a.slug, a]));
  const postBySlug = new Map(posts.map((p) => [p.slug, p]));

  const text = (field: LocalizedText | undefined, locale: Locale) =>
    field ? localize(field, locale) : "";

  const pages: PageEntry[] = [
    ...fellowshipSlugs.map((slug): PageEntry => {
      const fellowship = fellowshipBySlug.get(slug);
      return {
        path: ROUTES.fellowship(slug),
        lastModified: fellowship?.updatedAt,
        images: unique([imageUrl(fellowship?.banner)]),
      };
    }),
    ...eventSlugs.map((slug): PageEntry => {
      const event = eventBySlug.get(slug);
      return {
        path: ROUTES.event(slug),
        lastModified: event?.updatedAt,
        images: unique([imageUrl(event?.seo?.image), imageUrl(event?.image)]),
        videos: (locale) => {
          const v =
            event &&
            video(event.seo?.video, {
              title: text(event.title, locale),
              description: text(event.summary, locale),
              thumbnail: imageUrl(event.seo?.image ?? event.image),
              published: event.updatedAt,
            });
          return v ? [v] : [];
        },
      };
    }),
    ...blogSlugs.map((slug): PageEntry => {
      const post = postBySlug.get(slug);
      return {
        path: ROUTES.blogPost(slug),
        lastModified: post?.updatedAt ?? post?.publishedAt,
        images: unique([imageUrl(post?.seo?.image), imageUrl(post?.coverImage)]),
        videos: (locale) => {
          const v =
            post &&
            video(post.seo?.video, {
              title: text(post.title, locale),
              description: text(post.excerpt, locale),
              thumbnail: imageUrl(post.seo?.image ?? post.coverImage),
              published: post.publishedAt,
            });
          return v ? [v] : [];
        },
      };
    }),
    ...albumSlugs.map((slug): PageEntry => {
      const album = albumBySlug.get(slug);
      return {
        path: ROUTES.album(slug),
        lastModified: album?.updatedAt,
        // Every photo in the album, and every video's poster.
        images: unique([
          imageUrl(album?.cover),
          ...(album?.photos ?? []).map((photo) => imageUrl(photo.image)),
        ]),
        videos: (locale) => {
          if (!album) return [];
          const title = text(album.title, locale);
          const description = album.description ? text(album.description, locale) : title;
          return (album.photos ?? [])
            .filter((photo) => photo.video?.url)
            .map((photo, i, all) =>
              video(photo.video, {
                title: all.length > 1 ? `${title} — ${i + 1}` : title,
                description: photo.caption?.[locale] || description,
                thumbnail: imageUrl(photo.image),
                published: album.date,
              }),
            )
            .filter((v): v is SitemapVideo => !!v);
        },
      };
    }),
  ];

  /*
   * One route, because the site is one route.
   *
   * About, leadership, fellowships, events, the blog index, the gallery,
   * announcements, downloads and contact are chapters of `/`, not pages, and a
   * sitemap that lists `/#about` as a URL is listing the home page nine times.
   * The three archives are the exceptions and are listed below on their own. The old paths still answer - as redirects - and a sitemap should
   * never advertise a redirect. So the fragments are simply left out: search
   * engines index the page they belong to, which is the one entry below.
   *
   * Each changes whenever something it lists does, so it carries the newest
   * of those dates rather than the build time.
   */
  const staticPaths: {
    path: string;
    priority: number;
    freq: "daily" | "weekly" | "monthly";
    lastModified?: Date;
  }[] = [
    // Everything the parish publishes, apart from the three archives and the
    // detail pages below, is on this one URL - hence the daily frequency it
    // inherits from the announcements it carries.
    {
      path: ROUTES.home,
      priority: 1,
      freq: "daily",
      lastModified: latest(pages.map((p) => p.lastModified?.toString())),
    },
    // The three archives are their own URLs: the home page carries only the
    // most recent few of each, so these are the only addresses at which the
    // rest exist.
    {
      path: ROUTES.eventArchive,
      priority: 0.7,
      freq: "weekly",
      lastModified: latest(events.map((e) => e.updatedAt)),
    },
    {
      path: ROUTES.blogArchive,
      priority: 0.7,
      freq: "weekly",
      lastModified: latest(posts.map((p) => p.updatedAt ?? p.publishedAt)),
    },
    {
      path: ROUTES.albumArchive,
      priority: 0.6,
      freq: "monthly",
      lastModified: latest(albums.map((a) => a.updatedAt)),
    },
  ];

  const builtAt = new Date();

  return [
    ...staticPaths.flatMap(({ path, priority, freq, lastModified }) =>
      locales.map((locale) => ({
        url: url(path, locale),
        lastModified: lastModified ?? builtAt,
        changeFrequency: freq,
        priority,
        alternates: alternates(path),
      })),
    ),
    ...pages.flatMap((page) =>
      locales.map((locale) => {
        const videos = page.videos?.(locale) ?? [];
        return {
          url: url(page.path, locale),
          lastModified: page.lastModified ?? builtAt,
          changeFrequency: "monthly" as const,
          priority: 0.6,
          alternates: alternates(page.path),
          ...(page.images?.length ? { images: page.images } : {}),
          ...(videos.length ? { videos } : {}),
        };
      }),
    ),
  ];
}
