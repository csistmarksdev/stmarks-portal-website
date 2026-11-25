import type { LocalizedText } from "@portal/shared";

/**
 * Service times: picked on a clock ("HH:mm", 24-hour, from `<input
 * type="time">`), printed the way the church writes them.
 *
 * The Website prints `ServiceTiming.time` as-is, so the Portal composes it here
 * from the clock values on every save - the office never types "AM" or "காலை"
 * by hand again, and the English and Tamil can no longer disagree.
 */

/** "06:00" → { hour: 6, minute: 0 }; null when not a clock time. */
function parse(clock: string | undefined) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(clock ?? "");
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function twelveHour(hour: number, minute: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${String(minute).padStart(2, "0")}`;
}

/**
 * The Tamil part of the day that leads a time, as the seed data and the
 * printed notices write it ("காலை 6:00", "மாலை 6:30").
 */
function tamilPeriod(hour: number) {
  if (hour >= 4 && hour < 12) return "காலை";
  if (hour >= 12 && hour < 16) return "மதியம்";
  if (hour >= 16 && hour < 19) return "மாலை";
  return "இரவு";
}

function english(hour: number, minute: number) {
  return `${twelveHour(hour, minute)} ${hour < 12 ? "AM" : "PM"}`;
}

/**
 * "06:00" + "07:30" → { en: "6:00 AM – 7:30 AM", ta: "காலை 6:00 – 7:30" }.
 * Tamil names the part of the day once when both ends share it, as in
 * "காலை 6:00 – 7:30"; across a change it names both ("காலை 11:00 – மதியம் 12:30").
 * Returns empty text when there is no valid start.
 */
export function formatServiceTime(start?: string, end?: string): LocalizedText {
  const from = parse(start);
  if (!from) return { en: "", ta: "" };
  const to = parse(end);

  const enFrom = english(from.hour, from.minute);
  const taFrom = `${tamilPeriod(from.hour)} ${twelveHour(from.hour, from.minute)}`;
  if (!to) return { en: enFrom, ta: taFrom };

  const samePeriod = tamilPeriod(from.hour) === tamilPeriod(to.hour);
  return {
    en: `${enFrom} – ${english(to.hour, to.minute)}`,
    ta: `${taFrom} – ${samePeriod ? "" : `${tamilPeriod(to.hour)} `}${twelveHour(to.hour, to.minute)}`,
  };
}

/**
 * Reads a clock time back out of text typed before the clock picker existed:
 * "6:00 AM" → "06:00", "6:30 PM - 8:00 PM" → ["18:30", "20:00"]. Lets older
 * entries open with their times already on the clock. Returns what it could
 * read; an unreadable text yields no start.
 */
export function parseLegacyTime(text: string | undefined): {
  startTime?: string;
  endTime?: string;
} {
  const found = [...(text ?? "").matchAll(/(\d{1,2})(?:[:.](\d{2}))?\s*([AaPp])\.?\s*[Mm]\.?/g)];
  const clocks = found
    .map(([, h, m, period]) => {
      let hour = Number(h);
      const minute = Number(m ?? 0);
      if (hour < 1 || hour > 12 || minute > 59) return null;
      if (hour === 12) hour = 0;
      if (period.toLowerCase() === "p") hour += 12;
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    })
    .filter((clock): clock is string => clock !== null);
  return { startTime: clocks[0], endTime: clocks[1] };
}

/* ------------------------------ Weeks of month ----------------------------- */

/** The choices, in order: the nth occurrence of the day, then the last. */
export const WEEK_OPTIONS: { value: number; en: string; ta: string }[] = [
  { value: 1, en: "1st", ta: "முதல்" },
  { value: 2, en: "2nd", ta: "இரண்டாம்" },
  { value: 3, en: "3rd", ta: "மூன்றாம்" },
  { value: 4, en: "4th", ta: "நான்காம்" },
  { value: 5, en: "5th", ta: "ஐந்தாம்" },
  { value: -1, en: "Last", ta: "கடைசி" },
];

/** Sorted 1-5 first, "last" at the end; duplicates and unknowns dropped. */
export function normaliseWeeks(weeks: number[] | undefined): number[] {
  return WEEK_OPTIONS.map((option) => option.value).filter((value) => weeks?.includes(value));
}

/**
 * [1, 3] + Sunday → { en: "1st & 3rd Sunday of the month",
 * ta: "மாதத்தின் முதல், மூன்றாம் ஞாயிறு" }. Empty text for every week.
 * Must read the same as the Website's `weeksText`.
 */
export function formatWeeks(weeks: number[] | undefined, day: LocalizedText): LocalizedText {
  const picked = WEEK_OPTIONS.filter((option) => weeks?.includes(option.value));
  if (picked.length === 0) return { en: "", ta: "" };
  // "Last Sunday", but "1st & last Sunday".
  const en = picked.map((option, i) => (i > 0 ? option.en.toLowerCase() : option.en));
  const enList = en.length === 1 ? en[0] : `${en.slice(0, -1).join(", ")} & ${en[en.length - 1]}`;
  return {
    en: `${enList} ${day.en || "day"} of the month`,
    ta: `மாதத்தின் ${picked.map((option) => option.ta).join(", ")} ${day.ta || "நாள்"}`,
  };
}
