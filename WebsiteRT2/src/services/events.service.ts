import { EVENTS } from "@/data/events.mock";
import { getEventStatus } from "@/lib/date";
import type { ChurchEvent, FellowshipSlug } from "@/types/content";

import { isPlaceholderSlug, isPublishableEvent } from "./guards";
import { apiGet, apiGetOrNull } from "./http";

/** F-003/F-005: seed events and slug/date mismatches never render. */
const clean = (events: ChurchEvent[]) => events.filter(isPublishableEvent);

const take = (events: ChurchEvent[], limit?: number) => {
  const kept = clean(events);
  return limit ? kept.slice(0, limit) : kept;
};

const ascending = (a: ChurchEvent, b: ChurchEvent) =>
  new Date(a.startDate).getTime() - new Date(b.startDate).getTime();

const descending = (a: ChurchEvent, b: ChurchEvent) => -ascending(a, b);

/** Cache tag - revalidate this when the Portal publishes an event. */
const TAGS = ["events"];

export function getEvents(): Promise<ChurchEvent[]> {
  return apiGet<ChurchEvent[]>("/events", {
    tags: TAGS,
    fallback: () => [...EVENTS].sort(descending),
  }).then(clean);
}

/**
 * `now` is honoured only by the mock fallback. Against the API the server
 * decides what counts as upcoming, which is the right authority: it is the
 * clock the Portal publishes against, and it does not drift per visitor.
 */
export function getUpcomingEvents(
  limit?: number,
  now: Date = new Date(),
): Promise<ChurchEvent[]> {
  return apiGet<ChurchEvent[]>("/events", {
    params: { status: "upcoming", limit: limit ? limit + 3 : undefined },
    tags: TAGS,
    fallback: () =>
      EVENTS.filter((e) => getEventStatus(e, now) !== "past").sort(ascending),
  }).then((events) => take(events, limit));
}

export function getPastEvents(
  limit?: number,
  now: Date = new Date(),
): Promise<ChurchEvent[]> {
  return apiGet<ChurchEvent[]>("/events", {
    params: { status: "past", limit: limit ? limit + 3 : undefined },
    tags: TAGS,
    fallback: () =>
      EVENTS.filter((e) => getEventStatus(e, now) === "past").sort(descending),
  }).then((events) => take(events, limit));
}

export function getEventBySlug(slug: string): Promise<ChurchEvent | null> {
  return apiGetOrNull<ChurchEvent>(`/events/${slug}`, {
    tags: TAGS,
    fallback: () => EVENTS.find((e) => e.slug === slug) ?? null,
  }).then((event) => (event && isPublishableEvent(event) ? event : null));
}

export function getEventsByFellowship(
  fellowshipSlug: FellowshipSlug,
): Promise<ChurchEvent[]> {
  return apiGet<ChurchEvent[]>("/events", {
    params: { fellowship: fellowshipSlug },
    tags: TAGS,
    fallback: () =>
      EVENTS.filter((e) => e.fellowshipSlug === fellowshipSlug).sort(ascending),
  }).then(clean);
}

/**
 * Slugs for `generateStaticParams` and the sitemap - only those of events the
 * site will actually render, so a hidden record is neither built nor listed.
 */
export async function getEventSlugs(): Promise<string[]> {
  const [slugs, events] = await Promise.all([
    apiGet<string[]>("/events/slugs", {
      tags: TAGS,
      fallback: () => EVENTS.map((e) => e.slug),
    }),
    apiGet<ChurchEvent[]>("/events", { tags: TAGS, fallback: () => EVENTS }),
  ]);
  const hidden = new Set(
    events.filter((e) => !isPublishableEvent(e)).map((e) => e.slug),
  );
  return slugs.filter((slug) => !hidden.has(slug) && !isPlaceholderSlug(slug));
}
