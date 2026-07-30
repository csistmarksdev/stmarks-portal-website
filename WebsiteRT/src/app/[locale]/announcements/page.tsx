import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AnnouncementCard } from "@/components/cards/announcement-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHero } from "@/components/common/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Section, SectionHeading } from "@/components/ui/section";
import { HERO_SLIDES } from "@/content/hero-slides";
import { routing, type Locale } from "@/i18n/routing";
import { getAnnouncements, getPinnedAnnouncement } from "@/services";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "announcements.meta" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function AnnouncementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);

  const locale = rawLocale as Locale;

  const [t, announcements, pinned] = await Promise.all([
    getTranslations("announcements"),
    getAnnouncements(),
    getPinnedAnnouncement(),
  ]);

  // The pinned notice gets its own block, so keep it out of the list below.
  const rest = announcements.filter((a) => a.id !== pinned?.id);

  return (
    <main id="main">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        images={HERO_SLIDES.announcements}
      />

      {pinned ? (
        <Section spacing="md">
          <Reveal>
            <AnnouncementCard
              announcement={pinned}
              locale={locale}
              variant="featured"
            />
          </Reveal>
        </Section>
      ) : null}

      <Section spacing="lg" tone={pinned ? "muted" : "default"}>
        <SectionHeading title={t("latest")} />

        {rest.length === 0 ? (
          <EmptyState message={t("empty")} />
        ) : (
          <StaggerGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {rest.map((announcement) => (
              <StaggerItem key={announcement.id}>
                <AnnouncementCard announcement={announcement} locale={locale} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>
    </main>
  );
}
