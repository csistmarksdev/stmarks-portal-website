"use client";

import {
  motion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useTranslations } from "next-intl";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { CrossMark } from "@/components/common/ornament";
import { Container } from "@/components/ui/container";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";

/**
 * Where each element sits inside the pause: fade up, hold, fade away. The four
 * numbers are fractions of the hold, and they are staggered rather than
 * simultaneous - the mark arrives first and the sentence last, so the block
 * assembles itself instead of switching on.
 *
 * They all leave together at 0.70. Staggering the exit as well read as the
 * words being blown off one at a time; a welcome should withdraw in one piece.
 *
 * Mutable arrays, not `as const`: framer-motion's `InputRange` is a mutable
 * `number[]`, and a readonly tuple does not fail on the range - it falls
 * through to the object-map overload of `useTransform`, which type-errors
 * somewhere else entirely.
 */
const BEATS: Record<string, number[]> = {
  mark: [0.1, 0.3, 0.7, 0.9],
  eyebrow: [0.14, 0.34, 0.7, 0.88],
  title: [0.18, 0.4, 0.7, 0.86],
  rule: [0.24, 0.46, 0.7, 0.84],
  body: [0.28, 0.5, 0.7, 0.84],
};

const FADE = [0, 1, 1, 0];

export interface WelcomeTitleProps {
  /** 0 → 1 through the sequence's pause on the composed frame. */
  hold: MotionValue<number>;
}

/**
 * The welcome, shown while the sequence is held on frame 131.
 *
 * The frame it appears over is the cross standing above the open Bible, dead
 * centre - which is exactly where a centred title would want to be. Rather than
 * pushing the words into a corner to avoid it, the light does the work: a warm
 * bloom grows out from behind the cross until it washes the studio to near
 * white, the words resolve inside that light, and then the bloom recedes and
 * gives the scene back. It is the same gesture the sequence ends on 109 frames
 * later, borrowed early and taken back.
 *
 * Everything is driven from `hold`, so it is scrubbed rather than played: the
 * reader controls it, and scrolling back up unmakes it in the same order.
 */
export function WelcomeTitle({ hold }: WelcomeTitleProps) {
  const t = useTranslations("home.welcomeSequence");
  const shouldReduceMotion = useReducedMotion();

  // Stops at 0.82, not at opaque. The cross and the Bible stay faintly visible
  // through it, so the pause reads as light flooding the scene rather than as a
  // white card dropped over a video that has stopped playing.
  const veil = useTransform(hold, [0, 0.28, 0.72, 1], [0, 0.82, 0.82, 0]);
  const bloomOpacity = useTransform(hold, [0, 0.22, 0.75, 1], [0, 1, 1, 0]);
  const bloomScale = useTransform(hold, [0, 0.28, 0.75, 1], [0.5, 1, 1.08, 1.6]);
  // Peaks at 0.4, not 1: at full strength the spokes stop being glare and
  // start being a graphic device drawn over the photograph.
  const raysOpacity = useTransform(
    hold,
    [0.06, 0.36, 0.7, 0.94],
    [0, 0.4, 0.4, 0],
  );
  const raysRotate = useTransform(hold, [0, 1], [-7, 7]);

  const markOpacity = useTransform(hold, BEATS.mark, FADE);
  const markY = useTransform(hold, BEATS.mark, [22, 0, 0, -18]);
  const eyebrowOpacity = useTransform(hold, BEATS.eyebrow, FADE);
  const eyebrowY = useTransform(hold, BEATS.eyebrow, [24, 0, 0, -20]);
  const titleOpacity = useTransform(hold, BEATS.title, FADE);
  const titleY = useTransform(hold, BEATS.title, [30, 0, 0, -24]);
  const titleScale = useTransform(hold, BEATS.title, [0.965, 1, 1, 1.03]);
  const ruleOpacity = useTransform(hold, BEATS.rule, FADE);
  const ruleScale = useTransform(hold, BEATS.rule, [0, 1, 1, 1]);
  const bodyOpacity = useTransform(hold, BEATS.body, FADE);
  const bodyY = useTransform(hold, BEATS.body, [26, 0, 0, -20]);

  /*
   * Taken out of the compositor's work entirely outside the pause. This overlay
   * is pinned at full viewport size over a canvas that repaints on every frame
   * of a 600vh scroll, and for three quarters of that scroll it has nothing to
   * show.
   */
  const visibility = useTransform(hold, (value) =>
    value > 0.001 && value < 0.999 ? "visible" : "hidden",
  );

  const content = (
    <Container>
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <motion.div style={{ opacity: markOpacity, y: markY }}>
          <CrossMark size="lg" tone="gold" />
        </motion.div>

        <motion.div
          style={{ opacity: eyebrowOpacity, y: eyebrowY }}
          className="mt-6"
        >
          <Eyebrow>{t("eyebrow")}</Eyebrow>
        </motion.div>

        <motion.div
          style={{ opacity: titleOpacity, y: titleY, scale: titleScale }}
          className="mt-5 will-change-transform"
        >
          {/*
            `as="p"`: the page's one `h1` is the church name in the cinematic
            hero above. This is the same greeting said a second way, not a new
            top-level heading.

            `whitespace-pre-line` so the newline in the message is the break the
            reader sees. The greeting and the name are two separate lines of a
            display lockup, and where a display line breaks is a typographic
            decision, not something to leave to whatever width the viewport
            happens to be. Wrapping still works underneath it, so a narrow phone
            can break the second line again if it has to.
          */}
          <Heading as="p" level="display" className="whitespace-pre-line">
            {t("title")}
          </Heading>
        </motion.div>

        <motion.span
          aria-hidden
          style={{ opacity: ruleOpacity, scaleX: ruleScale }}
          className="mt-8 h-px w-28 bg-accent-600/60"
        />

        <motion.div
          style={{ opacity: bodyOpacity, y: bodyY }}
          className="mt-7"
        >
          <Text size="xl" tone="muted">
            {t("body")}
          </Text>
        </motion.div>
      </div>
    </Container>
  );

  if (shouldReduceMotion) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          aria-hidden
          className="absolute inset-0 bg-[var(--background)] opacity-[0.88]"
        />
        <div className="relative">{content}</div>
      </div>
    );
  }

  return (
    <motion.div
      style={{ visibility }}
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      {/* The wash. Sits on the page's own parchment, so the frame does not
          brighten to a whiter white than the section it lives in. */}
      <motion.div
        aria-hidden
        style={{ opacity: veil }}
        className="absolute inset-0 bg-[var(--background)]"
      />

      {/* The bloom, centred on the cross rather than on the frame: the light
          reads as coming from behind it, which is the whole point. */}
      <motion.div
        aria-hidden
        style={{ opacity: bloomOpacity, scale: bloomScale }}
        className="absolute inset-0 will-change-transform [background:radial-gradient(circle_at_50%_42%,color-mix(in_oklch,var(--color-accent-200)_70%,white)_0%,color-mix(in_oklch,var(--color-accent-100)_45%,transparent)_38%,transparent_66%)]"
      />

      {/* Rays. Kept faint and slow - a wheel of hard gold spokes is a sunburst
          badge, not light. The radial mask stops them at the edges so they read
          as glare rather than as geometry. */}
      <motion.div
        aria-hidden
        style={{ opacity: raysOpacity, rotate: raysRotate }}
        className="absolute inset-0 will-change-transform [background:repeating-conic-gradient(from_0deg_at_50%_42%,color-mix(in_oklch,var(--color-accent-300)_30%,transparent)_0deg_2deg,transparent_2deg_16deg)] [mask-image:radial-gradient(circle_at_50%_42%,black_0%,transparent_62%)]"
      />

      <div className="relative">{content}</div>
    </motion.div>
  );
}
