import type { Locale } from "@/i18n/routing";
import type { ServiceTiming } from "@/types/content";

/**
 * Services held only on some weeks of the month ("1st & 3rd Sunday").
 *
 * `ServiceTiming.weeks` holds 1-5 for the nth occurrence of the service's day
 * and -1 for the last; absent or empty means every week. The wording matches
 * the Portal's preview (`formatWeeks` in the Portal's `lib/service-time.ts`).
 */

const WEEKS: { value: number; en: string; ta: string }[] = [
  { value: 1, en: "1st", ta: "முதல்" },
  { value: 2, en: "2nd", ta: "இரண்டாம்" },
  { value: 3, en: "3rd", ta: "மூன்றாம்" },
  { value: 4, en: "4th", ta: "நான்காம்" },
  { value: 5, en: "5th", ta: "ஐந்தாம்" },
  { value: -1, en: "Last", ta: "கடைசி" },
];

/** "1st & 3rd Sunday of the month" / "மாதத்தின் முதல், மூன்றாம் ஞாயிறு"; "" for every week. */
export function weeksText(timing: ServiceTiming, locale: Locale): string {
  const picked = WEEKS.filter((week) => timing.weeks?.includes(week.value));
  if (picked.length === 0) return "";
  if (locale === "ta") {
    return `மாதத்தின் ${picked.map((week) => week.ta).join(", ")} ${timing.day.ta}`;
  }
  const en = picked.map((week, i) => (i > 0 ? week.en.toLowerCase() : week.en));
  const list = en.length === 1 ? en[0] : `${en.slice(0, -1).join(", ")} & ${en[en.length - 1]}`;
  return `${list} ${timing.day.en} of the month`;
}

const DAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/** Today's date in the church's time zone - the server runs on UTC. */
function todayInChennai(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = parts.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Whether the service is held on the next occurrence of its day (today
 * included) - e.g. whether a "1st & 3rd Sunday" service is on this coming
 * Sunday. Every-week services, and days the list does not know, always are.
 */
export function heldOnNextOccurrence(timing: ServiceTiming, now: Date = new Date()): boolean {
  if (!timing.weeks?.length) return true;
  const target = DAY_INDEX[timing.day.en];
  if (target === undefined) return true;

  const date = todayInChennai(now);
  date.setUTCDate(date.getUTCDate() + ((target - date.getUTCDay() + 7) % 7));

  const dayOfMonth = date.getUTCDate();
  const daysInMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  const nth = Math.ceil(dayOfMonth / 7);
  const isLast = dayOfMonth + 7 > daysInMonth;

  return timing.weeks.includes(nth) || (isLast && timing.weeks.includes(-1));
}
