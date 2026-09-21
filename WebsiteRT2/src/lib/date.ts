import type { Locale } from "@/i18n/routing";
import type { ChurchEvent, EventStatus } from "@/types/content";

const INTL_LOCALE: Record<Locale, string> = {
  en: "en-IN",
  ta: "ta-IN",
};

const TIME_ZONE = "Asia/Kolkata";

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

export function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

/** Split a date into parts, for the stacked date badge on event cards. */
export function getDateParts(iso: string, locale: Locale) {
  const date = new Date(iso);
  return {
    day: new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      day: "numeric",
      timeZone: TIME_ZONE,
    }).format(date),
    month: new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      month: "short",
      timeZone: TIME_ZONE,
    }).format(date),
    year: new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      year: "numeric",
      timeZone: TIME_ZONE,
    }).format(date),
  };
}

/**
 * Derive an event's status from its dates.
 *
 * `now` is injectable so server and client agree on the reference time and
 * pages stay deterministic during prerender.
 */
export function getEventStatus(
  event: Pick<ChurchEvent, "startDate" | "endDate">,
  now: Date = new Date(),
): EventStatus {
  const start = new Date(event.startDate).getTime();
  const end = event.endDate ? new Date(event.endDate).getTime() : start;
  const current = now.getTime();

  if (current < start) return "upcoming";
  if (current > end) return "past";
  return "ongoing";
}
