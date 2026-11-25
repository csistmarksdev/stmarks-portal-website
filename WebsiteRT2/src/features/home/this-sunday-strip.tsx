import { MapPin, Navigation } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { heroTimings } from "@/lib/hero-timings";
import { startTimeText } from "@/lib/service-time";
import { heldOnNextOccurrence, weeksShort } from "@/lib/service-weeks";
import { localize } from "@/lib/localize";
import { cn } from "@/lib/utils";
import { getChurchProfile, getServiceTimings } from "@/services";

/**
 * "This Sunday" - the newcomer's three questions answered on the first screen
 * (F-048): when, where, and how to get there.
 *
 * Times come from the Portal's service timings, the same source as the
 * timings scene further down, so the two can never disagree. They are what the
 * Portal holds today and still await the office's sign-off (F-010); fixing
 * them in the Portal fixes this strip too. No call button until a real office
 * phone exists (F-007).
 *
 * Rendered inside the hero's opening scene, under the tagline, so it arrives
 * and fades with the title and leaves the scroll cue at the foot of the screen
 * clear.
 */
export async function ThisSundayStrip({ className }: { className?: string }) {
  const [t, timings, profile] = await Promise.all([
    getTranslations("home.thisSunday"),
    getServiceTimings(),
    getChurchProfile(),
  ]);
  const locale = (await getLocale()) as Locale;

  // What the Portal pins in the hero; every Sunday service until anything is.
  // ...and of those, only the ones held on the coming day - a "1st & 3rd
  // Sunday" service is left out on the 2nd Sunday.
  const pinned = heroTimings(timings);
  const thisWeek = pinned.filter((timing) => heldOnNextOccurrence(timing));
  // When none of them falls on the coming day, the strip still answers "when
  // and where" - it lists them with their weeks ("8:30 AM (1st & 3rd
  // Sundays)") rather than vanishing with the address and directions.
  const withWeeks = thisWeek.length === 0;
  const sunday = withWeeks ? pinned : thisWeek;
  if (sunday.length === 0) return null;

  // Pinned services can fall on other days; then each time names its day and
  // the label stops promising "Sunday".
  const allSunday = sunday.every((timing) => timing.day.en === "Sunday");

  /*
   * Start times only - the strip has one line on a phone, and the timings
   * scene and About page carry the full "6:00 AM – 7:30 AM". Tamil carries the
   * period on each time ("காலை 6:00"); shown once, as in the handoff's text:
   * "ஞாயிறு ஆராதனை: காலை 6:00 · 8:00 · 9:00".
   */
  const starts = sunday.map((timing) => startTimeText(timing, locale));
  // Kept apart from the time: the time never breaks, the note may wrap -
  // together on one unbreakable line, the Tamil ran over the address.
  const weeks = sunday.map((timing) => (withWeeks ? weeksShort(timing, locale) : ""));
  const times = allSunday
    ? locale === "ta"
      ? starts.map((time, i) => (i === 0 ? time : time.replace(/^காலை\s+/, "")))
      : starts
    : starts.map((time, i) => `${localize(sunday[i].day, locale)} ${time}`);

  const address = profile.address;

  return (
    <aside
      aria-label={t("label")}
      className={cn(
        "flex",
        className,
      )}
    >
      <div className="flex w-full max-w-3xl flex-col gap-1.5 rounded-2xl border border-white/15 bg-black/45 px-3.5 py-2.5 text-white shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:gap-5 sm:px-5 sm:py-3">
        <p className="min-w-0 text-[0.9375rem] leading-snug sm:flex-1 sm:text-base">
          <span className="font-semibold">{t(allSunday ? "label" : "labelFeatured")}:</span>{" "}
          <span className="numeric">
            {times.map((time, i) => (
              <span key={sunday[i].id}>
                {i > 0 && " · "}
                <span className="whitespace-nowrap">{time}</span>
                {weeks[i] && <span className="text-sm text-white/75"> ({weeks[i]})</span>}
              </span>
            ))}
          </span>
          <span className="mt-0.5 hidden text-sm text-white/75 md:block">
            {sunday.map((timing) => localize(timing.service, locale)).join(" · ")}
          </span>
        </p>

        {/* Address and directions share a row, so a phone keeps the strip to two lines. */}
        <div className="flex min-w-0 items-center justify-between gap-3 sm:contents">
        <p className="flex min-w-0 items-center gap-1.5 text-sm text-white/85">
          <MapPin aria-hidden className="size-4 shrink-0" />
          <span className="truncate">
            {localize(address.lines, locale).split(",").slice(-2).join(",").trim()}
          </span>
        </p>

        <a
          href={address.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-sand-950 transition-colors hover:bg-white/90"
        >
          <Navigation aria-hidden className="size-4" />
          {t("directions")}
          <span className="sr-only"> ({t("newTab")})</span>
        </a>
        </div>
      </div>
    </aside>
  );
}
