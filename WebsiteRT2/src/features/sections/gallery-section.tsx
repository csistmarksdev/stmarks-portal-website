import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { GalleryCard } from "@/components/cards/gallery-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHero } from "@/components/common/page-hero";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { ROUTES, SECTION_IDS, heroDirection } from "@/constants/site";
import { HERO_SLIDES } from "@/content/hero-slides";
import { GalleryWall } from "@/features/sections/gallery-wall";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import { getGallery } from "@/services";

/**
 * How many albums the chapter carries before it hands over to the archive.
 *
 * Six, because the grid is three across from `lg` and two from `sm`: six fills
 * exactly two rows at both widths and three at the smallest, so the block ends
 * on a straight edge instead of a ragged one at every breakpoint the site has.
 * A limit that leaves a lone card on a final row is the usual way this reads
 * as truncation rather than as a selection.
 */
const CHAPTER_ALBUMS = 6;

/**
 * The albums.
 *
 * The six most recent here; the whole archive at `/gallery`, which is a page
 * again. The rest of the site folded its pages into this document, and this is
 * the one place that could not follow all the way: albums accumulate forever,
 * and a chapter that grows by three tiles after every festival eventually
 * buries the two chapters beneath it. So the chapter keeps what is current and
 * the archive keeps everything.
 *
 * An album still opens into its own page of photographs, as it always did.
 */
export async function GallerySection() {
  const locale = (await getLocale()) as Locale;

  const [t, albums] = await Promise.all([
    getTranslations("gallery"),
    getGallery(CHAPTER_ALBUMS),
  ]);

  /*
   * The reel: one photograph per album, in the order the chapter lists them.
   *
   * The album covers rather than a hand-picked set, so the stage is always
   * showing what the parish most recently published and there is no second list
   * of imagery for anyone to keep in step with the first. Resolved to plain
   * strings here because `GalleryWall` is a client component: the URLs and
   * the alt text cross the boundary, `localize` does not.
   */
  const reel = albums.map((album) => ({
    src: album.cover.url,
    alt: localize(album.cover.alt, locale),
  }));

  return (
    <div id={SECTION_IDS.gallery}>
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        images={HERO_SLIDES.gallery}
        variant="section"
        direction={heroDirection(SECTION_IDS.gallery)}
      />

      {/*
        The photographs, before the index of photographs.

        The hero has just said what this chapter is, and the block below answers
        it the only way a grid can - six tiles, six titles, six photo counts.
        That is the right way to *use* the chapter and the wrong way to open it:
        it hands the reader an album of photographs at the size of a postcard.
        So the chapter opens on the photographs themselves - all of them, at
        once, in five columns of tall arched openings travelling past each other
        in opposite directions. Nothing waits its turn and nothing gives way to
        anything: there is no current photograph and no next one, and the
        reader's eye picks whichever opening it wants, which is what people do
        with a wall of pictures and never do with a slideshow.

        The same pin the other four chapters open on, deliberately - and the one
        of the five with nothing drawn in it. Every other stage is a made thing
        because its chapter has no picture of its own lying about; this one
        does, and a gallery opening on an illustration of a gallery would be the
        single stage on this page arguing with its own subject. See the note at
        the head of `gallery-wall.tsx`.

        Rendered only when there are albums: an empty reel is a black screen
        with a hold on it, and the grid below already says the archive is empty
        in words.

        `spacing="none"` and `contained={false}`: the stage *is* the section.
        `atmosphere={false}` because the stage brings its own grade.
      */}
      {reel.length > 0 ? (
        <Section spacing="none" tone="dark" contained={false} atmosphere={false}>
          <GalleryWall
            frames={reel}
            eyebrow={t("reel.eyebrow")}
            title={t("reel.title")}
            subtitle={t("reel.subtitle")}
            label={t("reel.label")}
          />
        </Section>
      ) : null}

      <Section spacing="lg">
        <SectionHeading
          title={t("albums")}
          action={
            albums.length > 0 ? (
              <Button asChild variant="secondary">
                <Link href={ROUTES.albumArchive}>
                  {t("viewAll")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : undefined
          }
        />

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
      </Section>
    </div>
  );
}
