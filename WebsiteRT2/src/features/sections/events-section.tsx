import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { EventCard } from "@/components/cards/event-card";
import { FeaturedEventCard } from "@/components/cards/featured-event-card";
import { EmptyState } from "@/components/common/empty-state";
import { Reveal } from "@/components/motion/reveal";
import { PageHero } from "@/components/common/page-hero";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { ROUTES, SECTION_IDS, heroDirection } from "@/constants/site";
import { HERO_SLIDES } from "@/content/hero-slides";
import { NaveLight } from "@/features/sections/nave-light";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getPastEvents, getUpcomingEvents } from "@/services";

/*
 * How much of each list the chapter carries before it hands over to the
 * archive at `/events`.
 *
 * Seven upcoming rather than six, because one of them is spent on the banner:
 * that leaves six for the grid, which is exactly two full rows at `lg` and
 * three at `sm`. Six past events fill the same grid without a banner in front
 * of them. Both numbers exist to make the block end on a straight edge - a
 * limit that leaves one card alone on a final row reads as something broken
 * rather than as a selection.
 */
const CHAPTER_UPCOMING = 7;
const CHAPTER_PAST = 6;

/**
 * What is coming and what has been.
 *
 * Keeps `#upcoming` and `#past`, and now keeps only the nearest few of each -
 * the whole calendar lives at `/events`. An individual event still has a page
 * of its own, linked from its card.
 */
export async function EventsSection() {
  const locale = (await getLocale()) as Locale;

  const [t, tNav, upcoming, past] = await Promise.all([
    getTranslations("events"),
    getTranslations("nav"),
    getUpcomingEvents(CHAPTER_UPCOMING),
    getPastEvents(CHAPTER_PAST),
  ]);

  /*
   * The banner honours the Portal's "Featured" toggle, and falls back to the
   * next gathering when nothing is marked.
   *
   * Previously it was always `upcoming[0]`, which meant ticking Featured in the
   * Portal changed nothing on the site - the editor had a switch wired to
   * nothing. Sorting rather than filtering keeps every event on the page; only
   * the order changes.
   */
  const [banner, ...rest] = [...upcoming].sort(
    (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
  );

  return (
    <div id="events">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        images={HERO_SLIDES.events}
        variant="section"
        direction={heroDirection(SECTION_IDS.events)}
      />

      {/*
        The room, before the dates.

        The hero has just said "gather with us", and the block below answers it
        the only way a calendar can - a banner and twelve dated cards, this date
        and then that one. That is the right way to *use* the chapter and the
        wrong way to open it: it hands the reader a fortnight of a parish's life
        and never shows them the place any of it happens in. So the chapter
        opens on the room. The page holds still, an empty nave comes up in flat
        shade, and over the length of the hold a shaft of sunlight crosses it
        and comes to rest on the cross.

        The same pin the leadership and fellowship chapters open on,
        deliberately - and a third picture inside it. See the note at the head
        of `nave-light.tsx`.

        `spacing="none"` and `contained={false}`: the stage *is* the section. It
        owns a screen and places the room as a share of it, so the section's
        padding would push it off the screen it is meant to fill.
        `atmosphere={false}` because the stage brings its own light, which is
        the entire subject.

        `tone="muted"` rather than the ink the other two stages are staged on,
        and it is not a preference: this one is a daylit interior, and a room
        lit from a window cannot be staged on black without becoming a room lit
        by a torch.
      */}
      <Section spacing="none" tone="muted" contained={false} atmosphere={false}>
        <NaveLight
          eyebrow={t("light.eyebrow")}
          title={t("light.title")}
          subtitle={t("light.subtitle")}
          label={t("light.label")}
        />
      </Section>

      <Section spacing="lg" id="upcoming">
        <SectionHeading
          title={t("upcoming")}
          action={
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href={ROUTES.blog}
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] underline-offset-4 transition-colors hover:underline"
              >
                {tNav("eventsItems.blog")}
                <ArrowUpRight aria-hidden className="size-4" />
              </Link>

              <Button asChild variant="secondary">
                <Link href={ROUTES.eventArchive}>
                  {t("viewAll")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          }
        />

        {upcoming.length === 0 ? (
          <EmptyState message={t("emptyUpcoming")} />
        ) : (
          <div className="space-y-8 lg:space-y-10">
            {/* A featured event leads as a banner, otherwise the next
                gathering does; the rest follow in the grid. */}
            <Reveal>
              <FeaturedEventCard event={banner} locale={locale} />
            </Reveal>

            {rest.length > 0 ? (
              <StaggerGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                {rest.map((event) => (
                  <StaggerItem key={event.id}>
                    <EventCard event={event} locale={locale} />
                  </StaggerItem>
                ))}
              </StaggerGroup>
            ) : null}
          </div>
        )}
      </Section>

      <Section spacing="lg" tone="muted" id="past">
        <SectionHeading
          title={t("past")}
          action={
            past.length > 0 ? (
              <Button asChild variant="secondary">
                {/* Straight to the archive's own past list rather than its
                    head, so the button lands the reader where they were. */}
                <Link href={`${ROUTES.eventArchive}#past`}>
                  {t("viewAll")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : undefined
          }
        />

        {past.length === 0 ? (
          <EmptyState message={t("emptyPast")} />
        ) : (
          <StaggerGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {past.map((event) => (
              <StaggerItem key={event.id}>
                <EventCard event={event} locale={locale} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>
    </div>
  );
}
