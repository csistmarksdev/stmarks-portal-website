import type { Locale } from "@/i18n/routing";
import { clockMinutes, formatInstantTime } from "@/lib/service-time";
import type { ServiceTiming } from "@/types/content";

/**
 * Whether a service is in progress right now - for the hero strip, which
 * shows only what is live.
 *
 * Everything is read in the church's time zone, whatever the visitor's: a
 * service is live when today (in Chennai) is its day, today's week of the
 * month is one it is held on (when weeks are set), and the time is between
 * its start and end. A service with no end time counts as live for
 * `OPEN_ENDED_MINUTES` from its start.
 */

/** How long a service with no end time is treated as running. */
export const OPEN_ENDED_MINUTES = 120;

const DAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** The date and time in Chennai: weekday, day of month, month length, minutes past midnight. */
function nowInChennai(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  return {
    weekday: WEEKDAY_INDEX[parts.weekday],
    dayOfMonth: Number(parts.day),
    daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate(),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function isLiveNow(timing: ServiceTiming, now: Date = new Date()): boolean {
  const day = DAY_INDEX[timing.day.en];
  const clock = clockMinutes(timing);
  if (day === undefined || !clock) return false;

  const today = nowInChennai(now);
  if (today.weekday !== day) return false;

  if (timing.weeks?.length) {
    const nth = Math.ceil(today.dayOfMonth / 7);
    const isLast = today.dayOfMonth + 7 > today.daysInMonth;
    if (!timing.weeks.includes(nth) && !(isLast && timing.weeks.includes(-1))) return false;
  }

  const end = clock.end !== null && clock.end > clock.start ? clock.end : clock.start + OPEN_ENDED_MINUTES;
  return today.minutes >= clock.start && today.minutes < end;
}

/* --------------------------------- Events --------------------------------- */

/** What the strip needs of a Portal event - kept small, it is sent to the browser. */
export interface LiveEvent {
  id: string;
  slug: string;
  title: ServiceTiming["service"];
  location: ServiceTiming["venue"];
  /** ISO 8601. */
  startDate: string;
  endDate?: string;
}

/** An event's end: its own, or `OPEN_ENDED_MINUTES` after its start when it has none. */
function eventEnd(event: LiveEvent): number {
  const start = new Date(event.startDate).getTime();
  const end = event.endDate ? new Date(event.endDate).getTime() : Number.NaN;
  return Number.isFinite(end) && end > start ? end : start + OPEN_ENDED_MINUTES * 60_000;
}

/** Whether a Portal event is under way: from its start until its end. */
export function isEventLiveNow(event: LiveEvent, now: Date = new Date()): boolean {
  const start = new Date(event.startDate).getTime();
  return Number.isFinite(start) && now.getTime() >= start && now.getTime() < eventEnd(event);
}

const chennaiDate = (time: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(time));

/**
 * "until 10:30 AM" / "காலை 10:30 வரை"; with the date when the event ends on a
 * later day - "until 21 Dec, 10:30 AM".
 */
export function eventUntilText(event: LiveEvent, now: Date, locale: Locale): string {
  const end = eventEnd(event);
  const time = formatInstantTime(new Date(end).toISOString(), locale);
  const sameDay = chennaiDate(end) === chennaiDate(now.getTime());
  const date = sameDay
    ? ""
    : new Intl.DateTimeFormat(locale === "ta" ? "ta-IN" : "en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
      }).format(new Date(end));
  if (locale === "ta") return `${date ? `${date}, ` : ""}${time} வரை`;
  return `until ${date ? `${date}, ` : ""}${time}`;
}
