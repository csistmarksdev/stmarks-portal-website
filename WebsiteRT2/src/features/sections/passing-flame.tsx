"use client";

import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Container } from "@/components/ui/container";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { useHeroUnderHeader } from "@/hooks/use-hero-under-header";
import { approachRange, pinnedRange } from "@/lib/scroll-offsets";
import { cn } from "@/lib/utils";

export interface PassingFlameProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Describes the picture for assistive tech. */
  label: string;
}

/**
 * How long the stage holds the page, in screens, on top of the one it fills.
 *
 * One rather than the 1.6 the first five stages take, and the reason is the
 * page rather than this picture. By the time a reader reaches announcements
 * they have been held on five full screens already; a sixth at the same length
 * stops reading as a chapter opening and starts reading as the page taking the
 * wheel again. The gesture is the same, said in two thirds of the breath.
 */
const HOLD = 1;

/** How fast the flames move on their own, in cycles per second. */
const IDLE_SPEED = 0.4;

/** Where the light starts and where the last candle takes it. */
const SPREAD_START = 0.1;
const SPREAD_END = 0.88;

/**
 * The congregation, in a 160x100 field.
 *
 * Not a scatter, and not rows either. Two of the stages before this are lights
 * on a dark ground already, and a third would be the same picture a third time -
 * so these are arranged the way people actually stand at a vigil, which is
 * around something rather than in front of it.
 *
 * Each rank is an arc bowing toward the reader at its ends: the middle of a
 * rank is the furthest part of it, and the two ends come round and down until
 * they are nearly at the front of the frame. Five of those nested inside one
 * another is a crowd standing in the round with the reader inside the circle,
 * and it is the arrangement rather than the lights that keeps this from being
 * the constellation stage again.
 *
 * `y` is where a rank stands at its *centre* and `BOW` how far its ends come
 * forward from there. Every rank runs off both edges of the field: a
 * congregation does not end where the frame does.
 *
 * The whole arrangement sits higher than the middle of the field on purpose.
 * The frame is filled with `slice`, so a wide screen sees roughly the middle
 * four fifths of these hundred units, and the caption's ground covers the
 * lower two fifths of what is left - put the front rank at the foot of the
 * field and the nearest, largest, first-lit candles are the ones behind the
 * words.
 */
const BOW = 9.5;

const RANKS: { y: number; size: number; count: number }[] = [
  { y: 50, size: 1, count: 13 },
  { y: 43, size: 0.86, count: 15 },
  { y: 36.5, size: 0.72, count: 17 },
  { y: 30.5, size: 0.6, count: 19 },
  { y: 25, size: 0.48, count: 21 },
];

/**
 * Where each candle stands, and when the flame reaches it.
 *
 * `[x, y, size, order]`, built from the ranks above rather than written out -
 * at eighty-five candles a hand-kept table is a table nobody will ever correct,
 * and the only things worth stating by hand are the shape of the crowd and how
 * far it bows.
 *
 * The jitter comes from a fixed integer hash rather than `Math.random`, so the
 * congregation stands in exactly the same places on the server and on the
 * client and there is nothing to reconcile on hydration. Integer arithmetic
 * throughout, which is exact in JavaScript and therefore the same number on
 * every engine - a float-based hash would not be.
 *
 * Two things follow from the bow and both are free. A candle at the end of a
 * rank is nearer the reader, so it is drawn larger by the same number that
 * brought it forward - one curve, not a curve and a size table. And `order` is
 * measured from the middle of the front rank through the crowd as it actually
 * stands, so the light runs *along* each arc before it steps back to the next
 * one, which is how a flame passes down a row of people holding candles.
 */
const CANDLES: [number, number, number, number][] = (() => {
  let seed = 0x9e37;

  /** A signed half-unit of wobble, deterministic and exact. */
  const wobble = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return ((seed >>> 16) & 0xffff) / 0xffff - 0.5;
  };

  const standing = RANKS.flatMap(({ y, size, count }) => {
    const pitch = 172 / (count - 1);

    return Array.from({ length: count }, (_, index) => {
      const x = -6 + index * pitch + wobble() * pitch * 0.36;

      /* How far out along the arc this one stands, 0 at the middle and 1 at
         the ends. Squared, because a rank of people curving round is an arc
         and not a chevron. */
      const out = Math.min(1, Math.abs(x - 80) / 86) ** 2;

      return {
        x,
        y: y + BOW * out + wobble() * 1.6,
        /* Nearer, so larger - off the same number that brought it forward. */
        size: size * (1 + 0.24 * out) * (1 + wobble() * 0.12),
      };
    });
  });

  /* The first candle: the middle of the front rank, which the bow leaves as
     the one furthest from every edge. */
  const origin = standing.reduce((nearest, candle) =>
    Math.abs(candle.x - 80) < Math.abs(nearest.x - 80) &&
    candle.y >= nearest.y - BOW
      ? candle
      : nearest,
  );

  const reached = standing.map((candle) => ({
    ...candle,
    /* The vertical is weighted half again, so the light goes to a neighbour on
       the same arc before it steps back to the rank behind. */
    reach: Math.hypot(candle.x - origin.x, (candle.y - origin.y) * 1.5),
  }));

  const furthest = Math.max(...reached.map((candle) => candle.reach));

  return reached.map(({ x, y, size, reach }) => [
    Number(x.toFixed(2)),
    Number(y.toFixed(2)),
    Number(size.toFixed(3)),
    Number((reach / furthest).toFixed(3)),
  ]);
})();

/**
 * Three decimal places.
 *
 * Every number that reaches a transform goes through this, and it is a
 * hydration fix rather than a tidiness one. Each candle's flicker is offset by
 * its own index, so at the very first frame - clock still at zero - it is
 * already some irrational fraction rather than a round 1. Framer renders that
 * to a rounded string on the server and to full precision in the browser, so
 * `scale(1.01712)` arrives in the HTML and `scale(1.0171208604356807)` is set
 * on hydration, and React reports the whole tree as mismatched. A value that is
 * already short is the same string on both sides.
 */
function round(value: number): number {
  return Number(value.toFixed(3));
}

/**
 * A flame passed along, one candle to the next.
 *
 * The chapter has just said what the parish is announcing, and the block below
 * it is a list of notices. That is the right way to *use* the chapter and the
 * wrong way to open it: a notice board says *what* was announced and never says
 * what announcing is. What it is, in a parish, is one person telling the person
 * beside them - which is the oldest picture the church has of itself and the
 * one every congregation has stood in on Christmas Eve.
 *
 * So the page stops, one candle is lit at the front, and over the hold the
 * light goes outward through the ranks until the whole room is alight. Nothing
 * goes out again.
 *
 * ## Against the other stages
 *
 * Two of the five before this are already lights on a dark ground, and the
 * thing that keeps this from being a third is the *arrangement*, not the
 * lights. `FellowshipConstellation` is a sky: points scattered evenly, at one
 * scale, with lines drawn between them into a figure. This is a crowd: ranks
 * low in the frame, near ones large and sharp, far ones small and soft, nothing
 * drawn between any of them and no figure at the end of it. One is a chart of
 * the heavens; the other is a room with people standing in it.
 *
 * The spread runs outward from the middle of the front rank rather than across
 * the frame, because that is how a light actually passes through a
 * congregation - to the neighbour, and to theirs - and it is the one detail
 * that stops this reading as a wipe.
 *
 * Under `prefers-reduced-motion` the room is rendered fully lit, with no pin
 * and nothing moving. See `still`.
 */
export function PassingFlame({
  eyebrow,
  title,
  subtitle,
  label,
}: PassingFlameProps) {
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
   * The approach, as its own progress.
   *
   * `scrollYProgress` above is exactly zero for the whole screen-height during
   * which this section is climbing into view, because the pin has not started
   * yet. Gating the picture on it is what gave the earlier stages a blank
   * screen before they began.
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

  /* How far the light has gone through the ranks, 0 to 1. */
  const spread = useTransform(drive, [SPREAD_START, SPREAD_END], [0, 1], {
    clamp: true,
  });

  /* The room comes up on the approach: the candles unlit, before any flame. */
  const dawn = useTransform(arrival, [0.1, 0.6], [0, 1], { clamp: true });

  /* The light the room gathers as it fills. */
  const glow = useTransform(drive, [0.1, 0.92], [0, 1], { clamp: true });

  /* The caption, which arrives with the room and stays for the rest of the pin. */
  const copyOpacity = useTransform(arrival, [0.2, 0.75], [0, 1], { clamp: true });
  const copyLift = useTransform(arrival, [0.2, 0.75], [22, 0], { clamp: true });
  const copyTransform = useMotionTemplate`translate3d(0, ${copyLift}px, 0)`;

  return (
    <div
      ref={outerRef}
      // Hidden altogether in Simple mode - see globals.css.
      data-motion-scene
      style={pinned ? { height: `calc(100svh + ${HOLD * 100}svh)` } : undefined}
      className="relative"
    >
      <div
        role="img"
        aria-label={label}
        className={cn(
          "relative overflow-hidden bg-sand-950",
          pinned ? "sticky top-0 h-[100dvh]" : "h-[80svh] min-h-[30rem]",
        )}
      >
        {/* The light the room gathers. Under the candles, so it reads as their
            light on the air rather than as a lamp behind them. */}
        <motion.div
          aria-hidden
          style={{ opacity: glow }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(115%_72%_at_50%_44%,color-mix(in_oklab,var(--color-accent-600)_32%,transparent),transparent_64%)]"
        />

        <motion.div style={{ opacity: dawn }} className="absolute inset-0">
          <svg
            viewBox="0 0 160 100"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 size-full"
          >
            <defs>
              {/* A candle's glow, as a gradient rather than a blurred disc. It
                  is the same soft-edged circle to the eye, but a Gaussian blur
                  is re-rendered on the CPU for every candle on every frame the
                  flicker moves it - eighty-odd of them - and on a phone that
                  was most of the frame budget. A gradient costs nothing. */}
              <radialGradient id="flame-halo">
                <stop offset="0%" stopColor="var(--color-accent-400)" stopOpacity="1" />
                <stop offset="35%" stopColor="var(--color-accent-400)" stopOpacity="0.9" />
                <stop offset="55%" stopColor="var(--color-accent-400)" stopOpacity="0.55" />
                <stop offset="78%" stopColor="var(--color-accent-400)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--color-accent-400)" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Back ranks first, so a near candle's glow falls in front of a far
                one rather than behind it. */}
            {[...CANDLES]
              .sort((a, b) => a[1] - b[1])
              .map(([x, y, size, order], index) => (
                <Candle
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  size={size}
                  order={order}
                  index={index}
                  spread={spread}
                  clock={clock}
                />
              ))}
          </svg>
        </motion.div>

        {/* The ground the caption is set on, so no flame sits inside a word. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-sand-950 via-sand-950/85 to-transparent"
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
      </div>
    </div>
  );
}

/**
 * One candle, taking the light.
 *
 * Its own component because each needs motion values derived from its own place
 * in the spread, and a hook cannot be called in a loop.
 *
 * A flame is three things: the taper it stands on, the flame itself, and the
 * light it throws. All three are driven by one number - how far the spread has
 * got past this candle - so a candle cannot be alight without its own glow, and
 * there is nothing to keep in step by hand. `size` does the depth: a far candle
 * is smaller, dimmer and blurred by the same factor at once, which is what a
 * lens does and what an arbitrary per-candle opacity would not.
 */
function Candle({
  x,
  y,
  size,
  order,
  index,
  spread,
  clock,
}: {
  x: number;
  y: number;
  size: number;
  /** When the flame reaches this candle, as a fraction of the spread. */
  order: number;
  index: number;
  spread: MotionValue<number>;
  /** The flames' own clock, for the flicker. */
  clock: MotionValue<number>;
}) {
  /* Monotonic: once a candle is lit it stays lit. The ramp is short, so a
     candle catches rather than fades up. */
  const lit = useTransform(() =>
    Math.min(1, Math.max(0, (spread.get() - order) / 0.045)),
  );

  /*
   * The flicker.
   *
   * Two sines at different rates, so it never settles into a pulse - a flame
   * that throbs on one period reads as a loading indicator. Each candle takes
   * its own offset from its index, so thirty of them are never in step.
   */
  const flicker = useTransform(() => {
    const t = clock.get() * Math.PI * 2 + index * 1.7;
    return round(1 + Math.sin(t) * 0.08 + Math.sin(t * 2.3) * 0.05);
  });

  const flameScale = useTransform(() => round(lit.get() * flicker.get()));
  const flameTransform = useMotionTemplate`translate(${x}px, ${y}px) scale(${flameScale})`;

  /*
   * Softer per candle than it was at thirty of them, and it has to be: a halo
   * is additive, so tripling the congregation triples the light in the middle
   * of the frame and the front rank blows out into one white bloom. The room is
   * no brighter than before; it is just lit by more things.
   */
  const halo = useTransform(() => round(lit.get() * flicker.get() * 0.34));
  const haloTransform = useMotionTemplate`translate(${x}px, ${y}px) scale(${flicker})`;

  const height = 3.4 * size;

  return (
    <g>
      {/* The light it throws. */}
      <motion.circle
        // The blur this replaced spread the disc by ~3σ (4.8 units).
        r={4.9 * size + 4.8}
        cy={-height * 0.4}
        fill="url(#flame-halo)"
        style={{ opacity: halo, transform: haloTransform }}
      />

      {/* The taper. Always there, lit or not - a dark congregation holding
          unlit candles is the first frame of this, not an empty room. */}
      <rect
        x={x - 0.28 * size}
        y={y - height * 0.1}
        width={0.56 * size}
        height={2.6 * size}
        rx={0.28 * size}
        fill="var(--color-sand-700)"
        opacity={0.55}
      />

      {/* The flame. */}
      <motion.path
        d={`M0 ${-height} C${0.62 * size} ${-height * 0.58} ${0.5 * size} ${-height * 0.12} 0 0 C${-0.5 * size} ${-height * 0.12} ${-0.62 * size} ${-height * 0.58} 0 ${-height}Z`}
        fill="var(--color-accent-200)"
        style={{ transform: flameTransform, opacity: lit }}
      />
    </g>
  );
}
