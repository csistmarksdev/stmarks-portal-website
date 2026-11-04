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

export interface FallingPagesProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Describes the picture for assistive tech. */
  label: string;
}

/**
 * How long the stage holds the page, in screens, on top of the one it fills.
 *
 * The same 1.6 the other three stages take, and the same for the same reason:
 * the chapters open on one gesture - the page stops, one thing happens, the
 * page goes on - and a reader held for two and a half screens on "those who
 * serve" should be held for two and a half screens here.
 */
const HOLD = 1.6;

/**
 * How far the fall advances over one pin, in cycles.
 *
 * A little over one, so a reader who scrolls the whole hold sees every sheet
 * arrive, pass and leave - and the field they leave behind is the field they
 * came out of, which is what stops the end of the stage from being emptier than
 * the beginning.
 */
const CYCLES = 1.15;

/**
 * How fast the fall carries on by itself, in cycles per second, when the page
 * is still.
 *
 * The same pulse as the other three stages, and doing a heavier job here than
 * on any of them: on a stage of falling paper, stopping *is* the failure. A
 * constellation that freezes is a picture; paper that freezes is broken. So the
 * scroll adds to this rather than replacing it, exactly as the leadership loop
 * does - a thumb makes the fall faster, and taking the thumb away leaves it
 * falling.
 */
const IDLE_SPEED = 0.045;

/** Where a sheet fades up, and where it fades away, as fractions of its fall. */
const FADE_IN = 0.14;
const FADE_OUT = 0.84;

/**
 * The sheets, in a 160x160 field.
 *
 * Square for the same reason the nave is: the stage fills the viewport edge to
 * edge with `preserveAspectRatio="slice"`, so the screen crops whichever axis
 * does not match, and a square field loses least on both a phone and an
 * ultrawide monitor.
 *
 * Three planes, and the planes are the whole composition. `back` is small,
 * dim, slow and softened; `mid` is the plane in focus and the only one drawn
 * sharp; `front` is large, faint and heavily blurred - paper passing close to
 * the lens, out of focus, which is the one thing that makes a flat SVG read as
 * a photographed depth rather than as three sizes of the same shape.
 *
 * `phase` is where a sheet is in its own fall at the top of the pin, spread so
 * no two arrive together. `speed` multiplies the fall - near things fall faster
 * than far ones, which is parallax and is also simply true. `turns` is how many
 * times it goes over on the way down; `sway` how far it wanders off plumb,
 * because paper does not drop, it slips.
 */
const SHEETS: {
  plane: "back" | "mid" | "front";
  x: number;
  width: number;
  phase: number;
  speed: number;
  sway: number;
  turns: number;
  tilt: number;
}[] = [
  { plane: "back", x: 22, width: 9, phase: 0.06, speed: 0.62, sway: 5, turns: 1.6, tilt: 14 },
  { plane: "back", x: 48, width: 11, phase: 0.41, speed: 0.7, sway: 7, turns: 1.2, tilt: -22 },
  { plane: "back", x: 78, width: 8, phase: 0.74, speed: 0.58, sway: 4, turns: 2.1, tilt: 38 },
  { plane: "back", x: 108, width: 10.5, phase: 0.23, speed: 0.66, sway: 6, turns: 1.4, tilt: -9 },
  { plane: "back", x: 136, width: 9.5, phase: 0.58, speed: 0.74, sway: 5, turns: 1.8, tilt: 27 },
  { plane: "mid", x: 34, width: 19, phase: 0.52, speed: 1, sway: 10, turns: 1.1, tilt: -16 },
  { plane: "mid", x: 66, width: 22, phase: 0.15, speed: 1.08, sway: 12, turns: 0.8, tilt: 24 },
  { plane: "mid", x: 98, width: 17, phase: 0.86, speed: 0.94, sway: 9, turns: 1.35, tilt: -31 },
  { plane: "mid", x: 128, width: 20, phase: 0.34, speed: 1.02, sway: 11, turns: 0.95, tilt: 8 },
  { plane: "front", x: 26, width: 42, phase: 0.68, speed: 1.5, sway: 16, turns: 0.6, tilt: -20 },
  { plane: "front", x: 118, width: 47, phase: 0.28, speed: 1.62, sway: 18, turns: 0.5, tilt: 33 },
];

/** How each plane is drawn: its softness, its weight, and where it sits. */
const PLANES = {
  back: { blur: 0.55, opacity: 0.36 },
  mid: { blur: 0, opacity: 0.82 },
  front: { blur: 1.9, opacity: 0.22 },
} as const;

/**
 * Sheets of paper, falling through the dark.
 *
 * The chapter has just said "written from the life of the church", and the
 * block below it is six cards with titles and reading times on them. That is
 * the right way to *use* the chapter and the wrong way to open it: it hands the
 * reader an index of writing without ever showing them any. So the chapter
 * opens on the paper itself, loose and falling, catching the light as it turns.
 *
 * ## What it is not, and why
 *
 * Two things stood here first and both failed in the same way. A lectern with a
 * Bible on it read as clipart, because a drawn object at this scale always
 * will - anything recognisable is something the eye can catch being slightly
 * wrong, and a vector book is wrong in a dozen small ways at once. A column of
 * ruled lines with a band of light travelling down it read as a flatbed
 * scanner, which in fairness is exactly what that is a picture of.
 *
 * What is left is the one thing that can be drawn flat without looking drawn: a
 * rectangle of paper, seen at a distance, lit. There is no detail in it to get
 * wrong, and nothing in the movement that a machine does - paper falls, it does
 * not sweep or scan or index. The composition is carried by depth of field and
 * by the fall, not by anything anybody has to recognise.
 *
 * ## The tumble
 *
 * Each sheet turns as it falls, and the turn is one number: `scaleX` on the
 * cosine of its own rotation, so the sheet is full width face-on, vanishingly
 * thin edge-on, and full width again on its back. A bright hairline runs along
 * its edge with the opposite weighting - brightest exactly when the sheet is
 * thinnest - which is the catch of light you see off falling paper and the only
 * highlight in the whole stage.
 *
 * ## Against the other three stages
 *
 * `LeadershipConstellation` is a camera: portraits out of the middle of the
 * screen and past the reader in perspective. `FellowshipConstellation` is a
 * chart: fixed points, lines drawn between them once. `NaveLight` is a room in
 * which nothing moves except the light. This one is the only one with *weather*
 * in it - many small things, all moving, none of them going anywhere in
 * particular, and the composition never in the same arrangement twice.
 *
 * It also shares the leadership stage's clock exactly: the scroll adds to a
 * drift that is always running, rather than driving it from nothing. On this
 * stage that is not a nicety - paper that stops falling when a thumb lifts is
 * paper hanging in the air.
 *
 * Under `prefers-reduced-motion` the fall is rendered at one composed moment of
 * itself, with no pin and nothing moving. See `still`.
 */
export function FallingPages({
  eyebrow,
  title,
  subtitle,
  label,
}: FallingPagesProps) {
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
   * yet. Gating the picture on it is what gave the other stages a blank screen
   * before they began; this one is built with the fix in it. It runs 0 to 1
   * over the climb - the top of the block from the bottom of the viewport to
   * the top of it.
   */
  const { scrollYProgress: arrival } = useScroll({
    target: outerRef,
    offset: approachRange(),
  });

  const inView = useInView(outerRef, { amount: 0.05 });
  const clock = useMotionValue(0);

  useAnimationFrame((_, delta) => {
    if (!inView || !pinned) return;
    clock.set(clock.get() + (delta / 1000) * IDLE_SPEED);
  });

  /*
   * One number for the whole fall: how many cycles have gone by.
   *
   * The clock and the scroll are added rather than switched between, so a
   * reader scrolling makes the paper fall faster and a reader stopping leaves
   * it falling. Each sheet takes its own fraction of this and reads its
   * position from it, so eleven sheets are one movement rather than eleven
   * animations that have to be kept apart from each other by hand.
   */
  const still = useMotionValue(0.42);
  const drive = useTransform(() =>
    pinned ? clock.get() + scrollYProgress.get() * CYCLES : still.get(),
  );

  /* The field comes up on the approach, before the stage owns the screen. */
  const dawn = useTransform(arrival, [0.1, 0.6], [0, 1], { clamp: true });

  /*
   * The camera.
   *
   * The smallest push of the four, and the reason is the subject: everything in
   * this frame is already moving, so a camera doing much on top of it is a
   * camera fighting the shot. Four per cent over the whole pin, which reads as
   * the field slowly closing in rather than as a zoom.
   */
  const cameraScale = useTransform(
    pinned ? scrollYProgress : still,
    [0, 1],
    [1, 1.04],
    { clamp: true },
  );
  const camera = useMotionTemplate`scale(${cameraScale})`;

  /* The light the paper falls through, opening as the stage settles. */
  const wash = useTransform(pinned ? scrollYProgress : still, [0.05, 0.7], [0.5, 1], {
    clamp: true,
  });

  /* The vignette, closing by a few per cent as the shot lands. */
  const vignette = useTransform(
    pinned ? scrollYProgress : still,
    [0.15, 1],
    [0.6, 0.95],
    { clamp: true },
  );

  /* The caption, which arrives with the field and stays for the rest of the pin. */
  const copyOpacity = useTransform(arrival, [0.2, 0.75], [0, 1], { clamp: true });
  const copyLift = useTransform(arrival, [0.2, 0.75], [22, 0], { clamp: true });
  const copyTransform = useMotionTemplate`translate3d(0, ${copyLift}px, 0)`;

  return (
    <div
      ref={outerRef}
      // Hidden altogether in Simple mode - see globals.css.
      data-motion-scene
      /*
       * One screen for the stage plus the hold - and the extra height *is* the
       * scroll budget, exactly as it is on the other three stages and on every
       * hero.
       *
       * `svh` here against the `dvh` on the pinned frame below: the document's
       * height has to be stable or a retracting address bar would resize it and
       * shunt the page under the reader's thumb, while the frame has to fill
       * what is actually visible or the card grid below shows in a strip
       * beneath it.
       */
      style={pinned ? { height: `calc(100svh + ${HOLD * 100}svh)` } : undefined}
      className="relative"
    >
      {/*
        The frame.

        Edge to edge and nothing else in it. Ink, because the whole composition
        is paper catching light and there is no such thing as paper catching
        light on a pale ground.
      */}
      <div
        role="img"
        aria-label={label}
        className={cn(
          "relative overflow-hidden bg-sand-950",
          pinned ? "sticky top-0 h-[100dvh]" : "h-[86svh] min-h-[34rem]",
        )}
      >
        <motion.div
          style={{ opacity: dawn, transform: camera }}
          className="absolute inset-0 will-change-transform"
        >
          <svg
            viewBox="0 0 160 160"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 size-full"
          >
            <defs>
              {/* A sheet is lit from above and to the left, so it runs from
                  warm at one corner to nearly the ground colour at the other.
                  One gradient for all eleven: they are the same paper. */}
              <linearGradient id="page-face" x1="0.1" y1="0" x2="0.9" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-100)" />
                <stop offset="46%" stopColor="var(--color-sand-300)" />
                <stop offset="100%" stopColor="var(--color-sand-600)" />
              </linearGradient>

              {/* The light the fall happens in. */}
              <radialGradient id="page-wash" cx="0.46" cy="0.3" r="0.72">
                <stop offset="0%" stopColor="var(--color-accent-400)" stopOpacity="0.2" />
                <stop offset="55%" stopColor="var(--color-accent-700)" stopOpacity="0.07" />
                <stop offset="100%" stopColor="var(--color-sand-950)" stopOpacity="0" />
              </radialGradient>

              {/* Depth of field. Two filters, because there are two planes out
                  of it - the near one much further out than the far one, which
                  is how a real lens behaves and why the foreground reads as
                  foreground rather than as fog. */}
              <filter id="page-far" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={PLANES.back.blur} />
              </filter>
              <filter id="page-near" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={PLANES.front.blur} />
              </filter>
            </defs>

            <motion.rect
              x="-20"
              y="-20"
              width="200"
              height="200"
              fill="url(#page-wash)"
              style={{ opacity: wash }}
            />

            {/* Back to front, so a near sheet passes in front of a far one and
                the planes read in the order they are meant to. */}
            {(["back", "mid", "front"] as const).map((plane) => (
              <g
                key={plane}
                opacity={PLANES[plane].opacity}
                filter={
                  plane === "back"
                    ? "url(#page-far)"
                    : plane === "front"
                      ? "url(#page-near)"
                      : undefined
                }
              >
                {SHEETS.filter((sheet) => sheet.plane === plane).map((sheet) => (
                  <Sheet key={`${plane}-${sheet.x}`} sheet={sheet} drive={drive} />
                ))}
              </g>
            ))}
          </svg>
        </motion.div>

        {/* The vignette. */}
        <motion.div
          aria-hidden
          style={{ opacity: vignette }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_78%_at_50%_42%,transparent_28%,var(--color-sand-950))]"
        />

        {/* The ground the caption is set on, so no sheet falls through a word. */}
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

/** The fractional part, for negative drives as well as positive ones. */
function wrap(value: number): number {
  const fraction = value % 1;
  return fraction < 0 ? fraction + 1 : fraction;
}

/** In at the top of the frame, out at the bottom, full for the fall between. */
function fade(phase: number): number {
  if (phase < FADE_IN) return phase / FADE_IN;
  if (phase > FADE_OUT) return (1 - phase) / (1 - FADE_OUT);
  return 1;
}

/**
 * One sheet, falling.
 *
 * Its own component because each needs motion values derived from its own place
 * in the fall, and a hook cannot be called in a loop.
 *
 * The shape is a leaf rather than a rectangle: two curved edges, because a
 * loose sheet of paper has never been flat in its life and a true rectangle
 * tumbling end over end reads as a playing card. It is drawn about its own
 * centre so the rotation has nothing to correct for.
 */
function Sheet({
  sheet,
  drive,
}: {
  sheet: (typeof SHEETS)[number];
  /** Cycles of the fall completed, shared by the whole field. */
  drive: MotionValue<number>;
}) {
  const { x, width, phase, speed, sway, turns, tilt } = sheet;
  const height = width * 1.34;
  const curl = width * 0.08;

  /** Where this sheet is in its own fall, 0 to 1. */
  const at = useTransform(() => wrap(drive.get() * speed + phase));

  const transform = useTransform(() => {
    const t = at.get();

    /* From above the frame to below it. Paper does not drop plumb, so the
       horizontal is a slow sine across the whole fall rather than a line. */
    const y = -30 + t * 224;
    const drift = x + Math.sin(t * Math.PI * 2 + phase * 6.2) * sway;

    /* The tumble. `scaleX` on the cosine of the sheet's own rotation: full
       width face-on, vanishingly thin edge-on, full width again on its back.
       Floored, because a sheet at zero width is a sheet that disappears for a
       frame. */
    const angle = (tilt + t * turns * 360) * (Math.PI / 180);
    const face = Math.cos(angle * 2);
    const across = Math.max(Math.abs(face), 0.05) * (face < 0 ? -1 : 1);

    return `translate(${drift}px, ${y}px) rotate(${tilt + t * turns * 180}deg) scale(${across}, 1)`;
  });

  const opacity = useTransform(() => fade(at.get()));

  /*
   * The catch of light along the edge.
   *
   * Weighted the opposite way to the face: brightest exactly when the sheet is
   * thinnest, which is the flash you see off falling paper as it goes over. It
   * is the only highlight on the stage and the one thing that says these are
   * sheets rather than shapes.
   */
  const edge = useTransform(() => {
    const t = at.get();
    const angle = (tilt + t * turns * 360) * (Math.PI / 180);
    return (1 - Math.abs(Math.cos(angle * 2))) * 0.9;
  });

  const face = `M${-width / 2} ${-height / 2}Q0 ${-height / 2 - curl} ${width / 2} ${-height / 2}L${width / 2} ${height / 2}Q0 ${height / 2 + curl} ${-width / 2} ${height / 2}Z`;

  return (
    <motion.g style={{ transform, opacity }}>
      <path d={face} fill="url(#page-face)" />
      <motion.path
        d={`M${-width / 2} ${-height / 2}Q0 ${-height / 2 - curl} ${width / 2} ${-height / 2}`}
        fill="none"
        stroke="var(--color-accent-100)"
        strokeWidth={width * 0.035}
        strokeLinecap="round"
        style={{ opacity: edge }}
      />
    </motion.g>
  );
}
