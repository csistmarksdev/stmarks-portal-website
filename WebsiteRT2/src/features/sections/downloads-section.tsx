import { getLocale, getTranslations } from "next-intl/server";

import { DownloadCard } from "@/components/cards/download-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHero } from "@/components/common/page-hero";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Section, SectionHeading } from "@/components/ui/section";
import { BulletinStack } from "@/features/sections/bulletin-stack";
import { SECTION_IDS, heroDirection } from "@/constants/site";
import { HERO_SLIDES } from "@/content/hero-slides";
import type { Locale } from "@/i18n/routing";
import { getDownloadsGrouped } from "@/services";
import type { DownloadCategory } from "@/types/content";

const CATEGORIES: DownloadCategory[] = ["bulletin", "form", "document"];

/**
 * Bulletins, forms and documents to take away.
 *
 * Was `/downloads`, and keeps a block per category - `#bulletin`, `#form`,
 * `#document`.
 */
export async function DownloadsSection() {
  const locale = (await getLocale()) as Locale;

  const [t, grouped] = await Promise.all([
    getTranslations("downloads"),
    getDownloadsGrouped(),
  ]);

  return (
    <div id="downloads">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        images={HERO_SLIDES.downloads}
        variant="section"
        direction={heroDirection(SECTION_IDS.downloads)}
      />

      {/*
        The pile, before the file list.

        The hero has just said what there is to take away, and the block below
        answers it the only way a file list can - a name, a format and a size.
        That is the right way to *use* the chapter and the wrong way to open it:
        a size in kilobytes says what a document weighs and never says what one
        is. What these are, in a parish, is the pile on the table by the door,
        and what you do with that pile is take one off the top.

        Two pictures stood here first and both failed, in ways worth recording
        because they are the same two traps the blog chapter fell into. A folded
        order of service read as a wireframe - pale parchment on a pale ground
        with its own creases showing through as a grid. Drops of ink spreading
        on a sheet read as a stain, which is not something a parish's documents
        chapter should open on at all. Warm white paper in a dark room fixes the
        first, and a pile of bulletins under a lamp cannot be mistaken for the
        second. See the note at the head of `bulletin-stack.tsx`.
      */}
      <Section spacing="none" tone="dark" contained={false} atmosphere={false}>
        <BulletinStack
          eyebrow={t("bulletin.eyebrow")}
          title={t("bulletin.title")}
          subtitle={t("bulletin.subtitle")}
          label={t("bulletin.label")}
        />
      </Section>

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
    </div>
  );
}
