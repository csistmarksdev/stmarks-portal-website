import type { Metadata } from "next";
import { CalendarClock, Mail, Phone, Users } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AnnouncementCard } from "@/components/cards/announcement-card";
import { BlogCard } from "@/components/cards/blog-card";
import { DownloadCard } from "@/components/cards/download-card";
import { EventCard } from "@/components/cards/event-card";
import { GalleryCard } from "@/components/cards/gallery-card";
import { EmptyState } from "@/components/common/empty-state";
import { StatLedger } from "@/components/common/editorial";
import { ScrollCue } from "@/components/common/scroll-cue";
import { Reveal } from "@/components/motion/reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import { Eyebrow, Heading, Prose, Text } from "@/components/ui/typography";
import { routing, type Locale } from "@/i18n/routing";
import { localize, localizeAll } from "@/lib/localize";
import {
  getAlbumsByFellowship,
  getAnnouncementsByFellowship,
  getBlogPostsByFellowship,
  getDownloadsByFellowship,
  getEventsByFellowship,
  getFellowshipBySlug,
  getFellowshipSlugs,
} from "@/services";

/** Two-letter initials for a committee member's monogram medallion. */
function initials(name: string): string {
  return name
    .replace(/^(Mr\.|Mrs\.|Ms\.|Rev\.|Dr\.)\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

/** Prerender every fellowship in every locale. */
export async function generateStaticParams() {
  const slugs = await getFellowshipSlugs();

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
  const fellowship = await getFellowshipBySlug(slug);

  if (!fellowship) return {};

  const title = localize(fellowship.name, locale as Locale);
  const description = localize(fellowship.tagline, locale as Locale);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: fellowship.banner.url }],
    },
  };
}

export default async function FellowshipPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  setRequestLocale(rawLocale);

  const locale = rawLocale as Locale;
  const fellowship = await getFellowshipBySlug(slug);

  if (!fellowship) notFound();

  const [t, events, albums, announcements, documents, posts] =
    await Promise.all([
      getTranslations("fellowships"),
      getEventsByFellowship(fellowship.slug),
      getAlbumsByFellowship(fellowship.slug),
      getAnnouncementsByFellowship(fellowship.slug),
      getDownloadsByFellowship(fellowship.slug),
      getBlogPostsByFellowship(fellowship.slug),
    ]);

  const name = localize(fellowship.name, locale);
  const photoCount = albums.reduce(
    (total, album) => total + album.photos.length,
    0,
  );

  // At-a-glance ledger. Member count leads when known; otherwise the photo
  // count stands in so the ledger keeps its four columns.
  const glance = [
    fellowship.memberCount
      ? { value: String(fellowship.memberCount), label: t("stats.members") }
      : { value: String(photoCount), label: t("stats.photos") },
    { value: String(fellowship.committee.length), label: t("stats.committee") },
    { value: String(events.length), label: t("stats.events") },
    { value: String(posts.length), label: t("stats.reports") },
  ];

  return (
    <main id="main">
      {/* Hero banner */}
      <section
        data-hero-frame
        className="relative flex min-h-svh items-end overflow-hidden bg-sand-950 pb-28 pt-[calc(var(--header-height)+4rem)] sm:pb-32"
      >
        <Image
          src={fellowship.banner.url}
          alt={localize(fellowship.banner.alt, locale)}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-sand-950 via-sand-950/70 to-sand-950/30"
        />

        <Container className="relative">
          <Reveal className="max-w-3xl">
            <Eyebrow tone="onDark">{t("hero.eyebrow")}</Eyebrow>

            <Heading as="h1" level="h1" tone="onDark" className="mt-5">
              {name}
            </Heading>

            <Text size="xl" tone="onDark" className="mt-5 max-w-2xl">
              {localize(fellowship.tagline, locale)}
            </Text>

            <div className="mt-8 flex flex-wrap gap-3">
              <Badge variant="onDark" size="md">
                <CalendarClock aria-hidden />
                {t("meets", { schedule: localize(fellowship.schedule, locale) })}
              </Badge>

              {fellowship.memberCount ? (
                <Badge variant="onDark" size="md">
                  <Users aria-hidden />
                  {t("membersLabel", { count: fellowship.memberCount })}
                </Badge>
              ) : null}
            </div>
          </Reveal>
        </Container>

        <ScrollCue className="pointer-events-none absolute inset-x-0 bottom-8" />
      </section>

      {/* At a glance */}
      <Section spacing="md">
        <Reveal>
          <p className="label mb-5 flex items-center gap-2.5 text-[var(--muted-foreground)]">
            <span aria-hidden className="h-px w-6 rule-section" />
            {t("atAGlance")}
          </p>
          <StatLedger items={glance} />
        </Reveal>
      </Section>

      {/* About & Vision */}
      <Section spacing="lg">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-7">
            <SectionHeading index="01" title={t("sections.about")} />
            <Reveal>
              <Prose paragraphs={localizeAll(fellowship.about, locale)} lead />
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal direction="left">
              <Card variant="muted" padded="lg" className="h-full">
                <h2 className="font-display text-xl font-semibold text-[var(--primary)]">
                  {t("sections.vision")}
                </h2>
                <Text size="lg" tone="muted" className="mt-4">
                  {localize(fellowship.vision, locale)}
                </Text>
              </Card>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* Committee */}
      <Section spacing="lg" tone="muted">
        <SectionHeading index="02" title={t("sections.committee")} />

        {fellowship.committee.length === 0 ? (
          <EmptyState message={t("empty.committee")} />
        ) : (
          // Arched portrait medallions, centred so any number sits balanced -
          // the same arch language as the clergy and church committee. A member
          // with a photograph shows it; the gilded monogram stands in until one
          // is uploaded.
          <StaggerGroup
            className="flex flex-wrap justify-center gap-x-8 gap-y-10"
            amount={0.15}
          >
            {fellowship.committee.map((member) => {
              const memberName = localize(member.name, locale);

              return (
                <StaggerItem key={member.id} className="w-full max-w-[13rem]">
                  <figure className="group text-center">
                    <div className="window-arch relative mx-auto aspect-[4/5] w-full overflow-hidden bg-brand-800 shadow-card ring-1 ring-[var(--border)]">
                      {member.image ? (
                        <Image
                          src={member.image.url}
                          alt={localize(member.image.alt, locale)}
                          fill
                          sizes="(max-width: 640px) 60vw, 13rem"
                          className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
                        />
                      ) : (
                        <span className="grid size-full place-items-center font-display text-4xl font-semibold text-white/85">
                          {initials(memberName)}
                        </span>
                      )}
                      <div
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-sand-950/40 to-transparent"
                      />
                    </div>

                    <figcaption className="mt-4">
                      <p className="font-display text-base font-semibold">
                        {memberName}
                      </p>
                      <span
                        aria-hidden
                        className="mx-auto mt-2 block h-px w-8 rule-section"
                      />
                      <p className="label mt-2 text-[var(--muted-foreground)]">
                        {localize(member.designation, locale)}
                      </p>
                    </figcaption>
                  </figure>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        )}
      </Section>

      {/* Events */}
      <Section spacing="lg">
        <SectionHeading index="03" title={t("sections.events")} />

        {events.length === 0 ? (
          <EmptyState message={t("empty.events")} />
        ) : (
          <StaggerGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {events.map((event) => (
              <StaggerItem key={event.id} className="h-full">
                <EventCard event={event} locale={locale} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>

      {/* Reports & reflections - this fellowship's blog posts */}
      <Section spacing="lg" tone="muted">
        <SectionHeading index="04" title={t("sections.reports")} />

        {posts.length === 0 ? (
          <EmptyState message={t("empty.reports")} />
        ) : (
          <StaggerGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {posts.map((post) => (
              <StaggerItem key={post.id} className="h-full">
                <BlogCard post={post} locale={locale} className="h-full" />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>

      {/* Gallery - this fellowship's own event albums, plus any shared
          churchwide albums, each opening into its own set of photos. */}
      <Section spacing="lg">
        <SectionHeading index="05" title={t("sections.gallery")} />

        {albums.length === 0 ? (
          <EmptyState message={t("empty.gallery")} />
        ) : (
          <StaggerGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <StaggerItem key={album.id}>
                <GalleryCard album={album} locale={locale} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>

      {/* Announcements */}
      <Section spacing="lg" tone="muted">
        <SectionHeading index="06" title={t("sections.announcements")} />

        {announcements.length === 0 ? (
          <EmptyState message={t("empty.announcements")} />
        ) : (
          <StaggerGroup className="grid gap-6 sm:grid-cols-2 lg:gap-8">
            {announcements.map((announcement) => (
              <StaggerItem key={announcement.id}>
                <AnnouncementCard announcement={announcement} locale={locale} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>

      {/* Documents */}
      <Section spacing="lg">
        <SectionHeading index="07" title={t("sections.documents")} />

        {documents.length === 0 ? (
          <EmptyState message={t("empty.documents")} />
        ) : (
          <StaggerGroup className="grid gap-6 sm:grid-cols-2 lg:gap-8">
            {documents.map((file) => (
              <StaggerItem key={file.id}>
                <DownloadCard file={file} locale={locale} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>

      {/* Contact */}
      <Section spacing="lg" tone="muted" containerSize="md">
        <SectionHeading index="08" title={t("sections.contact")} align="center" />

        <Reveal>
          <Card variant="solid" padded="lg" className="text-center">
            <Text tone="muted">{t("contactBlurb")}</Text>

            <p className="mt-6 font-display text-lg font-semibold">
              {localize(fellowship.coordinator.name, locale)}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {fellowship.coordinator.email ? (
                <a
                  href={`mailto:${fellowship.coordinator.email}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm transition-colors hover:border-brand-300 hover:text-[var(--primary)]"
                >
                  <Mail aria-hidden className="size-4" />
                  {fellowship.coordinator.email}
                </a>
              ) : null}

              {fellowship.coordinator.phone ? (
                <a
                  href={`tel:${fellowship.coordinator.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm transition-colors hover:border-brand-300 hover:text-[var(--primary)]"
                >
                  <Phone aria-hidden className="size-4" />
                  {fellowship.coordinator.phone}
                </a>
              ) : null}
            </div>
          </Card>
        </Reveal>
      </Section>
    </main>
  );
}
