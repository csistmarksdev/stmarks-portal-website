import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { EventCard } from "@/components/cards/event-card";
import { FeaturedEventCard } from "@/components/cards/featured-event-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageMasthead } from "@/components/common/page-masthead";
import { Reveal } from "@/components/motion/reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { ROUTES } from "@/constants/site";
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

/**
 * The whole calendar - every upcoming event and every past one.
 *
 * The counterpart to the events chapter on the home page, which carries only
 * the nearest few of each. Keeps the chapter's own `#upcoming` and `#past`
 * anchors so a link to either lands in the same place it always did, and its
 * strings are the chapter's too - the two are one subject at two depths, not
 * two subjects.
 */
export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);

  const locale = rawLocale as Locale;

  const [t, tNav, tCommon, upcoming, past] = await Promise.all([
    getTranslations("events"),
    getTranslations("nav"),
    getTranslations("common"),
    getUpcomingEvents(),
    getPastEvents(),
  ]);

  /*
   * The banner honours the Portal's "Featured" toggle, and falls back to the
   * next gathering when nothing is marked. Sorting rather than filtering keeps
   * every event on the page; only the order changes.
   */
  const [banner, ...rest] = [...upcoming].sort(
    (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
  );

  return (
    <main id="main">
      <PageMasthead
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
      />

      <Section spacing="lg" id="upcoming">
        <SectionHeading
          title={t("upcoming")}
          action={
            <Link
              href={ROUTES.blogArchive}
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

        <div className="mt-14 flex justify-center">
          <Button asChild variant="secondary">
            <Link href={ROUTES.events}>
              <ArrowLeft aria-hidden />
              {tCommon("backTo", { page: tNav("events") })}
            </Link>
          </Button>
        </div>
      </Section>
    </main>
  );
}
