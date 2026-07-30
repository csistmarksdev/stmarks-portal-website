import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CrossMark } from "@/components/common/ornament";
import { ScrollCue } from "@/components/common/scroll-cue";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Heading, Prose, Text } from "@/components/ui/typography";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { formatDateTime, getEventStatus } from "@/lib/date";
import { localize, localizeAll } from "@/lib/localize";
import { getEventBySlug, getEventSlugs } from "@/services";

export async function generateStaticParams() {
  const slugs = await getEventSlugs();

  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) return {};

  const title = localize(event.title, locale as Locale);
  const description = localize(event.summary, locale as Locale);

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      images: event.image ? [{ url: event.image.url }] : undefined,
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  setRequestLocale(rawLocale);

  const locale = rawLocale as Locale;
  const event = await getEventBySlug(slug);

  if (!event) notFound();

  const [t, tCommon, tNav] = await Promise.all([
    getTranslations("events"),
    getTranslations("common"),
    getTranslations("nav"),
  ]);

  const status = getEventStatus(event);
  const title = localize(event.title, locale);

  return (
    <main id="main">
      {/* Hero */}
      <section className="relative flex min-h-svh items-end overflow-hidden bg-sand-950 pb-28 pt-[calc(var(--header-height)+4rem)] sm:pb-32">
        {event.image ? (
          <>
            <Image
              src={event.image.url}
              alt={localize(event.image.alt, locale)}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-sand-950 via-sand-950/75 to-sand-950/40"
            />
          </>
        ) : null}

        <Container className="relative">
          <Reveal className="max-w-3xl">
            <Link
              href={ROUTES.events}
              className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft aria-hidden className="size-4" />
              {tCommon("backTo", { page: tNav("events") })}
            </Link>

            <Badge variant="onDark" size="md" className="mt-6">
              {t(`status.${status}`)}
            </Badge>

            <Heading as="h1" level="h1" tone="onDark" className="mt-5">
              {title}
            </Heading>

            <Text size="xl" tone="onDark" className="mt-5">
              {localize(event.summary, locale)}
            </Text>
          </Reveal>
        </Container>

        <ScrollCue className="pointer-events-none absolute inset-x-0 bottom-8" />
      </section>

      <Section spacing="lg">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-7">
            <Reveal>
              <div className="flex items-center gap-3">
                <CrossMark size="sm" tone="sacred" />
                <Heading as="h2" level="h3">
                  {t("details.aboutEvent")}
                </Heading>
              </div>

              <span aria-hidden className="mt-5 block h-px w-20 rule-gild" />

              <div className="mt-7">
                <Prose paragraphs={localizeAll(event.description, locale)} lead />
              </div>
            </Reveal>
          </div>

          {/* Detail sidebar — held in view while the description scrolls. */}
          <aside className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
            <Reveal direction="left">
              <Card variant="muted" padded="lg">
                <dl className="space-y-6">
                  <div className="flex gap-4">
                    <span
                      aria-hidden
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-700 ring-1 ring-accent-500/20"
                    >
                      <CalendarDays className="size-4" />
                    </span>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                        {t("details.when")}
                      </dt>
                      <dd className="mt-1 text-sm text-[var(--foreground)]">
                        <time dateTime={event.startDate}>
                          {formatDateTime(event.startDate, locale)}
                        </time>
                        {event.endDate ? (
                          <>
                            {" — "}
                            <time dateTime={event.endDate}>
                              {formatDateTime(event.endDate, locale)}
                            </time>
                          </>
                        ) : null}
                      </dd>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <span
                      aria-hidden
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-700 ring-1 ring-accent-500/20"
                    >
                      <MapPin className="size-4" />
                    </span>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                        {t("details.where")}
                      </dt>
                      <dd className="mt-1 text-sm text-[var(--foreground)]">
                        {localize(event.location, locale)}
                      </dd>
                    </div>
                  </div>

                  {event.organiser ? (
                    <div className="flex gap-4">
                      <span
                        aria-hidden
                        className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-700 ring-1 ring-accent-500/20"
                      >
                        <Users className="size-4" />
                      </span>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                          {t("details.organiser")}
                        </dt>
                        <dd className="mt-1 text-sm text-[var(--foreground)]">
                          {localize(event.organiser, locale)}
                        </dd>
                      </div>
                    </div>
                  ) : null}
                </dl>
              </Card>
            </Reveal>
          </aside>
        </div>
      </Section>
    </main>
  );
}
