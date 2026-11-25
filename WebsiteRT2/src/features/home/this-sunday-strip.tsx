import { getLocale, getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import { getChurchProfile, getServiceTimings } from "@/services";

import { LiveServiceStrip } from "./live-service-strip";

/**
 * The hero strip under the homepage title: the service in progress right now,
 * with where it is and how to get there (F-048) - and nothing at all when no
 * service is on.
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
  const [t, timings, profile] = await Promise.all([
    getTranslations("home.thisSunday"),
    getServiceTimings(),
    getChurchProfile(),
  ]);
  const locale = (await getLocale()) as Locale;
  if (timings.length === 0) return null;

  const address = profile.address;

  return (
    <LiveServiceStrip
      className={className}
      timings={timings}
      locale={locale}
      labels={{ live: t("live"), directions: t("directions"), newTab: t("newTab") }}
      address={localize(address.lines, locale).split(",").slice(-2).join(",").trim()}
      mapsUrl={address.mapsUrl}
    />
  );
}
