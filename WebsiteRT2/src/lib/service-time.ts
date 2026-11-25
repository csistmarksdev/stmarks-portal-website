import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import type { ServiceTiming } from "@/types/content";

/**
 * Service times, built from the Portal's clock values.
 *
 * Since Portal 1.7.4 a service carries `startTime` / `endTime` ("HH:mm",
 * 24-hour). The Website prints from those rather than from the `time` text,
 * so every service reads the same way in both languages and a range never
 * wraps into three lines. Entries saved before the clock picker carry only
 * typed text; their times are read out of the English the same way the
 * Portal's editor reads them, and only text that cannot be read is printed
 * as typed. Mirrors `formatServiceTime` / `parseLegacyTime` in the Portal.
 */

type Clock = { hour: number; minute: number };

function parse(clock: string | undefined): Clock | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(clock ?? "");
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}

/** "6:00 AM - 7:30 AM" → ["06:00", "07:30"], as the Portal reads old entries. */
function parseTyped(text: string | undefined): string[] {
  return [...(text ?? "").matchAll(/(\d{1,2})(?:[:.](\d{2}))?\s*([AaPp])\.?\s*[Mm]\.?/g)]
    .map(([, h, m, period]) => {
      let hour = Number(h);
      const minute = Number(m ?? 0);
      if (hour < 1 || hour > 12 || minute > 59) return null;
      if (hour === 12) hour = 0;
      if (period.toLowerCase() === "p") hour += 12;
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    })
    .filter((clock): clock is string => clock !== null);
}

/** The service's start and (optional) end on the clock, or null if unreadable. */
function clockOf(timing: ServiceTiming): { start: Clock; end: Clock | null } | null {
  const start = parse(timing.startTime);
  if (start) return { start, end: parse(timing.endTime) };
  const [typedStart, typedEnd] = parseTyped(timing.time?.en);
  const legacy = parse(typedStart);
  return legacy ? { start: legacy, end: parse(typedEnd) } : null;
}

const twelveHour = ({ hour, minute }: Clock) =>
  `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, "0")}`;

/** The Tamil part of the day that leads a time ("காலை 6:00", "மாலை 6:30"). */
function tamilPeriod(hour: number) {
  if (hour >= 4 && hour < 12) return "காலை";
  if (hour >= 12 && hour < 16) return "மதியம்";
  if (hour >= 16 && hour < 19) return "மாலை";
  return "இரவு";
}

function format(clock: Clock, locale: Locale) {
  return locale === "ta"
    ? `${tamilPeriod(clock.hour)} ${twelveHour(clock)}`
    : `${twelveHour(clock)} ${clock.hour < 12 ? "AM" : "PM"}`;
}

export interface TimeParts {
  /** The start, set large: "8:30 AM" / "காலை 8:30". */
  start: string;
  /** The end, set small beneath: "until 10:30 AM" / "10:30 வரை"; null when open-ended. */
  until: string | null;
  /** For `<time dateTime>`: "08:30", or undefined when only typed text exists. */
  dateTime?: string;
}

export function timeParts(timing: ServiceTiming, locale: Locale): TimeParts {
  const clock = clockOf(timing);
  if (!clock) return { start: localize(timing.time, locale), until: null };

  const { start, end } = clock;
  const dateTime = `${String(start.hour).padStart(2, "0")}:${String(start.minute).padStart(2, "0")}`;
  if (!end) return { start: format(start, locale), until: null, dateTime };

  if (locale === "ta") {
    // The part of the day is named again only when it changes:
    // "காலை 8:30" … "10:30 வரை", but "காலை 11:00" … "மதியம் 12:30 வரை".
    const same = tamilPeriod(start.hour) === tamilPeriod(end.hour);
    return {
      start: format(start, "ta"),
      until: `${same ? "" : `${tamilPeriod(end.hour)} `}${twelveHour(end)} வரை`,
      dateTime,
    };
  }
  return { start: format(start, locale), until: `until ${format(end, locale)}`, dateTime };
}

/**
 * Start and end as minutes past midnight (480 = 8:00 AM), from the clock
 * values or, for older entries, the typed text. `end` is null when the
 * service has no end time; the whole is null when no time can be read.
 */
export function clockMinutes(timing: ServiceTiming): { start: number; end: number | null } | null {
  const clock = clockOf(timing);
  if (!clock) return null;
  const minutes = ({ hour, minute }: Clock) => hour * 60 + minute;
  return { start: minutes(clock.start), end: clock.end ? minutes(clock.end) : null };
}
