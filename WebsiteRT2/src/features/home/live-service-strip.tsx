"use client";

import { MapPin, Navigation } from "lucide-react";
import { useSyncExternalStore } from "react";

import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import {
  eventUntilText,
  isEventLiveNow,
  isLiveNow,
  type LiveEvent,
} from "@/lib/service-live";
import { timeParts } from "@/lib/service-time";
import { cn } from "@/lib/utils";
import type { ServiceTiming } from "@/types/content";

/** How often the strip re-checks the clock. */
const TICK_MS = 30_000;

/*
 * The clock as an external store: it "changes" once per tick, so the strip
 * re-renders every 30 s and no more. On the server, and during hydration, it
 * reads null - the server cannot know the visitor's "now".
 */
const subscribeToClock = (onTick: () => void) => {
  const timer = window.setInterval(onTick, TICK_MS);
  return () => window.clearInterval(timer);
};
const readClock = () => Math.floor(Date.now() / TICK_MS);
const readClockOnServer = () => null;

/**
 * The browser half of the hero strip: shows only what is in progress right
 * now, and nothing otherwise.
 *
 * A Portal event under way takes priority: when one overlaps a regular
 * service (a carol service at the time of Sunday worship), the event is what
 * is happening, so the strip shows the event alone - linked to its page - and
 * the service only when no event is on.
 *
 * Decided here, in the visitor's browser, rather than on the server: the
 * homepage is cached for minutes at a time, so a server-side decision would
 * keep showing "Live now" well after a service ended (and miss its start). The
 * clock is read in Chennai time (see `isLiveNow`), and re-read every 30 s so
 * the strip appears and goes on its own while the page stays open.
 *
 * Renders nothing until mounted: the server cannot know the visitor's "now",
 * and guessing would flash the wrong state during hydration.
 */
export function LiveServiceStrip({
  timings,
  events,
  locale,
  labels,
  address,
  mapsUrl,
  className,
}: {
  timings: ServiceTiming[];
  events: LiveEvent[];
  locale: Locale;
  labels: { live: string; directions: string; newTab: string };
  address: string;
  mapsUrl: string;
  className?: string;
}) {
  const tick = useSyncExternalStore(subscribeToClock, readClock, readClockOnServer);
  if (tick === null) return null;
  const now = new Date();

  const liveEvents = events.filter((event) => isEventLiveNow(event, now));
  const entries =
    liveEvents.length > 0
      ? liveEvents.map((event) => ({
          key: `event-${event.id}`,
          name: (
            <Link href={ROUTES.event(event.slug)} className="underline decoration-white/40 underline-offset-4 hover:decoration-white">
              {localize(event.title, locale)}
            </Link>
          ),
          when: eventUntilText(event, now, locale),
          place: localize(event.location, locale),
        }))
      : timings
          .filter((timing) => isLiveNow(timing, now))
          .map((timing) => {
            const time = timeParts(timing, locale);
            return {
              key: `service-${timing.id}`,
              name: <span>{localize(timing.service, locale)}</span>,
              when: time.until ?? time.start,
              place: localize(timing.venue, locale),
            };
          });
  if (entries.length === 0) return null;

  return (
    <aside aria-label={labels.live} aria-live="polite" className={cn("flex", className)}>
      <div className="flex w-full max-w-3xl flex-col gap-1.5 rounded-2xl border border-white/15 bg-black/45 px-3.5 py-2.5 text-white shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:gap-5 sm:px-5 sm:py-3">
        <p className="min-w-0 text-[0.9375rem] leading-snug sm:flex-1 sm:text-base">
          <span className="inline-flex items-center gap-2 font-semibold">
            {/* The red "on air" dot; it stops pulsing under reduced motion. */}
            <span aria-hidden className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
            </span>
            {labels.live}:
          </span>{" "}
          {entries.map((entry, i) => (
            <span key={entry.key}>
              {i > 0 && " · "}
              {entry.name}
              <span className="numeric whitespace-nowrap text-sm text-white/75"> · {entry.when}</span>
            </span>
          ))}
          <span className="mt-0.5 hidden text-sm text-white/75 md:block">
            {entries.map((entry) => entry.place).filter(Boolean).join(" · ")}
          </span>
        </p>

        {/* Address and directions share a row, so a phone keeps the strip to two lines. */}
        <div className="flex min-w-0 items-center justify-between gap-3 sm:contents">
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-white/85">
            <MapPin aria-hidden className="size-4 shrink-0" />
            <span className="truncate">{address}</span>
          </p>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-sand-950 transition-colors hover:bg-white/90"
          >
            <Navigation aria-hidden className="size-4" />
            {labels.directions}
            <span className="sr-only"> ({labels.newTab})</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
