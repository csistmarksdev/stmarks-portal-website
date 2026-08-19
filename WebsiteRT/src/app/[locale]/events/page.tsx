import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { EventCard } from "@/components/cards/event-card";
import { FeaturedEventCard } from "@/components/cards/featured-event-card";
import { EmptyState } from "@/components/common/empty-state";
import { Reveal } from "@/components/motion/reveal";
import { PageHero } from "@/components/common/page-hero";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Section, SectionHeading } from "@/components/ui/section";
import { ROUTES } from "@/constants/site";
import { HERO_SLIDES } from "@/content/hero-slides";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getPastEvents, getUpcomingEvents } from "@/services";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events.meta" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);

  const locale = rawLocale as Locale;

  const [t, tNav, upcoming, past] = await Promise.all([
    getTranslations("events"),
    getTranslations("nav"),
    getUpcomingEvents(),
    getPastEvents(),
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
    <main id="main">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        images={HERO_SLIDES.events}
      />

      <Section spacing="lg" id="upcoming">
        <SectionHeading
          title={t("upcoming")}
          action={
            <Link
              href={ROUTES.blog}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] underline-offset-4 transition-colors hover:underline"
            >
              {tNav("eventsItems.blog")}
              <ArrowUpRight aria-hidden className="size-4" />
            </Link>
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
        <SectionHeading title={t("past")} />

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
    </main>
  );
}
