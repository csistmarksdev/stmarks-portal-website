import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FellowshipCard } from "@/components/cards/fellowship-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHero } from "@/components/common/page-hero";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Section } from "@/components/ui/section";
import { HERO_SLIDES } from "@/content/hero-slides";
import { routing, type Locale } from "@/i18n/routing";
import { getFellowships } from "@/services";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "fellowships.meta" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function FellowshipsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);

  const locale = rawLocale as Locale;

  const [t, tCommon, fellowships] = await Promise.all([
    getTranslations("fellowships"),
    getTranslations("common"),
    getFellowships(),
  ]);

  return (
    <main id="main">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        images={HERO_SLIDES.fellowships}
      />

      <Section spacing="lg">
        {fellowships.length === 0 ? (
          <EmptyState message={tCommon("noResults")} />
        ) : (
          <StaggerGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {fellowships.map((fellowship) => (
              <StaggerItem key={fellowship.id} className="h-full">
                <FellowshipCard fellowship={fellowship} locale={locale} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>
    </main>
  );
}
