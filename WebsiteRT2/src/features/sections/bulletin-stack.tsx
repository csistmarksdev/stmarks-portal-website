"use client";

import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef } from "react";

import { Container } from "@/components/ui/container";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { useHeroUnderHeader } from "@/hooks/use-hero-under-header";
import { approachRange, pinnedRange } from "@/lib/scroll-offsets";
import { cn } from "@/lib/utils";

export interface BulletinStackProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Describes the picture for assistive tech. */
  label: string;
}

/**
 * How long the stage holds the page, in screens, on top of the one it fills.
 *
 * One, like the stages either side of it. By this point in the document the
 * reader has been held six times, and a seventh at the full 1.6 is the page
 * taking the wheel rather than a chapter opening.
 */
const HOLD = 1;

/** How fast the lamp wanders, in cycles per second, when the page is still. */
const IDLE_SPEED = 0.045;

/** How far the lamp rises and falls over that breath, as a fraction. */
const BREATH = 0.06;

/** How many bulletins are in the pile, and how many are taken over the pin. */
const PILE = 9;
const TAKEN = 4;

/** Where the taking starts and finishes, as fractions of the pin. */
const TAKE_START = 0.12;
const TAKE_END = 0.9;

/** How long one bulletin takes to be lifted and carried off. */
const TAKE_SPAN = 0.34;

/**
 * The bulletin, in a 160x100 field.
 *
 * A5 upright, which is what a parish bulletin actually is - a sheet of A4
 * folded once - and the pile sits above the middle of the field rather than on
 * it. The frame is filled with `slice`, so a wide screen sees roughly the
 * middle four fifths of these hundred units and the caption's ground covers the
 * lower two fifths of what is left; a pile centred in the field is a pile
 * behind the words.
 */
const SHEET = { width: 42, height: 56, x: 80, y: 42 };

/**
 * How the pile lies.
 *
 * `[dx, dy, tilt]` per bulletin, bottom of the pile first. Nobody squares a
 * pile of bulletins on a table, and a stack of perfectly aligned rectangles is
 * the single thing that would make this read as a diagram of a stack rather
 * than as a stack. Written out rather than generated: there are nine of them
 * and the hand in the arrangement is the point of it.
 */
const LIE: [number, number, number][] = [
  [0, 0, -1.6],
  [0.7, -0.55, 0.9],
  [-0.5, -1.1, -0.4],
  [1.1, -1.65, 1.8],
  [-0.9, -2.2, -1.1],
  [0.4, -2.75, 0.5],
  [-1.2, -3.3, -1.9],
  [0.9, -3.85, 1.2],
  [-0.3, -4.4, -0.7],
];

/**
 * The pile of bulletins by the door.
 *
 * The chapter has just said what there is to take away, and the block below it
 * is a list of files with sizes beside them. That is the right way to *use* the
 * chapter and the wrong way to open it: a size in kilobytes says what a
 * document weighs and never says what one is. What these are, in a parish, is
 * the pile on the table by the door - the week's bulletin, the order of
 * service, the form for the thing you meant to sign up for - and what you do
 * with that pile is take one off the top.
 *
 * So the page stops on the pile, lit by the lamp above it, and over the hold
 * the top bulletin lifts and is carried off, and then the next, and the next.
 * The pile never runs out, because it never does.
 *
 * ## What stood here before, and what it taught
 *
 * A folded order of service opening out, which read as a wireframe - pale
 * parchment on a pale ground with its own creases showing through as a grid.
 * Then drops of ink spreading on a sheet, which read as a stain, and a stain is
 * not something a parish's documents chapter should be opening on. Both of
 * those failures come back to the same two things, and this is built around
 * them:
 *
 * **Contrast.** The sheets are warm white and the room is dark. Nothing here
 * can wash out the way paper on parchment did, and the lamp is what the picture
 * is made of rather than a wash laid over it.
 *
 * **Nothing that has to be recognised.** A bulletin at this size is a lit
 * rectangle with a cross at its head and four short lines under it. There is no
 * construction to get wrong, and what little is printed on it is a mark and a
 * few rules rather than lettering - at this size real words would be either
 * unreadable scribble or, worse, readable, which would put a bulletin on the
 * stage the parish never printed.
 *
 * ## Against the other stages
 *
 * `FallingPages`, one chapter up, is the other stage made of paper and is the
 * opposite gesture: many sheets, far off, in the air, going past. This is one
 * pile, close, on a table, being taken from. That chapter is about writing that
 * was done; this one is about a thing being put into somebody's hands.
 *
 * Under `prefers-reduced-motion` the pile is rendered whole and at rest, with
 * no pin and nothing moving. See `still`.
 */
export function BulletinStack({
  eyebrow,
  title,
  subtitle,
  label,
}: BulletinStackProps) {
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
   * pile is on the table before the pin starts; the pin only takes from it.
   */
  const { scrollYProgress: arrival } = useScroll({
    target: outerRef,
    offset: approachRange(),
  });

  /*
   * Nothing taken, as a number.
   *
   * Zero rather than one here, unlike the other stages: the finished state of
   * this picture is a pile four bulletins shorter, and a still rendering that
   * showed that would be a stage whose whole subject had already happened. At
   * rest it is the full pile, which is what is actually on the table on any
   * given Sunday morning.
   */
  const still = useMotionValue(0);
  const drive = pinned ? scrollYProgress : still;

  const inView = useInView(outerRef, { amount: 0.05 });
  const clock = useMotionValue(0);

  useAnimationFrame((_, delta) => {
    if (!inView || !pinned) return;
    clock.set(clock.get() + (delta / 1000) * IDLE_SPEED);
  });

  /*
   * The lamp's wander.
   *
   * The only thing here that moves without the reader. A pile of paper under a
   * perfectly steady light is a photograph of a pile of paper; a lamp that
   * breathes is a room with somebody in it.
   */
  const lamp = useTransform(
    clock,
    (value) => 1 + Math.sin(value * Math.PI * 2) * BREATH,
  );

  /* The room comes up on the approach, the pile untouched. */
  const dawn = useTransform(arrival, [0.1, 0.6], [0, 1], { clamp: true });

  const pool = useTransform(drive, [0, 0.6], [0.82, 1], { clamp: true });
  const poolGlow = useTransform(() => pool.get() * lamp.get());

  /* The caption, which arrives with the room and stays for the rest of the pin. */
  const copyOpacity = useTransform(arrival, [0.2, 0.75], [0, 1], { clamp: true });
  const copyLift = useTransform(arrival, [0.2, 0.75], [22, 0], { clamp: true });
  const copyTransform = useMotionTemplate`translate3d(0, ${copyLift}px, 0)`;

  return (
    <div
      ref={outerRef}
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
        {/* The lamp over the table. */}
        <motion.div
          aria-hidden
          style={{ opacity: poolGlow }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_58%_at_50%_36%,color-mix(in_oklab,var(--color-accent-400)_26%,transparent),transparent_66%)]"
        />

        <motion.div style={{ opacity: dawn }} className="absolute inset-0">
          <svg
            viewBox="0 0 160 100"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 size-full"
          >
            <defs>
              {/* A sheet is lit from the lamp's side and falls away from it. */}
              <linearGradient id="bulletin-face" x1="0.1" y1="0" x2="0.85" y2="1">
                <stop offset="0%" stopColor="var(--color-sand-50)" />
                <stop offset="52%" stopColor="var(--color-sand-100)" />
                <stop offset="100%" stopColor="var(--color-sand-400)" />
              </linearGradient>

              <filter id="bulletin-shadow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="1.4" />
              </filter>
            </defs>

            {/* The table the pile sits on: one soft shadow under all of it, so
                the stack is standing on something rather than floating. */}
            <ellipse
              cx={SHEET.x}
              cy={SHEET.y + SHEET.height / 2 + 1.5}
              rx={SHEET.width * 0.72}
              ry="3.4"
              fill="var(--color-sand-950)"
              filter="url(#bulletin-shadow)"
              opacity={0.75}
            />

            {LIE.map((lie, index) => (
              <Bulletin
                key={index}
                index={index}
                lie={lie}
                drive={drive}
                lamp={lamp}
              />
            ))}
          </svg>
        </motion.div>

        {/* The ground the caption is set on, so no bulletin runs through a word. */}
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
 * Three decimal places.
 *
 * Every number that reaches a transform goes through this, and it is a
 * hydration fix rather than a tidiness one: framer renders transforms to a
 * rounded string on the server and to full precision in the browser, so a value
 * like `1.0171208604356807` arrives as `scale(1.01712)` in the HTML and
 * `scale(1.0171208604356807)` on hydration, and React reports the tree as
 * mismatched. A value that is already short is the same string on both sides.
 */
function round(value: number): number {
  return Number(value.toFixed(3));
}

/**
 * When the bulletin at `index` is lifted, as fractions of the pin.
 *
 * Only the top `TAKEN` of the pile are ever taken, and they go in order from
 * the top down. Everything below is still on the table when the stage ends,
 * which is the point: a parish's bulletin table is never empty on a Sunday.
 */
function take(index: number): [number, number] | null {
  const nth = PILE - 1 - index;
  if (nth >= TAKEN) return null;

  const step = (TAKE_END - TAKE_START - TAKE_SPAN) / (TAKEN - 1);
  const start = TAKE_START + nth * step;

  return [start, start + TAKE_SPAN];
}

/**
 * One bulletin: on the pile, and then taken off it.
 *
 * Its own component because each needs motion values derived from its own place
 * in the pile, and a hook cannot be called in a loop.
 *
 * The lift is one number doing four things at once - it raises the sheet,
 * turns it a little, brings it toward the reader and fades it as it leaves the
 * lamp. A hand does all four of those in one movement and none of them
 * separately, which is why they are one transform here rather than four
 * animations that would have to be timed against each other.
 */
function Bulletin({
  index,
  lie,
  drive,
  lamp,
}: {
  index: number;
  lie: [number, number, number];
  /** The pin, 0 to 1. */
  drive: MotionValue<number>;
  /** The lamp's own wander. */
  lamp: MotionValue<number>;
}) {
  const [dx, dy, tilt] = lie;
  const window = take(index);

  /*
   * How far this one has been taken, 0 to 1.
   *
   * Eased out hard: a hand lifts a sheet off a pile quickly and then carries it
   * away steadily, and a linear rise reads as a sheet being winched.
   */
  const lift = useTransform(drive, window ?? [0, 1], window ? [0, 1] : [0, 0], {
    clamp: true,
    ease: (value) => 1 - (1 - value) ** 2.2,
  });

  /*
   * Where it is, and how it is held.
   *
   * Framer's own `x`/`y`/`rotate`/`scale` rather than a transform string, and
   * the reason is worth writing down because it cost this stage a render: a
   * string here is *CSS* transform syntax, not the SVG `transform` attribute
   * they look identical to. `translate(80 42)` is a valid attribute and an
   * invalid CSS declaration - no comma, no units - so the browser discards the
   * whole property and every bulletin in the pile draws at the origin of the
   * viewBox, stacked in the top-left corner of the frame.
   *
   * Handing framer the parts instead means framer builds the declaration, and
   * it also sets `transform-box: fill-box` with it, so the rotation is about
   * the sheet's own middle rather than about the middle of the viewBox.
   */
  const x = useTransform(() => round(lift.get() * 13));
  const y = useTransform(() => round(lift.get() * -74));
  const rotate = useTransform(() => round(tilt + lift.get() * 9));
  const scale = useTransform(() => round(1 + lift.get() * 0.22));

  /* It fades as it leaves the lamp, not as it leaves the frame. */
  const opacity = useTransform(() => 1 - Math.max(0, lift.get() - 0.55) / 0.45);

  /* The light on its face follows the lamp, and a lifted sheet catches more of
     it as it comes up toward the shade. */
  const face = useTransform(() => lamp.get() * (1 + lift.get() * 0.12));

  const half = { w: SHEET.width / 2, h: SHEET.height / 2 };

  return (
    /*
     * Where it lies on the table is a static attribute on an outer group, and
     * only what the hand does to it is animated. Two reasons: the resting place
     * is not a moving thing and has no business being recomputed every frame,
     * and an attribute transform is in the SVG's own units with its own origin,
     * which is the coordinate space the pile was laid out in.
     */
    <g transform={`translate(${SHEET.x + dx} ${SHEET.y + dy})`}>
      <motion.g style={{ x, y, rotate, scale, opacity }}>
        {/* The shadow this sheet throws on the one under it. */}
        <rect
          x={-half.w + 1.2}
          y={-half.h + 1.8}
          width={SHEET.width}
          height={SHEET.height}
          rx="0.8"
          fill="var(--color-sand-950)"
          filter="url(#bulletin-shadow)"
          opacity={0.55}
        />

        <motion.rect
          x={-half.w}
          y={-half.h}
          width={SHEET.width}
          height={SHEET.height}
          rx="0.8"
          fill="url(#bulletin-face)"
          style={{ opacity: face }}
        />

        {/* The fold, down the middle: a bulletin is a sheet of A4 folded once,
            and the crease is the only structure on it. */}
        <line
          x1={0}
          y1={-half.h + 1}
          x2={0}
          y2={half.h - 1}
          stroke="var(--color-sand-400)"
          strokeWidth="0.22"
          opacity={0.55}
        />

        {/*
          The masthead.

          A cross and four rules, all on the left leaf, all well inside the
          margin. It is a mark and some rules rather than lettering: at this size
          real words would be either unreadable scribble or - worse - readable,
          which would put a bulletin on the stage the parish never printed.
        */}
        <g transform={`translate(${-half.w / 2} ${-half.h + 12})`}>
          <path
            d="M0 -4.4V3.2M-2.8 -1.6h5.6"
            stroke="var(--color-accent-600)"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity={0.85}
          />
          <line
            x1={-6}
            y1={7}
            x2={6}
            y2={7}
            stroke="var(--color-accent-600)"
            strokeWidth="0.5"
            opacity={0.7}
          />

          {[12, 15, 18, 21].map((y, line) => (
            <line
              key={y}
              x1={-7.5}
              y1={y}
              x2={[5.5, 7.5, 3, 6.5][line]}
              y2={y}
              stroke="var(--color-sand-500)"
              strokeWidth="0.38"
              strokeLinecap="round"
              opacity={0.55}
            />
          ))}
        </g>
      </motion.g>
    </g>
  );
}
