import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import type { ServiceTiming } from "@/types/content";

/** "06:00" → "6:00 AM" / "காலை 6:00" - as the Portal's `formatServiceTime` writes a start. */
function formatClock(clock: string, locale: Locale): string | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(clock);
  if (!match) return null;
  const hour = Number(match[1]);
  const time = `${hour % 12 === 0 ? 12 : hour % 12}:${match[2]}`;
  if (locale !== "ta") return `${time} ${hour < 12 ? "AM" : "PM"}`;
  const period =
    hour >= 4 && hour < 12 ? "காலை" : hour >= 12 && hour < 16 ? "மதியம்" : hour >= 16 && hour < 19 ? "மாலை" : "இரவு";
  return `${period} ${time}`;
}

/**
 * Just the start of a service's time, for the one-line hero strip: "8:30 AM"
 * out of "8:30 AM – 10:30 AM". Read from the clock value when the Portal saved
 * one; entries typed before the clock picker are cut at their dash, whether
 * typed as "-" or "–".
 */
export function startTimeText(timing: ServiceTiming, locale: Locale): string {
  const fromClock = timing.startTime ? formatClock(timing.startTime, locale) : null;
  if (fromClock) return fromClock;
  return localize(timing.time, locale).split(/\s*[–—-]\s*/)[0].trim();
}

/**
 * The services the homepage hero shows - the "Sunday services" strip in the
 * opening scene and the timings scene after it.
 *
 * The office pins them in the Portal ("Feature in the homepage hero"), in the
 * Portal's order. Until anything is pinned - and for entries saved before the
 * Portal had the switch - the hero shows every Sunday service, as it always has.
 */
/** The Portal allows three (`MAX_FEATURED_SERVICES`); this is the last guard. */
const MAX_FEATURED = 3;

export function heroTimings(timings: ServiceTiming[]): ServiceTiming[] {
  const featured = timings.filter((timing) => timing.featured);
  if (featured.length > 0) return featured.slice(0, MAX_FEATURED);
  return timings.filter((timing) => timing.day.en === "Sunday");
}
