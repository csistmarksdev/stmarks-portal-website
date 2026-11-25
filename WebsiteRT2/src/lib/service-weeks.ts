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

/**
 * The short form, for a one-line strip: "1st & 3rd Sundays" / "முதல்,
 * மூன்றாம் ஞாயிறு"; "" for every week.
 */
export function weeksShort(timing: ServiceTiming, locale: Locale): string {
  const picked = WEEKS.filter((week) => timing.weeks?.includes(week.value));
  if (picked.length === 0) return "";
  if (locale === "ta") return `${picked.map((week) => week.ta).join(", ")} ${timing.day.ta}`;
  const en = picked.map((week, i) => (i > 0 ? week.en.toLowerCase() : week.en));
  const list = en.length === 1 ? en[0] : `${en.slice(0, -1).join(", ")} & ${en[en.length - 1]}`;
  return `${list} ${timing.day.en}s`;
}
