import { setRequestLocale } from "next-intl/server";

import { SectionDivider } from "@/components/common/section-divider";
import { CinematicHero } from "@/features/cinematic/cinematic-hero";
import { WelcomeSequence } from "@/features/cinematic/welcome-sequence";
import {
  HeroEventsPanel,
  HeroTimingsPanel,
  HeroWelcomePanel,
} from "@/features/home/hero-panels";
import { HeroStage } from "@/features/home/hero-stage";
import { PastorMessageSection } from "@/features/home/pastor-message";
import { VerseOfWeek } from "@/features/home/verse-of-week";
import { AboutSection } from "@/features/sections/about-section";
import { AnnouncementsSection } from "@/features/sections/announcements-section";
import { BlogSection } from "@/features/sections/blog-section";
import { ContactSection } from "@/features/sections/contact-section";
import { DownloadsSection } from "@/features/sections/downloads-section";
import { EventsSection } from "@/features/sections/events-section";
import { FellowshipsSection } from "@/features/sections/fellowships-section";
import { GallerySection } from "@/features/sections/gallery-section";
import { LeadershipSection } from "@/features/sections/leadership-section";

/**
 * The site.
 *
 * Not the home page - the site. Everything the parish publishes is here, in one document: about, leadership, fellowships,
 * events, the blog index, the gallery, announcements and downloads, each as a
 * full chapter rather than the teaser it used to be. The four preview blocks
 * that stood in for them (`LeadershipPreview`, `FellowshipCards`,
 * `RecentGallery`, and the home page's announcements strip) are gone: a
 * preview of something three screens further down the same page is not a
 * preview, it is the same content twice.
 *
 * Order is deliberate. The cinematic sequence opens, and it already carries
 * the welcome, the service times and the next gatherings as pinned scenes. The
 * chapters then run from who the parish is, through who serves it and who
 * belongs to it, out to what it is doing - events, writing, photographs,
 * notices - and end on the practical: what there is to take away. The
 * meditative block closes, as it always did, and hands the reader to Contact -
 * which is a chapter now too, form and map and all, rather than the preview of
 * a page it used to be.
 *
 * Each chapter opens with its own full-bleed photograph, which is what does
 * the work a route change used to do: it tells the reader a new subject has
 * started without them having to read a word.
 */
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

      {/*
        The sequence continues. Where the hero's 300 frames end inside the
        church, these 240 open on the cross and the Bible against light, and
        hold on the composed still at frame 131 for long enough to say the
        welcome before the cross comes forward and blooms the frame out to the
        colour of the page itself - which is what hands the reader to the
        chapters below.
      */}
      <WelcomeSequence />

      {/* Who the parish is, and who keeps it. */}
      <AboutSection />
      <LeadershipSection />
      <FellowshipsSection />

      {/* What it is doing. */}
      <EventsSection />
      <BlogSection />
      <GallerySection />
      <AnnouncementsSection />
      <DownloadsSection />

      {/* A breath before the meditative block - the pastor's word and the
          week's verse - where the page turns from parish life to worship. */}
      <SectionDivider />

      <PastorMessageSection />
      <VerseOfWeek />
      <ContactSection />
    </main>
  );
}
