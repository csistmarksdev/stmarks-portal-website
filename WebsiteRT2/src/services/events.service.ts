import { EVENTS } from "@/data/events.mock";
import { getEventStatus } from "@/lib/date";
import type { ChurchEvent, FellowshipSlug } from "@/types/content";

import { apiGet, apiGetOrNull } from "./http";

const ascending = (a: ChurchEvent, b: ChurchEvent) =>
  new Date(a.startDate).getTime() - new Date(b.startDate).getTime();

const descending = (a: ChurchEvent, b: ChurchEvent) => -ascending(a, b);

/** Cache tag - revalidate this when the Portal publishes an event. */
const TAGS = ["events"];

export function getEvents(): Promise<ChurchEvent[]> {
  return apiGet<ChurchEvent[]>("/events", {
    tags: TAGS,
    fallback: () => [...EVENTS].sort(descending),
  });
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
    params: { status: "upcoming", limit },
    tags: TAGS,
    fallback: () => {
      const upcoming = EVENTS.filter(
        (e) => getEventStatus(e, now) !== "past",
      ).sort(ascending);
      return limit ? upcoming.slice(0, limit) : upcoming;
    },
  });
}

export function getPastEvents(
  limit?: number,
  now: Date = new Date(),
): Promise<ChurchEvent[]> {
  return apiGet<ChurchEvent[]>("/events", {
    params: { status: "past", limit },
    tags: TAGS,
    fallback: () => {
      const past = EVENTS.filter((e) => getEventStatus(e, now) === "past").sort(
        descending,
      );
      return limit ? past.slice(0, limit) : past;
    },
  });
}

export function getEventBySlug(slug: string): Promise<ChurchEvent | null> {
  return apiGetOrNull<ChurchEvent>(`/events/${slug}`, {
    tags: TAGS,
    fallback: () => EVENTS.find((e) => e.slug === slug) ?? null,
  });
}

export function getEventsByFellowship(
  fellowshipSlug: FellowshipSlug,
): Promise<ChurchEvent[]> {
  return apiGet<ChurchEvent[]>("/events", {
    params: { fellowship: fellowshipSlug },
    tags: TAGS,
    fallback: () =>
      EVENTS.filter((e) => e.fellowshipSlug === fellowshipSlug).sort(ascending),
  });
}

/** Slugs for `generateStaticParams`. */
export function getEventSlugs(): Promise<string[]> {
  return apiGet<string[]>("/events/slugs", {
    tags: TAGS,
    fallback: () => EVENTS.map((e) => e.slug),
  });
}
