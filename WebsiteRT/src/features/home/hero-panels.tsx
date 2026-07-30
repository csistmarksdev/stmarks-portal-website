import { CalendarDays, MapPin } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import type { Locale } from "@/i18n/routing";
import { formatDateTime, getDateParts } from "@/lib/date";
import { localize } from "@/lib/localize";
import {
  getServiceTimings,
  getUpcomingEvents,
  getVisionMission,
} from "@/services";

/**
 * Content panels rendered *inside* the cinematic hero.
 *
 * These are server components — they fetch through the service layer like any
 * other section — but are styled for dark full-bleed video and kept short
 * enough to fit one viewport, since the stage positions them absolutely.
 */

const GLASS =
  "rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-md";

export async function HeroWelcomePanel() {
  const [t, vision] = await Promise.all([
    getTranslations("home.welcome"),
    getVisionMission(),
  ]);

  const locale = (await getLocale()) as Locale;

  return (
    <Container>
      <div className="max-w-4xl">
        <Eyebrow tone="onDark">{t("eyebrow")}</Eyebrow>

        <Heading as="p" level="h1" tone="onDark" className="mt-5 drop-shadow-lg">
          {t("title")}
        </Heading>

        <Text size="lg" tone="onDark" className="mt-4 max-w-2xl drop-shadow">
          {t("body")}
        </Text>

        <ul className="mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {vision.values.map((value) => (
            <li key={value.id} className={GLASS}>
              <p className="font-display text-sm font-semibold text-white">
                {localize(value.title, locale)}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/65">
                {localize(value.description, locale)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}

export async function HeroTimingsPanel() {
  const [t, timings] = await Promise.all([
    getTranslations("home.serviceTimings"),
    getServiceTimings(),
  ]);

  const locale = (await getLocale()) as Locale;

  // Only Sunday services — the full week is on the About page.
  const sunday = timings.filter((timing) => timing.day.en === "Sunday");

  return (
    <Container>
      <div className="max-w-4xl">
        <Eyebrow tone="onDark">{t("eyebrow")}</Eyebrow>

        <Heading as="p" level="h1" tone="onDark" className="mt-5 drop-shadow-lg">
          {t("title")}
        </Heading>

        <Text size="lg" tone="onDark" className="mt-4 max-w-xl drop-shadow">
          {t("subtitle")}
        </Text>

        <ul className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sunday.map((timing) => (
            <li key={timing.id} className={GLASS}>
              <p className="font-display text-2xl font-semibold text-white">
                {localize(timing.time, locale)}
              </p>
              <p className="mt-1 text-sm text-white/85">
                {localize(timing.service, locale)}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {localize(timing.venue, locale)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}

export async function HeroEventsPanel() {
  const [t, events] = await Promise.all([
    getTranslations("home.events"),
    getUpcomingEvents(3),
  ]);

  const locale = (await getLocale()) as Locale;

  return (
    <Container>
      <div className="max-w-4xl">
        <Eyebrow tone="onDark">{t("eyebrow")}</Eyebrow>

        <Heading as="p" level="h1" tone="onDark" className="mt-5 drop-shadow-lg">
          {t("title")}
        </Heading>

        <ul className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
          {events.map((event) => {
            const { day, month } = getDateParts(event.startDate, locale);

            return (
              <li key={event.id} className={GLASS}>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl font-semibold text-white">
                    {day}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent-300">
                    {month}
                  </span>
                </div>

                <p className="mt-2 font-display text-sm font-semibold leading-snug text-white">
                  {localize(event.title, locale)}
                </p>

                <p className="mt-2 flex items-center gap-1.5 text-xs text-white/60">
                  <CalendarDays aria-hidden className="size-3.5 shrink-0" />
                  {formatDateTime(event.startDate, locale)}
                </p>

                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/60">
                  <MapPin aria-hidden className="size-3.5 shrink-0" />
                  {localize(event.location, locale)}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </Container>
  );
}
