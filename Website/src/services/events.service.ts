import { EVENTS } from "@/data/events.mock";
import { getEventStatus } from "@/lib/date";
import type { ChurchEvent, FellowshipSlug } from "@/types/content";

import { mockResponse } from "./http";

const ascending = (a: ChurchEvent, b: ChurchEvent) =>
  new Date(a.startDate).getTime() - new Date(b.startDate).getTime();

const descending = (a: ChurchEvent, b: ChurchEvent) => -ascending(a, b);

export function getEvents(): Promise<ChurchEvent[]> {
  return mockResponse([...EVENTS].sort(descending));
}

export function getUpcomingEvents(
  limit?: number,
  now: Date = new Date(),
): Promise<ChurchEvent[]> {
  const upcoming = EVENTS.filter(
    (e) => getEventStatus(e, now) !== "past",
  ).sort(ascending);

  return mockResponse(limit ? upcoming.slice(0, limit) : upcoming);
}

export function getPastEvents(
  limit?: number,
  now: Date = new Date(),
): Promise<ChurchEvent[]> {
  const past = EVENTS.filter((e) => getEventStatus(e, now) === "past").sort(
    descending,
  );

  return mockResponse(limit ? past.slice(0, limit) : past);
}

export function getEventBySlug(slug: string): Promise<ChurchEvent | null> {
  return mockResponse(EVENTS.find((e) => e.slug === slug) ?? null);
}

export function getEventsByFellowship(
  fellowshipSlug: FellowshipSlug,
): Promise<ChurchEvent[]> {
  return mockResponse(
    EVENTS.filter((e) => e.fellowshipSlug === fellowshipSlug).sort(ascending),
  );
}

/** Slugs for `generateStaticParams`. */
export function getEventSlugs(): Promise<string[]> {
  return mockResponse(EVENTS.map((e) => e.slug));
}
