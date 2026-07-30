import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DownloadCard } from "@/components/cards/download-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHero } from "@/components/common/page-hero";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Section, SectionHeading } from "@/components/ui/section";
import { HERO_SLIDES } from "@/content/hero-slides";
import { routing, type Locale } from "@/i18n/routing";
import { getDownloadsGrouped } from "@/services";
import type { DownloadCategory } from "@/types/content";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "downloads.meta" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

const CATEGORIES: DownloadCategory[] = ["bulletin", "form", "document"];

export default async function DownloadsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);

  const locale = rawLocale as Locale;

  const [t, grouped] = await Promise.all([
    getTranslations("downloads"),
    getDownloadsGrouped(),
  ]);

  return (
    <main id="main">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        images={HERO_SLIDES.downloads}
      />

      {CATEGORIES.map((category, index) => {
        const files = grouped[category];

        return (
          <Section
            key={category}
            spacing="lg"
            tone={index % 2 === 1 ? "muted" : "default"}
            id={category}
          >
            <SectionHeading title={t(`categories.${category}`)} />

            {files.length === 0 ? (
              <EmptyState message={t("empty")} />
            ) : (
              <StaggerGroup className="grid gap-5 lg:grid-cols-2 lg:gap-6">
                {files.map((file) => (
                  <StaggerItem key={file.id}>
                    <DownloadCard file={file} locale={locale} />
                  </StaggerItem>
                ))}
              </StaggerGroup>
            )}
          </Section>
        );
      })}
    </main>
  );
}
