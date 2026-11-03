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
import type { ReactElement, ReactNode } from "react";
import { useRef } from "react";

import { Container } from "@/components/ui/container";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { useHeroUnderHeader } from "@/hooks/use-hero-under-header";
import { approachRange, pinnedRange } from "@/lib/scroll-offsets";
import { cn } from "@/lib/utils";

export interface FellowshipConstellationProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Names the chart for assistive tech. */
  label: string;
}

/**
 * How long the stage holds the page, in screens, on top of the one it fills.
 *
 * The same 1.6 the leadership stage takes, and the same for the same reason:
 * the two chapters open on one gesture - the page stops, a picture is made, the
 * page goes on - and a reader who has just been held for two and a half screens
 * on "those who serve" should be held for two and a half screens here. A
 * different budget would read as a different mechanism rather than as the same
 * one saying something else.
 */
const HOLD = 1.6;

/**
 * How fast the sky turns on its own, in cycles per second, when the page is
 * still.
 *
 * The same pulse the leadership stage drifts at. Nothing here loops - the chart
 * is drawn once, forwards, by the scroll - so this drives only the sky's own
 * movement: a degree of rotation and a whisper of lift, on a twenty-second
 * breath. It is what keeps the stage from reading as a freeze-frame the moment
 * a thumb leaves the screen.
 *
 * Runs only while the section is on screen and pinned; see `inView` below.
 */
const IDLE_SPEED = 0.045;

/** How far the sky turns and lifts at the ends of that breath. */
const DRIFT_DEGREES = 0.9;
const DRIFT_LIFT = 0.7;

/**
 * Where the drawing starts and finishes, as fractions of the pin.
 *
 * Before `DRAW_START` the stars are out but unjoined, which is the whole of the
 * first act: a sky of separate lights. After `DRAW_END` the figure is complete
 * and the last of the pin is spent on the light behind it rather than on
 * another line.
 */
const DRAW_START = 0.16;
const DRAW_END = 0.86;

/** How much of the pin one segment takes to draw. They overlap; see `stroke`. */
const DRAW_SPAN = 0.16;

/**
 * How far a line stops short of the ornament at either end, in chart units.
 *
 * A star chart draws the line *between* two lights, not through them. Without
 * the inset every segment would run under a glyph and out the other side, and
 * the ornaments would read as beads threaded on a wire rather than as the
 * points the figure is made of.
 */
const LINK_INSET = 4.6;

/**
 * The figure, in a square hundred-unit field.
 *
 * A cross - the parish's own sign, and the one shape on this site the reader
 * has already met eight times on the way down the page as the hairline mark at
 * the head of every section. That is the point of choosing it over an invented
 * asterism: here it is again at the size of a screen, and assembled out of ten
 * separate things rather than struck in one stroke.
 *
 * Ten ornaments rather than ten identical points, because the chapter is about
 * fellowships and a fellowship is not interchangeable with the one beside it.
 * The dove at the head, the cross at the crossing, the wheat at the foot; lamp
 * and fish out along one arm, bell and anchor along the other. Nobody is asked
 * to decode them - they read as "the things a church keeps", which is the whole
 * of what they have to say.
 *
 * Every coordinate is a degree or two off true. A cross ruled exactly square is
 * a plus sign; the jitter is what makes it a figure somebody traced between
 * stars that were already there.
 */
const NODES = [
  { x: 50.6, y: 8.5, size: 11, glyph: "dove" },
  { x: 49.0, y: 21.5, size: 8.5, glyph: "crown" },
  { x: 50.5, y: 36.0, size: 12, glyph: "cross" },
  { x: 49.3, y: 53.5, size: 9.5, glyph: "chalice" },
  { x: 50.9, y: 71.0, size: 9, glyph: "book" },
  { x: 49.4, y: 90.0, size: 10, glyph: "wheat" },
  { x: 36.5, y: 34.0, size: 9, glyph: "lamp" },
  { x: 21.5, y: 37.5, size: 10.5, glyph: "fish" },
  { x: 64.0, y: 38.0, size: 8.5, glyph: "bell" },
  { x: 78.5, y: 34.5, size: 10, glyph: "anchor" },
] as const;

/**
 * The segments, in the order they are drawn.
 *
 * Out from the crossing, and out in every direction before it goes any further
 * in any one: up, left, right, down, and only then the second reach along each
 * limb. Drawn limb by limb instead, the figure would grow like a plant and the
 * reader would spend the middle of the pin watching a single line inch up the
 * screen. Drawn this way it opens, which is the thing the chapter is about.
 */
const LINKS = [
  [2, 1],
  [2, 6],
  [2, 8],
  [2, 3],
  [1, 0],
  [6, 7],
  [8, 9],
  [3, 4],
  [4, 5],
] as const;

/**
 * The rest of the sky.
 *
 * Stars that are not part of the figure, scattered over the whole screen rather
 * than over the chart - which is what stops the square the figure is drawn in
 * from being visible as a square on a wide monitor. They are also the honest
 * half of the idea: a constellation is a line somebody chose to draw through a
 * sky that was already full.
 *
 * `[x%, y%, radius in px, twinkle delay in seconds]`. Written out rather than
 * seeded, so the sky is the same sky on the server and on the client and there
 * is nothing to reconcile on hydration.
 */
const SKY: [number, number, number, number][] = [
  [4, 12, 1.6, 0],
  [11, 31, 1.1, 1.2],
  [7, 58, 2, 2.6],
  [15, 76, 1.3, 0.7],
  [3, 88, 1.5, 3.1],
  [21, 8, 1.2, 1.9],
  [26, 63, 1.7, 0.4],
  [19, 47, 1, 2.2],
  [31, 84, 1.4, 1.5],
  [35, 17, 1.8, 2.9],
  [42, 92, 1.1, 0.9],
  [39, 5, 1.3, 3.4],
  [47, 27, 1, 1.7],
  [55, 88, 1.6, 2.4],
  [58, 13, 1.2, 0.2],
  [63, 71, 1.4, 3],
  [68, 24, 1.9, 1.1],
  [72, 94, 1.2, 2],
  [76, 51, 1.5, 0.6],
  [81, 15, 1.1, 2.7],
  [85, 68, 1.8, 1.4],
  [88, 37, 1.3, 3.3],
  [93, 82, 1.6, 0.5],
  [96, 21, 1.2, 2.1],
  [90, 6, 1.4, 1.8],
  [66, 43, 1, 2.5],
  [29, 39, 1.2, 0.3],
  [12, 20, 1.7, 2.8],
  [45, 60, 0.9, 1.6],
  [59, 33, 1.1, 3.2],
  [83, 90, 1.3, 1],
  [24, 95, 1.5, 2.3],
];

/** When segment `index` starts and finishes drawing, as fractions of the pin. */
function stroke(index: number): [number, number] {
  const step = (DRAW_END - DRAW_START - DRAW_SPAN) / (LINKS.length - 1);
  const start = DRAW_START + index * step;

  return [start, start + DRAW_SPAN];
}

/**
 * When each ornament is joined to the figure.
 *
 * Derived from `LINKS` rather than written down beside `NODES`, so the two
 * cannot drift: reordering the segments above reorders the lighting for free.
 * The crossing is lit by the first stroke leaving it and so is joined at the
 * moment the drawing begins; everything else at the moment a line reaches it.
 */
const ARRIVALS: number[] = (() => {
  const lit = new Array<number>(NODES.length).fill(DRAW_START);

  LINKS.forEach(([, to], index) => {
    lit[to] = stroke(index)[1];
  });

  return lit;
})();

/**
 * The line between two ornaments, stopped short of both.
 *
 * The inset is clamped rather than simply subtracted: on a short segment two
 * full insets would meet in the middle and invert the line, which draws as
 * nothing at all on some engines and as a stroke pointing the wrong way on
 * others.
 */
function segment(from: number, to: number) {
  const a = NODES[from];
  const b = NODES[to];

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const inset = Math.min(LINK_INSET, length * 0.36);

  const ux = (dx / length) * inset;
  const uy = (dy / length) * inset;

  return { x1: a.x + ux, y1: a.y + uy, x2: b.x - ux, y2: b.y - uy };
}

/**
 * A sky of separate lights, joined into one figure while the page holds still.
 *
 * The chapter has just said "find your people", and the answer this gives is
 * not another grid of them. The page stops, the sky comes out, and over the
 * length of the hold a line is drawn from the cross at the centre to every
 * ornament around it until the whole thing is one shape. The lights are what
 * the parish gathers into; the lines are the church.
 *
 * ## Against the leadership stage
 *
 * The other pinned stage on this page - `LeadershipConstellation`, one chapter
 * up - is the same *scroll* and deliberately not the same *picture*, which is
 * the whole reason this is a second file rather than a `variant` on that one.
 * That stage is a camera: portraits on a loop, coming out of the middle of the
 * screen and past the reader in perspective, turning for as long as it is held.
 * This one is a chart. Nothing travels, nothing loops, nothing comes at you;
 * every point is fixed from the first frame and the only thing that happens is
 * that lines get drawn between them, once, forwards.
 *
 * The two share the mechanism exactly - the same `HOLD`, the same
 * `start start`/`end end` progress on an outer block of the same height, the
 * same idle clock underneath so neither freezes when the reader stops, the same
 * bail-out for reduced motion. Under the thumb they are one gesture used twice;
 * on the screen they are a company arriving and a figure being drawn.
 *
 * ## The pin
 *
 * Progress is read on the outer block, which is zero for the whole time the
 * section is climbing into view and only begins the moment its top meets the
 * top of the viewport. Nothing is drawn before the stage owns the screen.
 *
 * Under `prefers-reduced-motion` the same picture is rendered finished - every
 * star lit, every line drawn - with no pin and nothing moving. Not a plainer
 * substitute for the composition: the composition, at rest. See `still`.
 */
export function FellowshipConstellation({
  eyebrow,
  title,
  subtitle,
  label,
}: FellowshipConstellationProps) {
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
    /*
     * `pinnedRange()` rather than `["start start", "end end"]`: the same range,
     * said the one way that does not crash on a block taller than the screen.
     * See the note on the helper - the string form is handed to a native
     * `ViewTimeline` with the `contain` range, which is empty here, and
     * `Element.animate` throws on the offsets it computes from it.
     */
    offset: pinnedRange(),
  });

  /*
   * The approach, as its own progress.
   *
   * `scrollYProgress` above is exactly zero for the whole screen-height during
   * which this section is climbing into view, because the pin has not started
   * yet - and everything on the stage was gated on it. That is one entire
   * screen of flat empty ground scrolling past before anything appears, which
   * reads as the page having failed to load rather than as a stage about to
   * begin.
   *
   * This runs 0 to 1 over that climb instead - the top of the block travelling
   * from the bottom of the viewport to the top of it - so the picture is
   * already there by the time the pin takes over, and the pin is left to do
   * only the thing it is actually for.
   */
  const { scrollYProgress: arrival } = useScroll({
    target: outerRef,
    offset: approachRange(),
  });

  /*
   * The finished chart, as a number.
   *
   * Everything on the stage reads its state off one value between 0 and 1, so
   * the still rendering is not a second set of components with the animation
   * taken out of them - it is the same components handed a 1. Every window
   * below closes at or before `DRAW_END`, so a constant 1 is the completed
   * figure by construction, and there is only ever one drawing to maintain.
   */
  const still = useMotionValue(1);
  const drive = pinned ? scrollYProgress : still;

  /*
   * The sky's own movement, counted in breaths. Advanced by elapsed time rather
   * than by frames so it is the same on a 60Hz laptop and a 120Hz phone, and
   * only while the stage is pinned and on screen - there is no frame to pay for
   * on a section three screens away.
   */
  const inView = useInView(outerRef, { amount: 0.05 });
  const clock = useMotionValue(0);

  useAnimationFrame((_, delta) => {
    if (!inView || !pinned || scrollYProgress.get() <= 0) return;
    clock.set(clock.get() + (delta / 1000) * IDLE_SPEED);
  });

  const tilt = useTransform(
    clock,
    (value) => Math.sin(value * Math.PI * 2) * DRIFT_DEGREES,
  );
  const lift = useTransform(
    clock,
    (value) => Math.cos(value * Math.PI * 2) * DRIFT_LIFT,
  );
  const skyTransform = useMotionTemplate`translate3d(0, ${lift}%, 0) rotate(${tilt}deg)`;

  /*
   * The sky arrives on the approach: the stars are out well before the stage
   * owns the screen, and long before anything is drawn on them.
   *
   * On `arrival` rather than on the pin, which is the whole of the blank-screen
   * fix - see the note on `arrival` above. The drawing itself still waits for
   * the pin, so nothing about the composition changes; only the question of
   * when the sky is allowed to exist moves.
   */
  const dawn = useTransform(arrival, [0.1, 0.6], [0, 1], { clamp: true });

  /* The copy, which arrives with the sky and stays for the rest of the pin. */
  const copyOpacity = useTransform(arrival, [0.15, 0.7], [0, 1], { clamp: true });
  const copyLift = useTransform(arrival, [0.15, 0.7], [18, 0], { clamp: true });
  const copyTransform = useMotionTemplate`translate3d(0, ${copyLift}px, 0)`;

  /* Sanctuary light behind the completed figure - the last thing to happen. */
  const bloom = useTransform(drive, [0.6, 0.95], [0, 1], { clamp: true });
  const bloomScale = useTransform(drive, [0.6, 0.95], [0.82, 1], {
    clamp: true,
  });

  return (
    <div
      ref={outerRef}
      /*
       * One screen for the stage plus the hold - and the extra height *is* the
       * scroll budget, exactly as it is on the leadership stage and on every
       * hero. There is no separate "how long should this last" number to keep
       * in step with anything.
       *
       * `svh` here against the `dvh` on the pinned frame below: the document's
       * height has to be stable or a retracting address bar would resize it and
       * shunt the page under the reader's thumb, while the frame has to fill
       * what is actually visible or the bento below shows in a strip beneath it.
       */
      style={pinned ? { height: `calc(100svh + ${HOLD * 100}svh)` } : undefined}
      className="relative"
    >
      <div
        role="group"
        aria-label={label}
        className={cn(
          "flex flex-col overflow-hidden bg-sand-950",
          pinned ? "sticky top-0 h-[100dvh]" : "py-20 sm:py-24",
        )}
      >
        {/*
          The field.

          `container-type: size` is what lets the chart be placed in `cqmin` - a
          share of the *shorter* side of this box - rather than in pixels off a
          `ResizeObserver`. That one unit is the whole responsive story: the
          cross keeps its drawn proportions on a 360px phone and on an ultrawide
          monitor, and only the sky around it gets wider or taller. A figure laid
          out in percentages of each axis would be a plus sign on the phone and a
          letter T on the monitor.

          Edge to edge, and `overflow-hidden` because the loose stars run right
          up to all four of them.

          The size container is the *safe box* below rather than this one, and
          that is the whole of the sizing fix: measured here, the square was a
          share of a field whose top was under the fixed header and whose bottom
          forty per cent was under the caption's ground, so the dove sat behind
          the navigation and the wheat was painted out entirely. Measured
          against the room the figure actually has, every one of the ten is on
          screen at every viewport.
        */}
        <div
          className={cn(
            "relative w-full overflow-hidden",
            pinned ? "min-h-0 flex-1" : "h-[68svh] min-h-[26rem]",
          )}
        >
          {/*
            The rest of the sky. One motion value fades all thirty-two of them up
            together; the twinkle itself is a CSS animation with a delay per
            star, so a full sky costs one animated element rather than
            thirty-two. See `.constellation-star` in `globals.css`.
          */}
          <motion.div
            aria-hidden
            style={{ opacity: dawn }}
            className="pointer-events-none absolute inset-0"
          >
            {SKY.map(([x, y, radius, delay], index) => (
              <span
                key={index}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${radius * 2}px`,
                  height: `${radius * 2}px`,
                  animationDelay: `${delay}s`,
                }}
                className="constellation-star absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
              />
            ))}
          </motion.div>

          {/*
            The ground the copy is set on, so no star sits inside a word.

            Before the chart rather than after it, which is the difference
            between grounding the sky and erasing the figure. Painted last it
            covered the lower two fifths of the field at up to full opacity -
            and the lower two fifths of the field is where the foot of the cross
            is, so the book came through at a third of its light and the wheat
            not at all. It has always only had the loose stars to answer for;
            now it is drawn where it can only reach them.
          */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-sand-950 via-sand-950/85 to-transparent"
          />

          {/*
            The chart.

            Centred by the grid rather than by a `-translate-1/2` pair, because
            the square itself carries the sky's drift and a transform written
            here would be overwritten by the one written there.

            A square of `min(cqw, cqh)`, so the SVG's own 0-100 user units and
            the ornaments' percentage positions are one coordinate space - which
            is why the lines and the things they join are laid out from a single
            table with no measurement between them.
          */}
          <div
            style={{ containerType: "size" }}
            className={cn(
              "absolute inset-x-0 grid place-items-center",
              /*
                The room the figure has, which is not the room the sky has.

                The stage is pinned to the top of the viewport and the site
                header is fixed over that same top, so the first ~6rem of this
                field is spoken for; the caption sits under the field and wants
                a hand's breadth of dark above it. The sky still runs edge to
                edge behind both - it is only the ten ornaments that have to
                clear them.
              */
              pinned
                ? "top-[calc(var(--header-height)+var(--safe-top)+2rem)] bottom-[6%]"
                : "inset-y-0",
            )}
          >
            <motion.div
              style={{ transform: skyTransform }}
              className="relative size-[min(92cqw,92cqh)]"
            >
              {/* Sanctuary light behind the completed figure. */}
              <motion.div
                aria-hidden
                style={{ opacity: bloom, scale: bloomScale }}
                className="pointer-events-none absolute inset-[-18%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-accent-500)_22%,transparent),transparent_68%)] blur-2xl"
              />

              {/*
                The lines. One flat SVG under the ornaments, so every segment
                passes behind the two glyphs it joins rather than over them.

                The stroke is measured in the chart's own units rather than
                pinned to a pixel with `non-scaling-stroke`, so the whole figure
                scales as one drawing - a line that stayed 1px while the
                ornaments trebled in size would read as a wire holding up things
                far too heavy for it. `non-scaling-stroke` is also the one thing
                that cannot safely be combined with the `pathLength` dash the
                draw is built on: the dash pattern is in user units and the
                stroke is not, and the two disagree by the scale factor.
              */}
              <svg
                aria-hidden
                viewBox="0 0 100 100"
                fill="none"
                className="absolute inset-0 size-full overflow-visible text-accent-400"
              >
                {LINKS.map(([from, to], index) => (
                  <Link
                    key={`${from}-${to}`}
                    from={from}
                    to={to}
                    index={index}
                    drive={drive}
                  />
                ))}
              </svg>

              {NODES.map((node, index) => (
                <Star
                  key={node.glyph}
                  node={node}
                  index={index}
                  lit={ARRIVALS[index]}
                  drive={drive}
                  arrival={arrival}
                />
              ))}
            </motion.div>
          </div>

        </div>

        {/*
          The copy, at the foot.

          Not at the centre, which is where the leadership stage puts it and
          where it cannot go here: the centre of this picture is the crossing of
          the figure, and a paragraph laid over it would obscure the one thing
          the whole stage is drawing towards. Set into the foot instead, on its
          own ground - the way a chart is captioned rather than the way a stage
          is titled.
        */}
        <Container
          className={cn("relative shrink-0", pinned ? "pb-14 sm:pb-16" : "pt-14")}
        >
          <motion.div
            style={{ opacity: copyOpacity, transform: copyTransform }}
            className="mx-auto max-w-2xl text-center"
          >
            <Eyebrow tone="onDark">{eyebrow}</Eyebrow>

            <Heading
              as="h3"
              level="h2"
              tone="onDark"
              className="mt-4 text-balance"
            >
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
 * One segment of the figure, drawn.
 *
 * Its own component because each segment needs motion values derived from its
 * own window, and a hook cannot be called in a loop.
 *
 * `pathLength` is what draws it: framer writes the dash pattern from it, so the
 * line grows from one end to the other rather than fading up along its whole
 * length at once. A fade would say "there was always a line here"; the draw says
 * somebody is making the connection now, which is the sentence the section
 * exists to say.
 */
function Link({
  from,
  to,
  index,
  drive,
}: {
  from: number;
  to: number;
  index: number;
  /** The pin, 0 to 1 - or a constant 1 for the still rendering. */
  drive: MotionValue<number>;
}) {
  const [start, end] = stroke(index);
  const { x1, y1, x2, y2 } = segment(from, to);

  const pathLength = useTransform(drive, [start, end], [0, 1], { clamp: true });

  /*
   * The stroke brightens as it is drawn and then settles back. Held at full
   * brightness for the rest of the pin, the finished figure reads as a diagram;
   * letting each line cool leaves the ornaments as the brightest things on the
   * screen, which is the right way round.
   */
  const opacity = useTransform(
    drive,
    [start, end, Math.min(end + 0.12, 1)],
    [0, 0.9, 0.55],
    { clamp: true },
  );

  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="currentColor"
      strokeWidth={0.3}
      strokeLinecap="round"
      style={{ pathLength, opacity }}
    />
  );
}

/**
 * One ornament, on its point.
 *
 * Two stages, which is what a constellation actually is. The star is out first -
 * faint, small, one of the many the sky is already full of - and it is only when
 * the line reaches it that it is claimed by the figure and takes its light. Lit
 * all at once they would be a row of icons; lit this way the reader watches
 * ordinary points of light get gathered one after another, which is the chapter
 * in one gesture.
 */
function Star({
  node,
  index,
  lit,
  drive,
  arrival,
}: {
  node: (typeof NODES)[number];
  index: number;
  /** The fraction of the pin at which the figure reaches this ornament. */
  lit: number;
  drive: MotionValue<number>;
  /** The section climbing into view, 0 to 1. */
  arrival: MotionValue<number>;
}) {
  /*
   * Out with the rest of the sky, a beat apart so they do not arrive as a set -
   * and on the approach rather than on the pin, for the same reason the sky
   * itself is. Being *claimed* by the figure is still the pin's business; only
   * being *there* moved.
   */
  const present = useTransform(
    arrival,
    [0.15 + index * 0.03, 0.6 + index * 0.03],
    [0, 1],
    { clamp: true },
  );

  /* Claimed by the figure. */
  const joined = useTransform(drive, [Math.max(lit - 0.1, 0), lit], [0, 1], {
    clamp: true,
  });

  const opacity = useTransform(() => 0.46 * present.get() + 0.54 * joined.get());
  const scale = useTransform(
    () => 0.82 + 0.12 * present.get() + 0.06 * joined.get(),
  );

  const Ornament = GLYPHS[node.glyph];

  return (
    <div
      aria-hidden
      style={{ left: `${node.x}%`, top: `${node.y}%`, width: `${node.size}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
    >
      <motion.div style={{ opacity, scale }} className="relative">
        {/* The light the ornament takes when the figure reaches it. */}
        <motion.span
          style={{ opacity: joined }}
          className="pointer-events-none absolute inset-[-55%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-accent-300)_50%,transparent),transparent_70%)] blur-md"
        />

        <Ornament className="relative w-full text-accent-200" />
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The ornaments                                                              */
/*                                                                            */
/* Drawn here rather than taken from `section-ornaments.tsx`, which is the     */
/* site's other body of ornament and is entirely seasonal - firs, baubles,     */
/* palm fronds, ash. Each of those belongs to a fortnight of the year; these   */
/* are the things a church keeps all of it, and a chapter that has to stand in */
/* September cannot be dressed in December's.                                  */
/*                                                                            */
/* The drawing rules are that file's, though, and deliberately so: a fixed     */
/* `viewBox`, one stroke weight, round caps and joins, and a silhouette you    */
/* can name from across the room. At the size these actually render - thirty   */
/* to seventy pixels - detail is scribble and only the outline survives.       */
/* -------------------------------------------------------------------------- */

type GlyphProps = { className?: string };

/** The shared frame: everything is drawn to 24x24 at one weight. */
function Mark({
  className,
  children,
}: GlyphProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

/* The Spirit, descending. Head on and symmetric - a dove in profile needs a
   drawn wing to read as a bird, and a drawn wing at this size is a smudge. */
function Dove({ className }: GlyphProps) {
  return (
    <Mark className={className}>
      <circle cx="12" cy="5.4" r="1.9" />
      <path d="M12 7.3v7.4" />
      <path d="M10.4 14.7 8.6 20.4 12 18.2l3.4 2.2-1.8-5.7z" />
      <path d="M10.6 9.2C8.2 8 5.4 7.8 2.4 8.6c2 2.4 4.6 3.9 7.8 4.4" />
      <path d="M13.4 9.2c2.4-1.2 5.2-1.4 8.2-.6-2 2.4-4.6 3.9-7.8 4.4" />
    </Mark>
  );
}

/* The crown of life. Three points, each finished with a jewel. */
function Crown({ className }: GlyphProps) {
  return (
    <Mark className={className}>
      <path d="M4.4 17.6 3.2 7.4l4.8 3.4L12 4.2l4 6.6 4.8-3.4-1.2 10.2z" />
      <path d="M4.6 20.6h14.8" />
      <circle cx="3.2" cy="7.4" r="0.9" />
      <circle cx="12" cy="4.2" r="0.9" />
      <circle cx="20.8" cy="7.4" r="0.9" />
    </Mark>
  );
}

/* The mark at the crossing - the same proportion `CrossMark` strikes at the head
   of every section, so the centre of the figure is the site's own sign. */
function Cross({ className }: GlyphProps) {
  return (
    <Mark className={className}>
      <path d="M12 2.6v18.8M5.4 8.4h13.2" />
    </Mark>
  );
}

/* The cup. */
function Chalice({ className }: GlyphProps) {
  return (
    <Mark className={className}>
      <path d="M5.8 4.2h12.4c0 4.6-2.5 7.7-6.2 8.1-3.7-.4-6.2-3.5-6.2-8.1z" />
      <path d="M6.2 7.8h11.6" />
      <path d="M12 12.3v5.1" />
      <path d="M7.4 20.8c0-1.9 2.1-3.4 4.6-3.4s4.6 1.5 4.6 3.4z" />
    </Mark>
  );
}

/* The word, open. */
function Book({ className }: GlyphProps) {
  return (
    <Mark className={className}>
      <path d="M12 7.6c-2.1-1.7-4.7-2.6-7.9-2.6v12.4c3.2 0 5.8.9 7.9 2.6 2.1-1.7 4.7-2.6 7.9-2.6V5c-3.2 0-5.8.9-7.9 2.6z" />
      <path d="M12 7.6V20" />
      <path d="M6.6 9.2h2.8M14.6 9.2h2.8" />
    </Mark>
  );
}

/* The harvest. A sheaf, not a single ear: two stalks crossed at the foot. */
function Wheat({ className }: GlyphProps) {
  return (
    <Mark className={className}>
      <path d="M12 21.2v-9.6" />
      <path d="M12 4.4c1.2 1.2 1.2 3.2 0 4.4-1.2-1.2-1.2-3.2 0-4.4z" />
      <path d="M11.6 11.4c-1.8-.3-3-1.5-3.4-3.5 1.9.2 3.1 1.4 3.4 3.5z" />
      <path d="M12.4 11.4c1.8-.3 3-1.5 3.4-3.5-1.9.2-3.1 1.4-3.4 3.5z" />
      <path d="M11.6 15.6c-1.8-.3-3-1.5-3.4-3.5 1.9.2 3.1 1.4 3.4 3.5z" />
      <path d="M12.4 15.6c1.8-.3 3-1.5 3.4-3.5-1.9.2-3.1 1.4-3.4 3.5z" />
      <path d="M12 21.2c-1.7-1.9-3.6-3.2-5.7-4M12 21.2c1.7-1.9 3.6-3.2 5.7-4" />
    </Mark>
  );
}

/* The sanctuary lamp, hung and lit. */
function Lamp({ className }: GlyphProps) {
  return (
    <Mark className={className}>
      <path d="M12 1.8v1.4" />
      <path d="M12 3.2 5.8 11M12 3.2 18.2 11M12 3.2v5.6" />
      <path d="M4.8 11.2h14.4c0 4.5-3.2 7.5-7.2 7.5s-7.2-3-7.2-7.5z" />
      <path d="M12 16.2c-1.1-.8-1.7-1.6-1.7-2.6 0-.9.6-1.8 1.7-2.5 1.1.7 1.7 1.6 1.7 2.5 0 1-.6 1.8-1.7 2.6z" />
    </Mark>
  );
}

/* The oldest sign of all. */
function Fish({ className }: GlyphProps) {
  return (
    <Mark className={className}>
      <path d="M21.4 12c-3.4 3.5-7 5.2-10.8 5.2-2.2 0-3.8-1.7-4.6-5.2.8-3.5 2.4-5.2 4.6-5.2 3.8 0 7.4 1.7 10.8 5.2z" />
      <path d="M6 12 2.4 8.2v7.6z" />
      <circle cx="16.6" cy="10.6" r="0.9" />
    </Mark>
  );
}

/* The call to gather. */
function Bell({ className }: GlyphProps) {
  return (
    <Mark className={className}>
      <path d="M12 3.4c-3.7.9-5.7 3.9-6 9-.1 2.3-.9 4.1-2.3 5.3h16.6c-1.4-1.2-2.2-3-2.3-5.3-.3-5.1-2.3-8.1-6-9z" />
      <path d="M12 2.2v1.2" />
      <path d="M9.9 19.4a2.1 2.1 0 0 0 4.2 0" />
    </Mark>
  );
}

/* Hope, as the letter to the Hebrews has it: sure and steadfast. */
function Anchor({ className }: GlyphProps) {
  return (
    <Mark className={className}>
      <circle cx="12" cy="4.4" r="1.9" />
      <path d="M12 6.3v14.9" />
      <path d="M8.2 9.4h7.6" />
      <path d="M3.6 13c.4 4.6 4.2 8.2 8.4 8.2s8-3.6 8.4-8.2" />
      <path d="M3.6 13 1.6 12M20.4 13l2-1" />
    </Mark>
  );
}

/** The table `NODES` names its ornaments from. */
const GLYPHS = {
  dove: Dove,
  crown: Crown,
  cross: Cross,
  chalice: Chalice,
  book: Book,
  wheat: Wheat,
  lamp: Lamp,
  fish: Fish,
  bell: Bell,
  anchor: Anchor,
} as const satisfies Record<string, (props: GlyphProps) => ReactElement>;
