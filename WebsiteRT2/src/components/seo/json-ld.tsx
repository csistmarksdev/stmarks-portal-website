import { CHURCH_PROFILE } from "@/content/church";
import { SITE_CONFIG } from "@/constants/site";
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import { localePath, shareImageUrl, videoSources } from "@/lib/seo";
import type { SeoMeta } from "@/types/common";
import type { BlogPost, ChurchEvent } from "@/types/content";

/**
 * Structured data (F-043): Church on the home page, Event on event pages,
 * Article on posts, and a breadcrumb trail on detail pages.
 *
 * Only facts the site already publishes and the church has not disputed go in.
 * `telephone` and `openingHoursSpecification` are deliberately absent: the
 * office phone (F-007) and the service timetable (F-010) are awaiting the
 * church office. Add them here once they are confirmed.
 */

type Json = Record<string, unknown>;

export function JsonLd({ data }: { data: Json | Json[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

const abs = (path: string) =>
  path.startsWith("http") ? path : `${SITE_CONFIG.url}${path === "/" ? "" : path}`;

const image = (url: string | undefined) => {
  const share = shareImageUrl(url);
  return share ? abs(share) : undefined;
};

function churchAddress(locale: Locale): Json {
  const a = CHURCH_PROFILE.address;
  return {
    "@type": "PostalAddress",
    streetAddress: localize(a.lines, locale),
    addressLocality: `Madipakkam, ${localize(a.city, "en")}`,
    postalCode: a.postalCode,
    addressRegion: localize(a.state, "en"),
    addressCountry: "IN",
  };
}

/** Real social profiles only - the bare instagram.com link is not one (F-102). */
const SAME_AS = CHURCH_PROFILE.socials
  .map((s) => s.url)
  .filter((url) => !/^https?:\/\/(www\.)?instagram\.com\/?$/.test(url));

export function churchJsonLd(locale: Locale): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Church",
    "@id": `${SITE_CONFIG.url}/#church`,
    name: CHURCH_PROFILE.name.en,
    alternateName: CHURCH_PROFILE.name.ta,
    url: abs(localePath("/", locale)),
    image: abs(SITE_CONFIG.ogImage),
    address: churchAddress(locale),
    geo: {
      "@type": "GeoCoordinates",
      latitude: CHURCH_PROFILE.address.latitude,
      longitude: CHURCH_PROFILE.address.longitude,
    },
    hasMap: CHURCH_PROFILE.address.mapsUrl,
    ...(CHURCH_PROFILE.phone[0] ? { telephone: CHURCH_PROFILE.phone[0] } : {}),
    ...(CHURCH_PROFILE.email[0] ? { email: CHURCH_PROFILE.email[0] } : {}),
    sameAs: SAME_AS,
    parentOrganization: {
      "@type": "Organization",
      name: "CSI Diocese of Madras",
      url: "https://www.csidioceseofmadras.com/",
    },
  };
}

const location = (event: ChurchEvent, locale: Locale): Json => ({
  "@type": "Place",
  name: `${localize(event.location, locale)} - ${CHURCH_PROFILE.name.en}`,
  address: churchAddress(locale),
});

export function eventJsonLd(event: ChurchEvent, locale: Locale, path: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: localize(event.title, locale),
    description: localize(event.summary, locale),
    startDate: event.startDate,
    ...(event.endDate ? { endDate: event.endDate } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: location(event, locale),
    ...(event.image ? { image: [image(event.image.url)] } : {}),
    organizer: { "@id": `${SITE_CONFIG.url}/#church`, "@type": "Church", name: CHURCH_PROFILE.name.en },
    url: abs(localePath(path, locale)),
    inLanguage: locale === "ta" ? "ta-IN" : "en-IN",
  };
}

export function articleJsonLd(post: BlogPost, locale: Locale, path: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: localize(post.title, locale),
    description: localize(post.excerpt, locale),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: { "@type": "Person", name: localize(post.author, locale) },
    publisher: { "@id": `${SITE_CONFIG.url}/#church`, "@type": "Church", name: CHURCH_PROFILE.name.en },
    ...(post.coverImage ? { image: [image(post.coverImage.url)] } : {}),
    mainEntityOfPage: abs(localePath(path, locale)),
    inLanguage: locale === "ta" ? "ta-IN" : "en-IN",
  };
}

/**
 * VideoObject for a page's share video, so it can appear in video search.
 * Google needs a name, a thumbnail and an upload date; without a picture of
 * any kind there is nothing to show, so no object is emitted.
 */
export function videoJsonLd(
  video: SeoMeta["video"],
  meta: { title: string; description?: string; image?: string; uploadDate: string },
  locale: Locale,
  path: string,
): Json | null {
  const sources = videoSources(video);
  const thumbnail = image(meta.image) ?? sources?.thumbnailUrl;
  if (!sources || !thumbnail) return null;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: meta.title,
    description: meta.description || meta.title,
    thumbnailUrl: [thumbnail],
    uploadDate: meta.uploadDate,
    ...(sources.embedUrl ? { embedUrl: sources.embedUrl } : {}),
    ...(sources.contentUrl ? { contentUrl: sources.contentUrl } : {}),
    url: abs(localePath(path, locale)),
    inLanguage: locale === "ta" ? "ta-IN" : "en-IN",
  };
}

/** `videoJsonLd` as a list — empty when there is no video — for spreading. */
export function pageVideoJsonLd(
  seo: SeoMeta | undefined,
  meta: { title: string; description?: string; image?: string; uploadDate: string },
  locale: Locale,
  path: string,
): Json[] {
  const json = seo?.video ? videoJsonLd(seo.video, meta, locale, path) : null;
  return json ? [json] : [];
}

/** `trail` is [label, path] from the top, ending with the page itself. */
export function breadcrumbJsonLd(
  trail: [string, string][],
  locale: Locale,
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: abs(localePath(path, locale)),
    })),
  };
}
