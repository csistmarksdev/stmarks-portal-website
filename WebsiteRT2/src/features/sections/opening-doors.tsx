"use client";

import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Container } from "@/components/ui/container";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { useHeroUnderHeader } from "@/hooks/use-hero-under-header";
import { approachRange, pinnedRange } from "@/lib/scroll-offsets";
import { cn } from "@/lib/utils";

export interface OpeningDoorsProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Describes the picture for assistive tech. */
  label: string;
}

/**
 * How long the stage holds the page, in screens, on top of the one it fills.
 *
 * One, like the two stages before it - see the note on the announcements
 * stage. This is the eighth held screen of the document and the last thing
 * before the form, and the last thing before a form should not be the longest
 * thing on the page.
 */
const HOLD = 1;

/** How fast the light beyond the doors breathes, in cycles per second. */
const IDLE_SPEED = 0.045;

/** How much of that light the breath is worth. */
const BREATH = 0.05;

/** When the doors start moving and when they are fully open. */
const SWING_START = 0.08;
const SWING_END = 0.86;

/**
 * The doors of the church, opening.
 *
 * This is the last chapter of the document and the last picture in it, and it
 * has one job the other seven do not: to end. Everything above has been the
 * parish describing itself - who serves it, who belongs to it, what it does
 * through the year, what it has written down and photographed, what it is
 * announcing, what there is to take away. The only thing left to say is come
 * in, and the only honest way to draw that is a door being opened from the
 * inside.
 *
 * So the page stops on a dark west front with a seam of light down the middle,
 * and over the hold the two leaves swing back until the light has the whole
 * frame - and the reader is handed to the form and the map below in daylight
 * rather than in the dark the rest of this stage lives in.
 *
 * ## The swing
 *
 * Both leaves are hinged on the jambs and turned in real perspective -
 * `rotateY` about the outer edge, under one `perspective` on the frame so both
 * are seen from one eye. The shading is the same number: a leaf square to the
 * reader is fully dark, and it catches the light on its inner face as it comes
 * round, which is what stops the doors reading as two rectangles sliding apart.
 *
 * The light beyond them is not a shape that grows. It is a fixed field that the
 * doors were covering, which is what a door actually is - the one detail that
 * makes an opening read as an opening and not as a wipe.
 *
 * ## Against the other stages
 *
 * It is the only one that changes the room it is in. The other seven end
 * looking much as they began - a figure drawn, a year filled, a wall still
 * travelling. This one begins nearly black and ends nearly white, because it is
 * the hinge of the whole document: everything above is the church talking about
 * itself, and everything below is how to reach it.
 *
 * Under `prefers-reduced-motion` the doors are rendered open and the light up,
 * with no pin and nothing moving. See `still`.
 */
export function OpeningDoors({
  eyebrow,
  title,
  subtitle,
  label,
}: OpeningDoorsProps) {
  const outerRef = useRef<HTMLDivElement>(null);

  /*
   * The bar opens back out over this stage, exactly as it does over a hero.
   * The stage is a dark, full-bleed screen of the same kind - a glass pill
   * riding over it would be the one opaque object on an otherwise unbroken
   * frame. Registered on the outer block, which is the span of scroll over
   * which the pinned frame owns the screen.
   */
  useHeroUnderHeader(outerRef);

  const shouldReduceMotion = useReducedMotion();
  const pinned = !shouldReduceMotion;

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: pinnedRange(),
  });

  /*
   * The approach, as its own progress - see the note on the other stages. The
   * doors are standing there shut before the pin starts; the pin opens them.
   */
  const { scrollYProgress: arrival } = useScroll({
    target: outerRef,
    offset: approachRange(),
  });

  const still = useMotionValue(1);
  const drive = pinned ? scrollYProgress : still;

  const inView = useInView(outerRef, { amount: 0.05 });
  const clock = useMotionValue(0);

  useAnimationFrame((_, delta) => {
    if (!inView || !pinned) return;
    clock.set(clock.get() + (delta / 1000) * IDLE_SPEED);
  });

  const breath = useTransform(
    clock,
    (value) => 1 + Math.sin(value * Math.PI * 2) * BREATH,
  );

  /* 0 is shut, 1 is wide. */
  const swing = useTransform(drive, [SWING_START, SWING_END], [0, 1], {
    clamp: true,
  });

  /*
   * The leaves.
   *
   * Not quite ninety degrees: a door at exactly square-on to the wall is a door
   * with no thickness, and the last few degrees are where a real one stops
   * anyway. The near leaf takes a degree more than the far one, because two
   * doors opened by two people never arrive together.
   */
  const leftAngle = useTransform(() => swing.get() * 86);
  const rightAngle = useTransform(() => swing.get() * -83);
  const leftTransform = useMotionTemplate`rotateY(${leftAngle}deg)`;
  const rightTransform = useMotionTemplate`rotateY(${rightAngle}deg)`;

  /* A leaf square to the reader is dark; it catches the light coming round. */
  const leafShade = useTransform(() => 0.82 - 0.5 * swing.get());

  /*
   * The light beyond.
   *
   * It is up from the first frame at low strength - the seam between the shut
   * doors - and comes to full as they open. What grows is not the light but the
   * amount of it the reader can see, which is the whole difference between a
   * door and a wipe.
   */
  const beyond = useTransform(drive, [0, SWING_END], [0.35, 1], { clamp: true });
  const beyondGlow = useTransform(() => beyond.get() * breath.get());

  /* The ground goes from the dark of the porch to the daylight of the nave. */
  const ground = useTransform(drive, [0.2, 1], [0, 1], { clamp: true });

  /* The frame comes up on the approach: the doors, shut, before anything. */
  const dawn = useTransform(arrival, [0.1, 0.6], [0, 1], { clamp: true });

  /*
   * The caption, which arrives *with the doors* rather than on the approach.
   *
   * The one stage where the words wait, and for the reason the picture exists:
   * "come in" said to a shut door is a caption, and said as it opens it is the
   * end of the document. The frame is never blank without them - the doors are
   * up from the approach - so they can afford to.
   */
  const copyOpacity = useTransform(drive, [0.45, 0.85], [0, 1], { clamp: true });
  const copyLift = useTransform(drive, [0.45, 0.85], [20, 0], { clamp: true });
  const copyTransform = useMotionTemplate`translate3d(0, ${copyLift}px, 0)`;

  return (
    <div
      ref={outerRef}
      // Hidden altogether in Simple mode - see globals.css.
      data-motion-scene
      style={pinned ? { height: `calc(100svh + ${HOLD * 100}svh)` } : undefined}
      className="relative"
    >
      <motion.div
        role="img"
        aria-label={label}
        className={cn(
          "relative overflow-hidden bg-sand-950",
          pinned ? "sticky top-0 h-[100dvh]" : "h-[80svh] min-h-[30rem]",
        )}
      >
        {/* The room the reader is let into. Behind everything, and it does not
            move: the doors are what change, not the light. */}
        <motion.div
          aria-hidden
          style={{ opacity: beyondGlow }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_78%_at_50%_46%,var(--color-accent-100),color-mix(in_oklab,var(--color-accent-300)_70%,transparent)_46%,color-mix(in_oklab,var(--color-accent-600)_45%,transparent)_78%)]"
        />

        {/* The porch floor takes the daylight as the doors come back. */}
        <motion.div
          aria-hidden
          style={{ opacity: ground }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-[linear-gradient(to_top,color-mix(in_oklab,var(--color-accent-200)_55%,transparent),transparent)]"
        />

        <motion.div
          style={{ opacity: dawn, perspective: "1600px" }}
          className="absolute inset-0"
        >
          {/* The left leaf, hinged on its jamb. */}
          <motion.div
            style={{
              transform: leftTransform,
              transformOrigin: "left center",
              transformStyle: "preserve-3d",
            }}
            className="absolute inset-y-0 left-0 w-1/2 will-change-transform"
          >
            <Leaf shade={leafShade} side="left" />
          </motion.div>

          {/* The right leaf. */}
          <motion.div
            style={{
              transform: rightTransform,
              transformOrigin: "right center",
              transformStyle: "preserve-3d",
            }}
            className="absolute inset-y-0 right-0 w-1/2 will-change-transform"
          >
            <Leaf shade={leafShade} side="right" />
          </motion.div>
        </motion.div>

        {/* The ground the caption is set on. Warmer than the other stages'
            because by the time the words are up, the frame behind them is
            daylight rather than ink. */}
        <motion.div
          aria-hidden
          style={{ opacity: ground }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[color-mix(in_oklab,var(--color-sand-950)_72%,transparent)] to-transparent"
        />

        <Container className="absolute inset-x-0 bottom-0 pb-14 sm:pb-16">
          <motion.div
            style={{ opacity: copyOpacity, transform: copyTransform }}
            className="mx-auto max-w-2xl text-center"
          >
            <Eyebrow tone="onDark">{eyebrow}</Eyebrow>

            <Heading as="h3" level="h2" tone="onDark" className="mt-4 text-balance">
              {title}
            </Heading>

            <span aria-hidden className="mx-auto mt-5 block h-px w-16 rule-gild" />

            <Text size="sm" tone="onDark" className="mt-5 text-pretty">
              {subtitle}
            </Text>
          </motion.div>
        </Container>
      </motion.div>
    </div>
  );
}

/**
 * One leaf of the door.
 *
 * Boarded and banded, which is as much detail as a door at this size can carry:
 * vertical boards, two iron bands across, and a ring. Any more and it becomes a
 * drawing of a door rather than a dark shape with a door's weight, which is the
 * mistake the blog chapter took two attempts to stop making.
 *
 * The shade is handed in rather than derived here so both leaves are on exactly
 * one number - two doors catching the light by different amounts is two doors
 * in two rooms.
 */
function Leaf({
  shade,
  side,
}: {
  shade: ReturnType<typeof useTransform<number, number>>;
  side: "left" | "right";
}) {
  return (
    <div className="absolute inset-0 backface-hidden">
      {/* The oak. */}
      <div className="absolute inset-0 bg-[var(--color-sand-900)]" />

      {/* The boards. */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: 7 }, (_, index) => (
          <span
            key={index}
            className="h-full flex-1 border-r border-[color-mix(in_oklab,var(--color-sand-950)_75%,transparent)] last:border-r-0"
          />
        ))}
      </div>

      {/* The bands, and the ring on the meeting edge. */}
      <span className="absolute inset-x-0 top-[28%] h-[1.5%] bg-[color-mix(in_oklab,var(--color-sand-950)_82%,transparent)]" />
      <span className="absolute inset-x-0 top-[68%] h-[1.5%] bg-[color-mix(in_oklab,var(--color-sand-950)_82%,transparent)]" />
      <span
        className={cn(
          "absolute top-1/2 size-[3.4vmin] -translate-y-1/2 rounded-full border-[0.5vmin] border-[var(--color-sand-950)]",
          side === "left" ? "right-[6%]" : "left-[6%]",
        )}
      />

      {/* The light it takes as it comes round. */}
      <motion.div
        style={{ opacity: shade }}
        className="absolute inset-0 bg-sand-950"
      />
    </div>
  );
}
