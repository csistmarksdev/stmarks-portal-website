"use client";

import { motion, useTransform } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ScrollCue } from "@/components/common/scroll-cue";
import { SplitText } from "@/components/common/split-text";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { ROUTES, sectionHref } from "@/constants/site";
import { HeroScene } from "@/features/cinematic/hero-scene";
import { Link } from "@/i18n/navigation";
import { useHeroScroll } from "@/providers/hero-scroll-provider";

export interface HeroStageProps {
  /** Server-rendered content panels, sequenced across the cinematic scroll. */
  welcome: ReactNode;
  timings: ReactNode;
  events: ReactNode;
}

/**
 * Sequences the home page's opening sections across the cinematic scroll.
 *
 * Rather than stacking below the frame sequence, each section is a "scene"
 * pinned over the video, morphing into the next as the frames advance. The
 * panels themselves are server components passed in as children, so they
 * still read their data through the service layer.
 */
export function HeroStage({ welcome, timings, events }: HeroStageProps) {
  const t = useTranslations("home.hero");
  const tSite = useTranslations("site");

  const { progress } = useHeroScroll();

  const cueOpacity = useTransform(progress, [0, 0.05], [1, 0]);

  return (
    // `data-hero-stage`: the mobile-landscape block in globals.css compresses
    // the panels inside this to fit a 400px-tall viewport. Inert elsewhere.
    <div data-hero-stage className="relative h-full">
      {/* Legibility scrim over the full frame, since panels sit centred. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/30"
      />

      {/* 1 - identity */}
      <HeroScene
        progress={progress}
        start={0}
        end={0.13}
        className="items-end pb-24 sm:pb-28"
      >
        <Container>
          {/*
            `data-hero-reveal`: the splash hands the page over to this block.

            While the opening frame is up its three lines are held just below
            their places and clipped; the moment the curtain starts to lift they
            rise into position one after another, so the first thing the reader
            sees of the site is its name arriving rather than a heading that was
            already sitting there. The whole behaviour lives in the reveal
            section of `globals.css` and is driven by attributes the splash sets
            on the root element - nothing here knows about it, and a document
            whose JavaScript never runs shows these lines normally.
          */}
          <div data-hero-reveal className="max-w-3xl">
            {/*
              Each line is split into letters so they can arrive one after
              another as the splash lifts - see `SplitText`, which handles the
              Tamil correctly, and the hand-over section of `globals.css`, which
              owns the timing.

              Each line counts its own letters from zero, and the three are
              offset from one another by a per-line delay in the stylesheet
              rather than by a running total here. That is deliberate: the two
              languages have different letter counts, so a hand-written offset
              that made the Tamil cascade correctly would be wrong for the
              English and would go quietly wrong again the first time anyone
              edited the copy.
            */}
            <Eyebrow tone="onDark">
              <SplitText>{t("scenes.opening.eyebrow")}</SplitText>
            </Eyebrow>

            <Heading
              as="h1"
              level="display"
              tone="onDark"
              className="mt-6 drop-shadow-lg"
            >
              <SplitText>{tSite("name")}</SplitText>
            </Heading>

            <Text size="xl" tone="onDark" className="mt-5 max-w-lg drop-shadow">
              <SplitText>{tSite("tagline")}</SplitText>
            </Text>
          </div>
        </Container>
      </HeroScene>

      {/* 2 - welcome */}
      <HeroScene
        progress={progress}
        start={0.21}
        end={0.36}
        className="items-center"
      >
        {welcome}
      </HeroScene>

      {/* 3 - service timings */}
      <HeroScene
        progress={progress}
        start={0.44}
        end={0.58}
        className="items-center"
      >
        {timings}
      </HeroScene>

      {/* 4 - upcoming events */}
      <HeroScene
        progress={progress}
        start={0.66}
        end={0.8}
        className="items-center"
      >
        {events}
      </HeroScene>

      {/* 5 - invitation */}
      <HeroScene
        progress={progress}
        start={0.89}
        end={1}
        fade={0.07}
        className="items-center"
      >
        <Container>
          <div className="max-w-3xl">
            <Eyebrow tone="onDark">{t("scenes.gathering.eyebrow")}</Eyebrow>

            <Heading
              as="p"
              level="h1"
              tone="onDark"
              className="mt-5 drop-shadow-lg"
            >
              {t("scenes.gathering.title")}
            </Heading>

            <Text size="xl" tone="onDark" className="mt-5 max-w-xl drop-shadow">
              {t("scenes.gathering.body")}
            </Text>

            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="onDark">
                <Link href={sectionHref("service-timings")}>
                  {t("scenes.gathering.cta")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>

              <Button asChild size="lg" variant="onDark">
                <Link href={ROUTES.contact}>
                  <MapPin aria-hidden />
                  {t("scenes.gathering.secondaryCta")}
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </HeroScene>

      {/* Scroll cue */}
      <motion.div
        style={{ opacity: cueOpacity }}
        className="pointer-events-none absolute inset-x-0 bottom-8"
      >
        <ScrollCue />
      </motion.div>
    </div>
  );
}
