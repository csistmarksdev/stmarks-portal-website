import { getLocale, getTranslations } from "next-intl/server";

import { AnnouncementCard } from "@/components/cards/announcement-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHero } from "@/components/common/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Section, SectionHeading } from "@/components/ui/section";
import { PassingFlame } from "@/features/sections/passing-flame";
import { SECTION_IDS, heroDirection } from "@/constants/site";
import { HERO_SLIDES } from "@/content/hero-slides";
import type { Locale } from "@/i18n/routing";
import { getAnnouncements, getPinnedAnnouncement } from "@/services";

/**
 * Notices from the church office, the pinned one leading.
 *
 * Was `/announcements`.
 */
export async function AnnouncementsSection() {
  const locale = (await getLocale()) as Locale;

  const [t, announcements, pinned] = await Promise.all([
    getTranslations("announcements"),
    getAnnouncements(),
    getPinnedAnnouncement(),
  ]);

  // The pinned notice gets its own block, so keep it out of the list below.
  const rest = announcements.filter((a) => a.id !== pinned?.id);

  return (
    <div id="announcements">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        images={HERO_SLIDES.announcements}
        variant="section"
        direction={heroDirection(SECTION_IDS.announcements)}
      />

      {/*
        The passing, before the notices.

        The hero has just said what the parish is announcing, and the block
        below answers it the only way a list can - notice after notice, each
        with a date on it. That is the right way to *use* the chapter and the
        wrong way to open it: a board says what was announced and never says
        what announcing is. In a parish it is one person telling the person
        beside them, so the chapter opens on that - one candle lit at the front
        of a dark congregation, and the light going outward through the ranks
        until the room is full of it.

        Shorter than the first five stages at `HOLD = 1`: this is the sixth
        held screen of the document, and a sixth at full length reads as the
        page taking the wheel rather than as a chapter opening. See the note at
        the head of `passing-flame.tsx`.
      */}
      <Section spacing="none" tone="dark" contained={false} atmosphere={false}>
        <PassingFlame
          eyebrow={t("vigil.eyebrow")}
          title={t("vigil.title")}
          subtitle={t("vigil.subtitle")}
          label={t("vigil.label")}
        />
      </Section>

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
    </div>
  );
}
