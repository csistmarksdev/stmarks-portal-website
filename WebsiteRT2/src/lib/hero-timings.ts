import type { ServiceTiming } from "@/types/content";

/** The Portal allows three (`MAX_FEATURED_SERVICES`); this is the last guard. */
const MAX_FEATURED = 3;

/**
 * The services the homepage hero shows - the "Sunday services" strip in the
 * opening scene and the timings scene after it.
 *
 * The office pins them in the Portal ("Feature in the homepage hero"), in the
 * Portal's order. Until anything is pinned - and for entries saved before the
 * Portal had the switch - the hero shows every Sunday service, as it always has.
 */
export function heroTimings(timings: ServiceTiming[]): ServiceTiming[] {
  const featured = timings.filter((timing) => timing.featured);
  if (featured.length > 0) return featured.slice(0, MAX_FEATURED);
  return timings.filter((timing) => timing.day.en === "Sunday");
}
