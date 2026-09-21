import { getLocale, getTranslations } from "next-intl/server";

import { FellowshipCard } from "@/components/cards/fellowship-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHero } from "@/components/common/page-hero";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Section } from "@/components/ui/section";
import { SECTION_IDS, heroDirection } from "@/constants/site";
import { HERO_SLIDES } from "@/content/hero-slides";
import { FellowshipConstellation } from "@/features/sections/fellowship-constellation";
import type { Locale } from "@/i18n/routing";
import { bentoSpans } from "@/lib/bento";
import { cn } from "@/lib/utils";
import { getFellowships } from "@/services";

/**
 * Column span to the class that applies it, and the `sizes` hint that goes
 * with it.
 *
 * Written out per span rather than composed as `lg:col-span-${n}` because
 * Tailwind resolves classes by scanning the source - an interpolated name is a
 * class that exists in the markup and in no stylesheet. The mosaic only exists
 * from `lg`: below that there is no room for a wide tile to be wide, so the
 * grid falls back to one even column, then two.
 */
const BENTO_TILE: Record<number, { span: string; sizes: string }> = {
  1: { span: "", sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" },
  2: { span: "lg:col-span-2", sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 66vw" },
  3: { span: "lg:col-span-3", sizes: "100vw" },
};

/**
 * The fellowships, as cards.
 *
 * Was `/fellowships`. Each card still opens the fellowship's own page: eight
 * full fellowship records cannot live inside one scroll, so those stay routes.
 */
export async function FellowshipsSection() {
  const locale = (await getLocale()) as Locale;

  const [t, tCommon, fellowships] = await Promise.all([
    getTranslations("fellowships"),
    getTranslations("common"),
    getFellowships(),
  ]);

  const spans = bentoSpans(fellowships.length);

  return (
    <div id="fellowships">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        images={HERO_SLIDES.fellowships}
        variant="section"
        direction={heroDirection(SECTION_IDS.fellowships)}
      />

      {/*
        The sky, before the cards.

        The hero has just said "find your people" and the bento below answers it
        the only way a list can - eight plates, eight names, pick one. That is
        the right way to *use* the chapter and the wrong way to open it: it hands
        the reader eight separate things and never says what they are separate
        parts of. So the chapter opens on the whole. The page holds still, a sky
        of ornaments comes out one light at a time, and over the length of the
        hold a line is drawn between them until the ten of them are one figure.

        The same pin the leadership chapter opens on, deliberately - and a
        different picture inside it. See the note at the head of
        `fellowship-constellation.tsx`.

        `spacing="none"` and `contained={false}`: the stage *is* the section. It
        owns a screen and places its figure as a share of it, so the section's
        padding would push it off the screen it is meant to fill and the centred
        measure would cut the sky off short of both edges. `atmosphere={false}`
        because the stage brings its own - a night ground and the light behind
        the finished figure - and the section's parchment glow laid under that
        is one wash too many.
      */}
      <Section spacing="none" tone="dark" contained={false} atmosphere={false}>
        <FellowshipConstellation
          eyebrow={t("constellation.eyebrow")}
          title={t("constellation.title")}
          subtitle={t("constellation.subtitle")}
          label={t("constellation.label")}
        />
      </Section>

      <Section spacing="lg">
        {fellowships.length === 0 ? (
          <EmptyState message={tCommon("noResults")} />
        ) : (
          /*
            A bento: the row height is fixed and the tiles vary in width, so a
            wide tile is a landscape plate and its neighbour a portrait one.

            Widths only - no row spans. Mixed row spans cannot be made to tile
            without `grid-auto-flow: dense`, and dense reorders the tiles on
            screen away from the order the church keeps them in, which is not a
            trade worth making for a taller box. `bentoSpans` guarantees the
            rows always add up, whatever number of fellowships the Portal
            returns.
          */
          <StaggerGroup className="grid auto-rows-[24rem] gap-5 sm:auto-rows-[22rem] sm:grid-cols-2 lg:auto-rows-[30rem] lg:grid-cols-3 lg:gap-6">
            {fellowships.map((fellowship, index) => {
              const tile = BENTO_TILE[spans[index]] ?? BENTO_TILE[1];

              return (
                <StaggerItem
                  key={fellowship.id}
                  className={cn("min-w-0", tile.span)}
                >
                  <FellowshipCard
                    fellowship={fellowship}
                    locale={locale}
                    fill
                    sizes={tile.sizes}
                  />
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        )}
      </Section>
    </div>
  );
}
