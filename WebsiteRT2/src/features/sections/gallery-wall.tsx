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
import Image from "next/image";
import { useRef } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Container } from "@/components/ui/container";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { useHeroUnderHeader } from "@/hooks/use-hero-under-header";
import { approachRange, pinnedRange } from "@/lib/scroll-offsets";
import { cn } from "@/lib/utils";

/**
 * One photograph on the wall, already localized.
 *
 * Plain strings rather than a `GalleryAlbum`, for the reason the leadership
 * stage takes `figures` rather than a namespace: this is a client component, so
 * everything it is handed crosses the serialization boundary, and resolving the
 * alt text on the server keeps `localize` and the message catalogue out of the
 * bundle.
 */
export interface WallFrame {
  src: string;
  alt: string;
}

export interface GalleryWallProps {
  frames: WallFrame[];
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Describes the wall for assistive tech. */
  label: string;
}

/**
 * How long the stage holds the page, in screens, on top of the one it fills.
 *
 * The same 1.6 the other four stages take. Flat rather than priced per
 * photograph, which is the same call the leadership stage makes about its
 * company: a parish with twenty albums does not need more scroll than one with
 * six, it needs more of them on the wall at once.
 */
const HOLD = 1.6;

/**
 * How fast the wall moves by itself, in cycles per second, when the page is
 * still.
 *
 * The same pulse as the other four stages, and doing the heavier job it does on
 * the falling-paper stage rather than the light one it does on the rest: this
 * wall has no beginning and no end, and a wall of photographs that stops dead
 * the instant a thumb lifts stops being a wall and becomes a screenshot. The
 * scroll *adds* to this rather than replacing it.
 */
const IDLE_SPEED = 0.02;

/** How far the wall travels over one pin, in whole passes of the list. */
const CYCLES = 0.62;

/**
 * The columns of the arcade.
 *
 * Five, which is as many tall openings as will read across a wide screen
 * without any of them becoming a letterbox, and the two outermost are dropped
 * on a phone - see `hide` - rather than squeezing five into 380px.
 *
 * `speed` is how fast the column travels and `up` which way. Alternating the
 * direction is the whole of the effect: two adjacent columns moving opposite
 * ways read as depth and as life, where five columns all travelling the same
 * way read as a credits roll. The speeds are deliberately not multiples of one
 * another, so the wall never returns to an arrangement the reader has already
 * seen.
 *
 * `depth` dims and softens a column - the arcade recedes at its edges, which is
 * what keeps the outer openings from competing with the middle for attention.
 */
const COLUMNS: {
  speed: number;
  up: boolean;
  phase: number;
  depth: number;
  hide?: boolean;
}[] = [
  { speed: 0.78, up: true, phase: 0.14, depth: 0.55, hide: true },
  { speed: 1.06, up: false, phase: 0.61, depth: 0.18 },
  { speed: 0.89, up: true, phase: 0.33, depth: 0 },
  { speed: 1.13, up: false, phase: 0.86, depth: 0.18 },
  { speed: 0.71, up: true, phase: 0.47, depth: 0.55, hide: true },
];

/**
 * The opening, in the unit square.
 *
 * A two-centred pointed arch - the same shape as the arcade in the nave stage
 * one chapter up, and the same shape as roughly every window in a CSI church
 * built before 1900. Written in `objectBoundingBox` units so one path clips an
 * opening of any size: the wall scales it to whatever room it has and the curve
 * never has to be recomputed.
 *
 * The point is deliberately soft. A sharp gothic apex on a photographic opening
 * reads as a sticker of a church; a little radius at the crown reads as
 * masonry, which is what it is.
 */
const ARCH =
  "M0,1 L0,0.34 C0,0.155 0.2,0.024 0.5,0 C0.8,0.024 1,0.155 1,0.34 L1,1 Z";

/**
 * The parish's photographs, as a wall of them.
 *
 * The chapter has just said "the albums", and the block below it is six tiles
 * with titles and photo counts on them. That is the right way to *use* the
 * chapter and the wrong way to open it: it hands the reader an index of
 * photographs at the size of a postcard. So the chapter opens on the
 * photographs themselves - all of them, at once, moving.
 *
 * ## Why it is not a slideshow
 *
 * Two were tried here and both were. A full-bleed cross-dissolve and then a
 * single arched window, each showing one photograph at a time and swapping it
 * for the next: the move every site makes with a set of pictures, and one that
 * spends two and a half screens of a reader's attention to show them six
 * photographs in sequence when the wall could show them six at once.
 *
 * This shows every album simultaneously, in five columns of tall arched
 * openings, each column travelling at its own speed and the two beside it
 * travelling the other way. Nothing waits its turn and nothing gives way to
 * anything - there is no current photograph and no next one. The reader's eye
 * picks whichever opening it wants, which is what people actually do with a
 * wall of pictures and never do with a slideshow.
 *
 * The arrangement never repeats, either: the column speeds are not multiples of
 * one another, so the wall a reader sees on their second visit is a wall they
 * have not seen.
 *
 * ## The arcade
 *
 * The openings are the church's own shape - the same two-centred arch as the
 * nave stage's arcade, one chapter up. Three things come of that. A gallery of
 * parish photographs is framed by the building they were taken in. A tall
 * portrait opening crops every photograph to the same proportion, so pictures
 * shot on six phones in six aspect ratios read as one wall rather than as six.
 * And an arch is a shape with a top, so a column of them reads as an arcade
 * running past rather than as a strip of images scrolling.
 *
 * ## Against the other four stages
 *
 * `LeadershipConstellation` also puts photographs on screen and does the
 * opposite thing with them: small, framed, travelling *at* the reader in
 * perspective on one shared loop. Here they travel across the reader, in
 * opposite directions, on five loops that have nothing to do with each other.
 *
 * Under `prefers-reduced-motion` the wall is rendered at one composed moment of
 * itself, with no pin and nothing moving. See `still`.
 */
export function GalleryWall({
  frames,
  eyebrow,
  title,
  subtitle,
  label,
}: GalleryWallProps) {
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
  const pinned = !shouldReduceMotion && frames.length > 1;

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: pinnedRange(),
  });

  /*
   * The approach, as its own progress.
   *
   * `scrollYProgress` above is exactly zero for the whole screen-height during
   * which this section is climbing into view, because the pin has not started
   * yet. Gating the picture on it is what gave the other stages a blank screen
   * before they began.
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
   * One number for the whole wall: how far the arcade has travelled.
   *
   * The clock and the scroll are added rather than switched between, so a
   * reader scrolling makes the wall move faster and a reader stopping leaves it
   * moving. Each column takes its own multiple of this, so five columns are one
   * movement rather than five animations that have to be kept apart from each
   * other by hand.
   */
  const still = useMotionValue(0.28);
  const drive = useTransform(() =>
    pinned ? clock.get() + scrollYProgress.get() * CYCLES : still.get(),
  );

  /* The wall comes up on the approach, before the pin owns the screen. */
  const dawn = useTransform(arrival, [0.1, 0.6], [0, 1], { clamp: true });

  /*
   * The camera.
   *
   * The smallest of the five, and the reason is the subject: everything in this
   * frame is already moving in two directions at once, so a camera doing much
   * on top of it is a camera fighting the shot.
   */
  const cameraScale = useTransform(
    pinned ? scrollYProgress : still,
    [0, 1],
    [1.03, 1],
    { clamp: true },
  );
  const camera = useMotionTemplate`scale(${cameraScale})`;

  /* The vignette, closing by a few per cent as the stage settles. */
  const vignette = useTransform(
    pinned ? scrollYProgress : still,
    [0.1, 1],
    [0.7, 0.95],
    { clamp: true },
  );

  /* The caption, which arrives with the wall and stays for the rest of the pin. */
  const copyOpacity = useTransform(arrival, [0.2, 0.75], [0, 1], { clamp: true });
  const copyLift = useTransform(arrival, [0.2, 0.75], [22, 0], { clamp: true });
  const copyTransform = useMotionTemplate`translate3d(0, ${copyLift}px, 0)`;

  if (frames.length === 0) return null;

  return (
    <div
      ref={outerRef}
      // Hidden altogether in Simple mode - see globals.css.
      data-motion-scene
      /*
       * One screen for the stage plus the hold - and the extra height *is* the
       * scroll budget, exactly as it is on the other four stages and on every
       * hero.
       *
       * `svh` here against the `dvh` on the pinned frame below: the document's
       * height has to be stable or a retracting address bar would resize it and
       * shunt the page under the reader's thumb, while the frame has to fill
       * what is actually visible or the album grid below shows in a strip
       * beneath it.
       */
      style={pinned ? { height: `calc(100svh + ${HOLD * 100}svh)` } : undefined}
      className="relative"
    >
      <div
        role="img"
        aria-label={label}
        className={cn(
          "relative overflow-hidden bg-sand-950",
          pinned ? "sticky top-0 h-[100dvh]" : "h-[86svh] min-h-[34rem]",
        )}
      >
        {/*
          The opening, as a path.

          Declared once in a zero-size SVG and referenced by CSS from every
          photograph on the wall. `objectBoundingBox` units are what make that
          worth doing: the same eleven numbers clip an opening 200px tall on a
          phone and 460px tall on a monitor, and the arch is a fact about this
          file rather than a shape recomputed on every resize.
        */}
        <svg aria-hidden width="0" height="0" className="absolute">
          <defs>
            <clipPath id="gallery-lancet" clipPathUnits="objectBoundingBox">
              <path d={ARCH} />
            </clipPath>
          </defs>
        </svg>

        <motion.div
          style={{ opacity: dawn, transform: camera }}
          className="absolute inset-0 will-change-transform"
        >
          {/*
            The arcade.

            Slightly wider than the frame and pulled up past the top of it, so
            no column ever shows its own end and the wall runs off all four
            edges. `gap` is the stone between the openings - the only structure
            in the picture that is not a photograph.
          */}
          <div className="absolute -inset-x-[3%] -inset-y-[8%] flex gap-2 sm:gap-3">
            {COLUMNS.map((column, index) => (
              <ColumnTrack
                key={index}
                column={column}
                index={index}
                frames={frames}
                drive={drive}
              />
            ))}
          </div>
        </motion.div>

        {/*
          The grade.

          Parish photographs are taken by whoever had a phone out - lit
          differently, white-balanced differently, framed differently - and a
          wall of them raw looks like a wall of different websites. One warm
          wash over all of them is what a colourist does to a reel shot on four
          cameras, and it is the single thing that makes this read as one piece.
        */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[color-mix(in_oklab,var(--color-accent-700)_18%,transparent)] mix-blend-soft-light"
        />

        <motion.div
          aria-hidden
          style={{ opacity: vignette }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(118%_86%_at_50%_40%,transparent_22%,var(--color-sand-950))]"
        />

        {/* The ground the caption is set on, so no opening runs through a word. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-sand-950 via-sand-950/88 to-transparent"
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

/**
 * One column of the arcade, travelling.
 *
 * Its own component because each column needs a motion value derived from its
 * own speed, and a hook cannot be called in a loop.
 *
 * The list is rendered twice and the track is translated between nought and
 * half its own height. At exactly half, the second copy stands where the first
 * one started, so the wrap is not a jump anybody can see and there is no moment
 * where the column is empty at one end. It is the oldest marquee trick there
 * is and still the only one that does not need to measure anything.
 */
function ColumnTrack({
  column,
  index,
  frames,
  drive,
}: {
  column: (typeof COLUMNS)[number];
  index: number;
  frames: WallFrame[];
  /** Passes of the list completed, shared by the whole wall. */
  drive: MotionValue<number>;
}) {
  const { speed, up, phase, depth, hide } = column;

  const travel = useTransform(() => {
    const at = wrap(drive.get() * speed * (up ? 1 : -1) + phase);
    return (at * 50).toFixed(4);
  });
  const transform = useMotionTemplate`translate3d(0, -${travel}%, 0)`;

  /* Twice through, so the track is always taller than the frame it runs in. */
  const run = [...frames, ...frames];

  return (
    <div
      className={cn(
        "relative min-w-0 flex-1 overflow-hidden",
        /* The outermost pair are dropped rather than squeezed: five tall
           openings across 380px of phone is five letterboxes. */
        hide && "hidden md:block",
      )}
    >
      <motion.div
        style={{
          transform,
          opacity: 1 - depth * 0.55,
          filter: depth > 0 ? `blur(${depth * 1.6}px)` : undefined,
        }}
        className="gallery-wall-column flex flex-col gap-2 will-change-transform sm:gap-3"
      >
        {run.map((frame, position) => (
          <figure
            key={`${frame.src}-${position}`}
            className="relative aspect-[3/4.4] w-full shrink-0"
          >
            <div
              className="absolute inset-0 overflow-hidden bg-sand-900"
              style={{ clipPath: "url(#gallery-lancet)" }}
            >
              <Image
                src={frame.src}
                alt=""
                fill
                sizes="(max-width: 768px) 40vw, 22vw"
                /* Only the first opening of the middle column is worth the
                   network early; the rest arrive as the wall comes up. */
                priority={index === 2 && position === 0}
                className="object-cover"
              />

              {/* The light on the glass. A single soft fall across each
                  opening, which is what stops the clipped photograph from
                  reading as a cut-out pasted on the dark. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[color-mix(in_oklab,var(--color-accent-100)_16%,transparent)] via-transparent to-[color-mix(in_oklab,var(--color-sand-950)_42%,transparent)]"
              />
            </div>

            {/* The gilt reveal: the stone edge of the opening, drawn on the
                same path so it can never drift from the clip. */}
            <svg
              aria-hidden
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              className="absolute inset-0 size-full overflow-visible"
            >
              <path
                d={ARCH}
                fill="none"
                stroke="var(--color-accent-400)"
                strokeWidth="0.006"
                vectorEffect="non-scaling-stroke"
                opacity={0.7}
              />
            </svg>
          </figure>
        ))}
      </motion.div>
    </div>
  );
}
