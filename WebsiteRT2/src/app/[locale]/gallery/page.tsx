import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { GalleryCard } from "@/components/cards/gallery-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageMasthead } from "@/components/common/page-masthead";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getGallery } from "@/services";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gallery.meta" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

/**
 * The album archive - every album the parish has published.
 *
 * The counterpart to the gallery chapter on the home page, which carries only
 * the six most recent. This is the one subject that could not fold into the
 * single document for good: albums accumulate without limit, and a chapter
 * that grows after every festival eventually buries the ones below it.
 *
 * It reuses the chapter's own hero and heading strings rather than inventing a
 * second set, so the two read as the same subject at two depths, and it closes
 * with a way back to the chapter it came from - a page reached from an in-page
 * button needs a door back to that button, not just the browser's own.
 */
export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);

  const locale = rawLocale as Locale;

  const [t, tCommon, tNav, albums] = await Promise.all([
    getTranslations("gallery"),
    getTranslations("common"),
    getTranslations("nav"),
    getGallery(),
  ]);

  return (
    <main id="main">
      <PageMasthead
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
      />

      <Section spacing="lg">
        {albums.length === 0 ? (
          <EmptyState message={t("empty")} />
        ) : (
          // Uniform 4:3 tiles - the card's own aspect ratio sets the height.
          <StaggerGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <StaggerItem key={album.id}>
                <GalleryCard album={album} locale={locale} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}

        <div className="mt-14 flex justify-center">
          <Button asChild variant="secondary">
            <Link href={ROUTES.gallery}>
              <ArrowLeft aria-hidden />
              {tCommon("backTo", { page: tNav("gallery") })}
            </Link>
          </Button>
        </div>
      </Section>
    </main>
  );
}
