"use client";

import { motion, useTransform } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ScrollCue } from "@/components/common/scroll-cue";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { ROUTES } from "@/constants/site";
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
  const barScale = useTransform(progress, [0, 1], [0, 1]);

  return (
    <div className="relative h-full">
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
          <div className="max-w-3xl">
            <Eyebrow tone="onDark">{t("scenes.opening.eyebrow")}</Eyebrow>

            <Heading
              as="h1"
              level="display"
              tone="onDark"
              className="mt-6 drop-shadow-lg"
            >
              {tSite("name")}
            </Heading>

            <Text size="xl" tone="onDark" className="mt-5 max-w-lg drop-shadow">
              {tSite("tagline")}
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
                <Link href={`${ROUTES.about}#service-timings`}>
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

      {/* Progress rule */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/15"
        role="progressbar"
        aria-label={t("progressLabel")}
      >
        <motion.div
          style={{ scaleX: barScale }}
          className="h-full origin-left bg-accent-300/80"
        />
      </div>
    </div>
  );
}
