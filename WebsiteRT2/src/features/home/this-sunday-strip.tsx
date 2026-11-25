import { getLocale, getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import type { LiveEvent } from "@/lib/service-live";
import { getChurchProfile, getPastEvents, getServiceTimings, getUpcomingEvents } from "@/services";
import type { ChurchEvent } from "@/types/content";

import { LiveServiceStrip } from "./live-service-strip";

/**
 * The hero strip under the homepage title: what is in progress right now - a
 * Portal event if one is under way, otherwise a regular service - with where
 * it is and how to get there (F-048), and nothing at all when nothing is on.
 *
 * Every service in the Portal is a candidate, on any day: "live" comes from
 * the times the Portal holds (day, week of the month, start and end), checked
 * in the visitor's browser against Chennai time - see `LiveServiceStrip`. This
 * server half fetches and translates; it cannot decide "now" itself because
 * the homepage is cached for minutes at a time.
 *
 * Rendered inside the hero's opening scene, under the tagline, so it arrives
 * and fades with the title and leaves the scroll cue at the foot of the screen
 * clear. No call button until a real office phone exists (F-007).
 */
export async function ThisSundayStrip({ className }: { className?: string }) {
  const [t, timings, profile, upcoming, recent] = await Promise.all([
    getTranslations("home.thisSunday"),
    getServiceTimings(),
    getChurchProfile(),
    /*
     * Events, which take priority over a service at the same time. "Upcoming"
     * keeps an event until its end, so one under way is in it - but an event
     * with no end time leaves it the moment it starts, so the latest past
     * events come too. Either failing costs the strip its events, not the
     * homepage.
     */
    getUpcomingEvents(6).catch((): ChurchEvent[] => []),
    getPastEvents(3).catch((): ChurchEvent[] => []),
  ]);
  const locale = (await getLocale()) as Locale;

  // Only what the strip needs: it is sent to the browser.
  const seen = new Set<string>();
  const events: LiveEvent[] = [...upcoming, ...recent]
    .filter((event) => !seen.has(event.id) && seen.add(event.id))
    .map(({ id, slug, title, location, startDate, endDate }) => ({
      id,
      slug,
      title,
      location,
      startDate,
      endDate,
    }));

  if (timings.length === 0 && events.length === 0) return null;

  const address = profile.address;

  return (
    <LiveServiceStrip
      className={className}
      timings={timings}
      events={events}
      locale={locale}
      labels={{ live: t("live"), directions: t("directions"), newTab: t("newTab") }}
      address={localize(address.lines, locale).split(",").slice(-2).join(",").trim()}
      mapsUrl={address.mapsUrl}
    />
  );
}
