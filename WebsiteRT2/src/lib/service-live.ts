import { clockMinutes } from "@/lib/service-time";
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
