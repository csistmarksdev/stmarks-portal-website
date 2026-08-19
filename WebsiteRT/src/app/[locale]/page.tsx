import { setRequestLocale } from "next-intl/server";

import { SectionDivider } from "@/components/common/section-divider";
import { CinematicHero } from "@/features/cinematic/cinematic-hero";
import { AnnouncementsSection } from "@/features/home/announcements-section";
import { ContactPreview } from "@/features/home/contact-preview";
import { FellowshipCards } from "@/features/home/fellowship-cards";
import {
  HeroEventsPanel,
  HeroTimingsPanel,
  HeroWelcomePanel,
} from "@/features/home/hero-panels";
import { HeroStage } from "@/features/home/hero-stage";
import { LeadershipPreview } from "@/features/home/leadership-preview";
import { PastorMessageSection } from "@/features/home/pastor-message";
import { RecentGallery } from "@/features/home/recent-gallery";
import { VerseOfWeek } from "@/features/home/verse-of-week";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main">
      {/*
        Welcome, service timings and upcoming events play out *inside* the
        cinematic sequence as pinned scenes. The longer scroll length gives
        each scene room to morph into the next.
      */}
      <CinematicHero scrollLength={8}>
        <HeroStage
          welcome={<HeroWelcomePanel />}
          timings={<HeroTimingsPanel />}
          events={<HeroEventsPanel />}
        />
      </CinematicHero>

      <LeadershipPreview />
      <AnnouncementsSection />
      <FellowshipCards />
      <RecentGallery />

      {/* A breath before the meditative block - the pastor's word and the
          week's verse - where the page turns from parish life to worship. */}
      <SectionDivider />

      <PastorMessageSection />
      <VerseOfWeek />
      <ContactPreview />
    </main>
  );
}
