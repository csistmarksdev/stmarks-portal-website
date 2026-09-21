import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHero } from "@/components/common/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { Section } from "@/components/ui/section";
import { PhotoGrid } from "@/features/gallery/photo-grid";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/date";
import { localize } from "@/lib/localize";
import { getAlbumBySlug, getAlbumSlugs } from "@/services";

export async function generateStaticParams() {
  const slugs = await getAlbumSlugs();

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
  const album = await getAlbumBySlug(slug);

  if (!album) return {};

  const title = localize(album.title, locale as Locale);
  const description = album.description
    ? localize(album.description, locale as Locale)
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: album.cover.url }],
    },
  };
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  setRequestLocale(rawLocale);

  const locale = rawLocale as Locale;
  const album = await getAlbumBySlug(slug);

  if (!album) notFound();

  const [tCommon, tNav] = await Promise.all([
    getTranslations("common"),
    getTranslations("nav"),
  ]);

  return (
    <main id="main">
      <PageHero
        eyebrow={formatDate(album.date, locale)}
        title={localize(album.title, locale)}
        subtitle={
          album.description ? localize(album.description, locale) : undefined
        }
        // The album's own shots make the best backdrop for it.
        images={album.photos.slice(0, 6).map((photo) => photo.image.url)}
      >
        <Link
          href={ROUTES.gallery}
          className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {tCommon("backTo", { page: tNav("gallery") })}
        </Link>
      </PageHero>

      <Section spacing="lg">
        <Reveal>
          <PhotoGrid photos={album.photos} locale={locale} />
        </Reveal>
      </Section>
    </main>
  );
}
