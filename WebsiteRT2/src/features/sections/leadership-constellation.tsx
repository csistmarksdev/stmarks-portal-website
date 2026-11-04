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
import { useMemo, useRef } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useLiturgicalSeason } from "@/components/common/liturgical-season";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { useHeroUnderHeader } from "@/hooks/use-hero-under-header";
import { isSnowSeason } from "@/lib/liturgical-year";
import { approachRange, pinnedRange } from "@/lib/scroll-offsets";
import { cn } from "@/lib/utils";

/**
 * One person on the stage, already localized.
 *
 * Plain strings rather than `Leader`: this is a client component, so everything
 * it is handed crosses the serialization boundary, and resolving the locale on
 * the server keeps `localize` and the message catalogue out of the bundle.
 */
export interface ConstellationFigure {
  id: string;
  name: string;
  designation: string;
  /** The portrait, where the church has supplied one. */
  image?: { src: string; alt: string };
  /** Shown in its place until they do. */
  initials: string;
}

export interface LeadershipConstellationProps {
  figures: ConstellationFigure[];
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Names the constellation for assistive tech. */
  label: string;
}

/**
 * How long the stage holds the page, in screens, on top of the one it fills.
 *
 * Priced flat rather than per person, which is the opposite of the choice the
 * hero and the committee row make - and deliberately so. Those two move a reel
 * whose length grows with its contents, so the budget has to grow with it. Here
 * the portraits are on a loop that every one of them shares; a parish with
 * twenty office bearers does not need more scroll than one with six, it needs
 * them spaced closer together on the same loop, which is what the phase offsets
 * below already do.
 */
const HOLD = 1.6;

/** How many times the whole company passes the camera over one pin. */
const CYCLES = 2.5;

/**
 * How fast the loop turns on its own, in passes per second, when the page is
 * still.
 *
 * The scroll is what drives this - but a stage that freezes solid the instant a
 * thumb leaves the screen reads as a broken video, not as a room with something
 * happening in it. A slow constant drift underneath the scroll means the
 * portraits are always moving while the section is on screen, and scrolling
 * simply moves them faster. It is deliberately far slower than the scroll
 * contribution: this is a pulse, not a carousel that plays without you.
 *
 * It runs only while the section is in view - see `inView` below - so the page
 * is not paying for an animation frame on a stage three screens away.
 */
const IDLE_SPEED = 0.045;

/**
 * The depth the portraits travel through, in pixels, and the camera they are
 * seen with.
 *
 * This is the whole of the effect. Each portrait sits at a fixed point out from
 * the middle of the stage and travels only in `z`, from far behind the screen
 * to just in front of the reader; the CSS perspective divide does the rest, so
 * it starts small and near the centre and accelerates outwards and off the edge
 * of the frame as it comes forward. Nothing animates a position or a size - the
 * spread and the growth are both consequences of one number moving.
 *
 * `Z_NEAR` is kept to a little over half the camera distance. Past that the
 * magnification runs away: a portrait at 0.9 of the way to the camera is ten
 * times its own size and covers the stage for the last frames of its pass.
 */
const PERSPECTIVE = 1000;
const Z_FAR = -1500;
const Z_NEAR = 560;

/**
 * Where each portrait sits on the ring it flies out along, in percentages of
 * the stage.
 *
 * Two radii rather than one, because the stage is the shape of the screen: a
 * true circle on a 16:9 monitor either overflows the top and bottom or leaves
 * two-thirds of the width empty. Read as `cqw`/`cqh` against the field below,
 * so the ring is the same ellipse on every device without a line of JavaScript
 * measuring anything.
 *
 * These are the radii at rest, in the plane of the screen. At `Z_NEAR` they are
 * multiplied by about 2.3, which is what carries every portrait past the edge
 * of the frame rather than parking it inside one.
 */
const RADIUS_X = 30;
const RADIUS_Y = 34;

/**
 * The hand in the arrangement.
 *
 * A ring of evenly spaced, identically sized portraits reads as a diagram. The
 * three tables below are walked by index, so each figure sets off a little
 * nearer or further out, a little larger or smaller, and a degree or two off
 * square - the pinned-up look of the sketch this was drawn from rather than a
 * clock face. They repeat every six, which is long enough that no two
 * neighbours share a treatment and short enough to stay a decision rather than
 * a random seed.
 */
const NEARNESS = [1, 0.87, 0.97, 0.82, 1.02, 0.91];
const SIZES = [1, 0.86, 0.95, 0.81, 1, 0.89];
const TILTS = [-4, 3, -2.5, 4.5, -3.5, 2];

/**
 * Where a portrait fades up out of the depth and where it fades away again, as
 * fractions of its pass.
 *
 * Both ends have to be zero or the loop shows its seam: the moment a portrait
 * reaches the near end it is snapped back to the far end, and anything still
 * visible at either end would read as a flicker in the middle of the stage
 * rather than as one more portrait arriving.
 *
 * The tail is the longer of the two on purpose. It takes the portrait off the
 * screen while it is still travelling, so it dissolves on its way past the
 * reader instead of being cut off against the edge of the frame.
 */
const FADE_IN = 0.16;
const FADE_OUT = 0.78;

/**
 * The layer the centre copy sits on, as a step of a portrait's own pass.
 *
 * See `zIndex` in `Figure`. At 0.4 a portrait is still close in and small when
 * it goes behind the title, and is already outside the words by the time it
 * comes in front of them - so the copy is never obscured mid-sentence and the
 * stage still reads as having depth either side of it.
 */
const CENTRE_DEPTH = 40;

/**
 * The Christmas silhouettes, in the order they are dealt round the ring.
 *
 * For most of the year a portrait on this site is set in the same rounded arch
 * as the sanctuary windows, and that is what the constellation flies. At
 * Christmas the parish hangs things on a tree, so the frames become the things
 * that hang on one - and because a tree is never dressed in one shape, the
 * table is walked by index and no two neighbours are cut alike.
 *
 * Two ways of cutting them, and each is used where it is honest. A bauble, an
 * onion drop, a bell and a lantern are *curves*, so they are `border-radius`
 * pairs - smooth at every size, and the frame's own ring and shadow follow the
 * edge. A star and a faceted drop are *angles*, which a radius cannot make at
 * all, so those two are `clip-path` polygons in percentages. The cost is that a
 * clipped shape loses its hairline ring; a star with a rule round it would read
 * as a sticker anyway.
 *
 * `cap` is the brass collar and loop on top. Everything that hangs from a
 * branch has one; a star is tied at its point and does not.
 */
const CHRISTMAS_SHAPES = [
  /* A round bauble - the shape everyone draws when asked for an ornament. */
  { ratio: "1 / 1", radius: "50%", cap: true },
  /* The onion drop: rounder at the shoulder than the arch, tapered at the foot. */
  { ratio: "4 / 5", radius: "50% 50% 50% 50% / 58% 58% 42% 42%", cap: true },
  /* A five-pointed star, tied at the top point. */
  {
    ratio: "1 / 1",
    clip: "polygon(50% 1%, 61.8% 35.5%, 98% 35.5%, 68.9% 57.3%, 80.2% 91.5%, 50% 70.2%, 19.8% 91.5%, 31.1% 57.3%, 2% 35.5%, 38.2% 35.5%)",
    cap: false,
  },
  /* A bell: shoulders high and round, skirt flaring to a flat lip. */
  { ratio: "5 / 6", radius: "50% 50% 16% 16% / 62% 62% 9% 9%", cap: true },
  /* A cut-glass drop, faceted rather than blown. */
  {
    ratio: "4 / 5",
    clip: "polygon(50% 0%, 88% 28%, 70% 100%, 30% 100%, 12% 28%)",
    cap: true,
  },
  /* A lantern - the softened box, for a little relief from the curves. */
  { ratio: "4 / 5", radius: "30% 30% 30% 30% / 20% 20% 20% 20%", cap: true },
] as const;

type ChristmasShape = (typeof CHRISTMAS_SHAPES)[number];

/**
 * The glass the plain ornaments are blown from.
 *
 * `accent` is not a fixed colour here - the Christmas block in `globals.css`
 * retunes `--color-accent-*` to the feast's red for the whole site - so the
 * crimson ornament is the same red as every rule and eyebrow around it without
 * this file naming a red at all. Gold and ivory are stated, because neither is
 * in the church's own palette and neither should be.
 */
const GLASS = {
  crimson: "bg-gradient-to-br from-accent-300 via-accent-500 to-accent-700",
  gold: "bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600",
  ivory: "bg-gradient-to-br from-white via-sand-100 to-sand-300",
} as const;

type Glass = keyof typeof GLASS;

/**
 * The ornaments that are not people.
 *
 * The company is eleven, and eleven arches on a ring is a group portrait. A
 * tree is not a group portrait: it is a few faces you know among a great many
 * things that catch the light, and the faces are what you pick out *because* of
 * everything else. So at Christmas the ring is dressed with these as well -
 * threaded in between the portraits rather than tacked on the end, so they fly
 * out of the same centre on the same loop and the reader never sees a company
 * of people followed by a company of baubles.
 *
 * Each names a shape from the table above and the glass it is blown from.
 */
const DECORATIONS: { shape: number; glass: Glass }[] = [
  { shape: 0, glass: "crimson" },
  { shape: 2, glass: "gold" },
  { shape: 3, glass: "ivory" },
  { shape: 1, glass: "gold" },
  { shape: 5, glass: "crimson" },
  { shape: 2, glass: "ivory" },
  { shape: 4, glass: "gold" },
];

/** One thing on the ring: somebody who serves, or something that shines. */
type StageItem =
  | { kind: "person"; key: string; figure: ConstellationFigure }
  | { kind: "ornament"; key: string; shape: number; glass: Glass };

/**
 * The ring's contents, in ring order.
 *
 * Outside Christmas that is simply the company. Inside it the decorations are
 * dealt evenly *between* the portraits - the running-ratio test is the same one
 * a line-drawing algorithm uses, and it is here for the same reason: it spaces
 * a few of one thing through many of another without either clumping at an end.
 */
function stageItems(
  figures: ConstellationFigure[],
  christmas: boolean,
): StageItem[] {
  const people: StageItem[] = figures.map((figure) => ({
    kind: "person",
    key: figure.id,
    figure,
  }));

  if (!christmas || people.length === 0) return people;

  const extras: StageItem[] = DECORATIONS.map((decoration, index) => ({
    kind: "ornament",
    key: `ornament-${index}`,
    ...decoration,
  }));

  const total = people.length + extras.length;
  const items: StageItem[] = [];

  let taken = 0;
  for (let index = 0; index < total; index++) {
    const due = Math.floor(((index + 1) * extras.length) / total);

    if (taken < due && taken < extras.length) {
      items.push(extras[taken++]);
    } else {
      items.push(people[index - taken] ?? extras[taken++]);
    }
  }

  return items;
}

/** Decisive arrival: most of the distance early, then a settle. */
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -9 * t));

/** Where one portrait flies out to, and how it is treated on the way. */
function slot(index: number, count: number) {
  /*
   * Anticlockwise from the top. The first person out of the centre is the one
   * the page has just named - the presbyter-in-charge - and they leave from the
   * top of the ring rather than from wherever a zero angle happens to fall.
   */
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  const near = NEARNESS[index % NEARNESS.length];

  return {
    dx: Math.cos(angle) * RADIUS_X * near,
    dy: Math.sin(angle) * RADIUS_Y * near,
    /* Degrees, for the streak behind the portrait to lie along. */
    heading: (angle * 180) / Math.PI,
    size: SIZES[index % SIZES.length],
    tilt: TILTS[index % TILTS.length],
  };
}

/**
 * The order they leave the centre in: `0`, halfway, `1`, halfway plus one, and
 * so on round the ring.
 *
 * Not the order they are laid out in, which would sweep the ring like a second
 * hand. Stepping the departures half a turn apart sends each portrait out
 * roughly opposite the one before it, so the stage empties outwards in every
 * direction at once - which is the thing being drawn.
 *
 * Returned as a rank per figure, so a figure's own index is all it needs to
 * know where on the loop it sits.
 */
function departureRanks(count: number): number[] {
  const ranks = new Array<number>(count);
  const half = Math.ceil(count / 2);

  let rank = 0;
  for (let k = 0; k < half; k++) {
    ranks[k] = rank++;
    if (k + half < count) ranks[k + half] = rank++;
  }

  return ranks;
}

/**
 * How strongly one portrait is drawn at this point in its pass: up out of the
 * depth, held, then away again.
 */
function fade(phase: number): number {
  if (phase < FADE_IN) return phase / FADE_IN;
  if (phase > FADE_OUT) return (1 - phase) / (1 - FADE_OUT);
  return 1;
}

/** The fractional part, for negative drives as well as positive ones. */
function wrap(value: number): number {
  const fraction = value % 1;
  return fraction < 0 ? fraction + 1 : fraction;
}

/**
 * The whole company, coming past the reader out of one centre.
 *
 * The chapter has just opened on "those who serve among us" and the sections
 * below answer it one office at a time - presbyters, then committee, then staff
 * - which is the right way to read it and the wrong way to *meet* it. This is
 * the establishing shot before that: the page holds still and the whole company
 * comes out of the middle of the screen and past the reader in perspective, one
 * behind the other, on a loop that keeps turning for as long as the stage is
 * held.
 *
 * The pin is what the request "after reaching this section fully" means.
 * Progress is read `start start` to `end end` on the outer block, which is zero
 * for the whole time the section is climbing into view and only begins the
 * moment its top meets the top of the viewport - by which point the stage owns
 * the screen. Nothing has passed the camera before then.
 *
 * The loop is driven by two things at once, which is what makes it read as an
 * animation rather than as a scrubbed video: the scroll carries it forward
 * `CYCLES` times over the pin, and a slow clock underneath keeps it turning
 * while the reader is still. See `IDLE_SPEED`.
 *
 * Two cases where none of that happens:
 *
 * **`prefers-reduced-motion`.** A plain centred gallery under the same copy -
 * the same people, the same arches, nothing moving at all.
 *
 * **Nobody to show.** The section renders nothing rather than pinning a screen
 * of empty stage.
 */
export function LeadershipConstellation({
  figures,
  eyebrow,
  title,
  subtitle,
  label,
}: LeadershipConstellationProps) {
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

  /*
   * The season is read on the client - it depends on the reader's clock and on
   * `?season=` in the URL, neither of which exists when these pages are built -
   * so the server renders the arches and the tree dresses itself on hydration.
   * That is the same bargain every other Christmas piece on the site makes; see
   * `useLiturgicalSeason`.
   */
  const christmas = isSnowSeason(useLiturgicalSeason());
  const items = useMemo(
    () => stageItems(figures, christmas),
    [figures, christmas],
  );

  const count = items.length;
  const ranks = useMemo(() => departureRanks(count), [count]);

  /*
   * Decided from the count, which the server knows, so the markup React
   * hydrates already has the pin and the page's height does not change under
   * the reader on load. Everything that moves is a transform, which costs no
   * layout.
   */
  const pinned = !shouldReduceMotion && figures.length > 0;

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
   * The idle clock, counted in passes. Advanced by elapsed time rather than by
   * frames, so the drift is the same on a 60Hz laptop and a 120Hz phone - and
   * only while the stage is actually on screen.
   */
  const inView = useInView(outerRef, { amount: 0.05 });
  const clock = useMotionValue(0);

  useAnimationFrame((_, delta) => {
    /*
     * Turns for as long as the stage is on screen, including while it is still
     * climbing into view.
     *
     * This used to wait for `scrollYProgress` to leave zero - that is, for the
     * pin to start. Now that the company is visible during the approach, that
     * guard would hold them frozen for the screen before the pin and start them
     * moving the instant it began, which is a worse tell than the blank screen
     * it replaced.
     */
    if (!inView || !pinned) return;
    clock.set(clock.get() + (delta / 1000) * IDLE_SPEED);
  });

  /*
   * One number for the whole stage: how many complete passes have gone by. Each
   * portrait takes its own fraction of it and reads its position from that, so
   * they are all on one loop rather than on eleven animations that have to be
   * kept in step with one another.
   */
  const drive = useTransform(() => clock.get() + scrollYProgress.get() * CYCLES);

  /*
   * The centre copy and the company, which arrive on the approach and stay for
   * the rest of the pin.
   *
   * On `arrival` rather than on the pin: the stage is meant to be there when it
   * reaches the top of the screen, not to start assembling once it gets there.
   */
  const introOpacity = useTransform(arrival, [0.15, 0.7], [0, 1], {
    clamp: true,
  });
  const introScale = useTransform(arrival, [0.15, 0.7], [0.94, 1], {
    clamp: true,
    ease: easeOutExpo,
  });

  if (figures.length === 0) return null;

  /*
   * The field the passes are measured against.
   *
   * `container-type: size` is what lets the ring be placed in `cqw` and `cqh` -
   * percentages of this box - instead of pixels from a `ResizeObserver`. The
   * ellipse is then a fact about the stylesheet rather than a number recomputed
   * on every resize, and there is no first frame where the constellation is
   * stacked at the origin waiting to be measured.
   *
   * `perspective` is the camera, and it belongs here because CSS perspective
   * applies to an element's *children*: each portrait is a direct child of this
   * box, translated in `z`, and is projected against this box's centre. That is
   * also why the portraits are laid out with one transform each and no wrapper
   * to centre them - a wrapper with a transform of its own would flatten the 3D
   * context and the depth would quietly stop working.
   *
   * `overflow-hidden` because the whole point is that they leave: at the near
   * end of a pass a portrait is well outside this box, and without the clip it
   * would be drawn over the sections above and below.
   *
   * It is the whole screen, edge to edge. An inset field clips each pass a
   * header's height early at the top and a margin early at the foot, which does
   * not read as a portrait leaving the frame - it reads as one being cut off
   * inside a box, with a band of empty ground beneath it. The clip has to be
   * the edge of the screen or the effect has no edge to happen at.
   */
  const stage = (
    <div
      style={{ containerType: "size", perspective: `${PERSPECTIVE}px` }}
      className="relative min-h-0 w-full flex-1 overflow-hidden"
    >
      {/*
        Sanctuary light at the centre, so the portraits look sent out from
        something rather than spawned at a point. Grows with the copy.

        The centring is on the wrapper and the animation on the child: framer
        writes `transform` from `scale`, which would overwrite a
        `-translate-1/2` pair sitting on the same element.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <motion.div
          style={{ opacity: introOpacity, scale: introScale }}
          className="size-[min(70cqw,70cqh)] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-accent-500)_18%,transparent),transparent_70%)] blur-2xl"
        />
      </div>

      {items.map((item, index) => (
        <Pass
          key={item.key}
          item={item}
          index={index}
          count={count}
          christmas={christmas}
          drive={drive}
          gate={introOpacity}
          /*
            Evenly spaced round the loop, in departure order - so the gap
            between one thing and the next is the same whether there are six of
            them or twenty.
          */
          offset={ranks[index] / count}
        />
      ))}

      {/*
        The centre.

        Last in the source order, which is what puts it over the portraits: the
        field is a flat rendering context, so its children paint in document
        order and each pass emerges from behind the title rather than over the
        top of it.

        Narrow on a phone - the ring is only ~30% of a 390px screen out at rest,
        and a full-measure paragraph there would be run through by the first
        portrait to leave.
      */}
      <div
        style={{ zIndex: CENTRE_DEPTH }}
        className="pointer-events-none absolute left-1/2 top-1/2 w-[min(15rem,58cqw)] -translate-x-1/2 -translate-y-1/2 sm:w-[min(26rem,46cqw)]"
      >
        <motion.div
          style={{ opacity: introOpacity, scale: introScale }}
          className="text-center"
        >
          <Eyebrow>{eyebrow}</Eyebrow>

          <Heading as="h3" level="h2" className="mt-4 text-balance">
            {title}
          </Heading>

          <span aria-hidden className="mx-auto mt-4 block h-px w-16 rule-gild" />

          <Text
            size="sm"
            tone="muted"
            className="mt-4 hidden text-pretty sm:block"
          >
            {subtitle}
          </Text>
        </motion.div>
      </div>
    </div>
  );

  return (
    <div
      ref={outerRef}
      // Hidden altogether in Simple mode - see globals.css.
      data-motion-scene
      /*
       * One screen for the stage plus the hold - and the extra height *is* the
       * scroll budget, the way it is everywhere else on this page. There is no
       * separate "how long should this last" number to keep in step.
       *
       * `svh` here against the `dvh` on the pinned frame below, which is the
       * same split the heroes make: the document's height has to be stable or
       * an address bar retracting on a phone would resize it and shunt the page
       * under the reader's thumb, while the frame has to fill what is actually
       * visible or the next section shows in a strip beneath it.
       */
      style={pinned ? { height: `calc(100svh + ${HOLD * 100}svh)` } : undefined}
      className="relative"
    >
      <div
        role="group"
        aria-label={label}
        className={cn(
          "flex flex-col",
          pinned
            ? // No padding: the stage is the screen. The floating header sits
              // over the top of it the way it sits over every hero on this
              // page, and there is nothing up there for it to collide with -
              // the copy is dead centre and the portraits are travelling
              // outwards past it.
              "sticky top-0 h-[100dvh]"
            : "py-20 sm:py-24",
        )}
      >
        {pinned ? (
          stage
        ) : (
          /*
            The reduced-motion reading. Everything the stage says, said the way
            the staff gallery further down says it: the copy, then the same
            arched portraits at the same sizes, wrapped and centred. No pin, no
            loop, nothing that moves.
          */
          <div className="mx-auto w-full max-w-5xl px-5 text-center sm:px-8">
            <Eyebrow>{eyebrow}</Eyebrow>

            <Heading as="h3" level="h2" className="mt-4 text-balance">
              {title}
            </Heading>

            <span aria-hidden className="mx-auto mt-4 block h-px w-16 rule-gild" />

            <Text
              size="sm"
              tone="muted"
              className="mx-auto mt-4 max-w-xl text-pretty"
            >
              {subtitle}
            </Text>

            <div className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-8">
              {figures.map((figure, index) => (
                <div key={figure.id} className="w-[7rem] sm:w-[8rem]">
                  {/* Dressed for the season here too - a reader who has asked
                      not to be moved around is not asking for a plainer
                      Christmas. */}
                  <Portrait
                    figure={figure}
                    shape={christmas ? shapeFor(index) : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * One thing on the ring, on its own pass.
 *
 * Its own component because each item needs its own derived motion values, and
 * a hook cannot be called in a loop.
 */
function Pass({
  item,
  index,
  count,
  christmas,
  drive,
  gate,
  offset,
}: {
  item: StageItem;
  index: number;
  count: number;
  /** Whether the ring is dressed for the feast. */
  christmas: boolean;
  /** Passes completed, shared by the whole stage. */
  drive: MotionValue<number>;
  /** The stage arriving, 0 to 1. Holds the whole company off until it has. */
  gate: MotionValue<number>;
  /** Where on the loop this one sits, 0 to 1. */
  offset: number;
}) {
  const { dx, dy, heading, size, tilt } = slot(index, count);

  /*
   * Where this portrait is in its own pass: 0 at the far end, 1 as it leaves.
   * Wrapping the shared drive is what makes the loop a loop, and the seam is at
   * 0 - where the portrait is invisible at both ends.
   */
  const phase = useTransform(drive, (value) => wrap(value + offset));

  /*
   * The only thing that actually animates. Everything the reader sees the
   * portrait do - start small in the middle, spread outwards, accelerate, grow,
   * leave the frame - is the perspective divide acting on this one number.
   */
  const z = useTransform(phase, [0, 1], [Z_FAR, Z_NEAR]);

  /*
   * Two things multiplied: where the portrait is in its own pass, and whether
   * the stage has arrived at all. The second is what keeps the company off the
   * screen until the section is fully in view - the portraits then fade up
   * together with the copy at the centre they are coming out of.
   */
  const opacity = useTransform(() => fade(phase.get()) * gate.get());

  /*
   * The `-50%` pair is inside the transform rather than on a wrapper, for the
   * reason given on the field: a wrapper with its own transform would flatten
   * the 3D context and `z` would stop meaning depth. Percentages in a translate
   * are of the element's own box, so they centre it on its point; `cqw`/`cqh`
   * are of the stage, so the ring stays a share of the screen. `calc` is what
   * lets one translate hold both.
   */
  const transform = useMotionTemplate`translate3d(calc(${dx}cqw - 50%), calc(${dy}cqh - 50%), ${z}px) rotate(${tilt}deg) scale(${size})`;

  /* The streak fades up with the portrait and burns off as it passes. */
  const trail = useTransform(phase, [0, FADE_IN, 0.6, 1], [0, 0.5, 0.28, 0]);

  /*
   * Depth order, because CSS will not do it for us: the stage is a flat
   * rendering context, so its children paint in document order and a portrait
   * still far away would otherwise be drawn over one about to leave. Stepping
   * the index with the pass puts the nearest one in front, which is also what
   * carries them past the title in the middle - `CENTRE_DEPTH` is the layer the
   * copy sits on, so a portrait emerges from behind it and crosses in front of
   * it once it is clear of the words.
   */
  const zIndex = useTransform(phase, (value) => Math.round(value * 100));

  return (
    <motion.div
      style={{ transform, opacity, zIndex, willChange: "transform, opacity" }}
      className={cn(
        "absolute left-1/2 top-1/2",
        /*
          A step larger than they were, because there is no longer a caption
          under them to leave room for. The clamp keeps them a share of the
          screen rather than a fixed size, so a phone gets a frame it can read
          and a wide monitor is not shown eleven postage stamps.

          The plain ornaments are cut smaller on purpose. They are the tree, not
          the congregation: at the same size as a face they compete with it, and
          at two-thirds they read as what they are - the light around the people
          the section is about.
        */
        item.kind === "ornament"
          ? "w-[clamp(2rem,6.5vw,4.75rem)]"
          : "w-[clamp(3.25rem,10vw,7.5rem)]",
      )}
    >
      {/*
        A hairline of gold lying back along the line of travel - the trail the
        sketch drew as an arrow. It is inside the portrait's own transform, so
        it is carried, turned and magnified with it for free, and `heading+180`
        points it back at the centre the portrait came out of.

        Stylised rather than measured: a fixed length that grows with the
        portrait reads as speed, where a line drawn all the way back to the
        origin would read as a spoke on a wheel.
      */}
      <span
        aria-hidden
        style={{ rotate: `${heading + 180}deg` }}
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 block h-px w-[9rem] origin-left"
      >
        <motion.span
          style={{ opacity: trail }}
          className="absolute inset-0 block bg-gradient-to-r from-accent-500/80 to-transparent"
        />
      </span>

      {item.kind === "person" ? (
        <Portrait
          figure={item.figure}
          shape={christmas ? shapeFor(index) : undefined}
          compact
        />
      ) : (
        <Bauble shape={CHRISTMAS_SHAPES[item.shape]} glass={item.glass} />
      )}
    </motion.div>
  );
}

/**
 * A plain ornament - glass, a highlight and a collar, and nobody inside it.
 *
 * Cut from the same table as the portraits, so a bauble on the ring is exactly
 * the silhouette a portrait beside it is wearing. That is the whole reason the
 * decorations are worth having: they make the shape of a frame read as a
 * decision about Christmas rather than as an odd crop of somebody's face.
 */
function Bauble({ shape, glass }: { shape: ChristmasShape; glass: Glass }) {
  return (
    <div className="relative">
      <Cap shape={shape} />

      <div
        style={{
          aspectRatio: shape.ratio,
          borderRadius: "radius" in shape ? shape.radius : undefined,
          clipPath: "clip" in shape ? shape.clip : undefined,
        }}
        className={cn("relative w-full overflow-hidden shadow-card", GLASS[glass])}
      >
        <Sheen />
      </div>
    </div>
  );
}

/**
 * The brass collar and loop an ornament hangs from.
 *
 * Sized in percentages of the frame it caps, so it is right on a 52px phone
 * frame and still right when the perspective divide has magnified the same
 * frame to two and a half times its size on the way past the reader. The two
 * fixed pixel values inside it are scaled by that same transform, so they hold
 * their proportion too.
 */
function Cap({ shape }: { shape?: ChristmasShape }) {
  if (!shape?.cap) return null;

  return (
    <span
      aria-hidden
      className="absolute bottom-full left-1/2 flex w-[16%] -translate-x-1/2 flex-col items-center text-amber-500"
    >
      <span className="aspect-square w-[72%] rounded-full border border-current" />
      <span className="h-[2px] w-full rounded-[1px] bg-current" />
    </span>
  );
}

/** The blown-glass highlight, up and to the left, where the window would be. */
function Sheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-[16%] top-[12%] h-[16%] w-[26%] -rotate-[18deg] rounded-[50%] bg-white/40 blur-[2px]"
    />
  );
}

/** Which silhouette this position on the ring is cut in. */
function shapeFor(index: number): ChristmasShape {
  return CHRISTMAS_SHAPES[index % CHRISTMAS_SHAPES.length];
}

/**
 * The arched portrait itself - the same window the clergy, the committee and
 * the staff are all set in, so the constellation reads as the same people the
 * sections below show rather than as a different treatment of them.
 */
function Portrait({
  figure,
  shape,
  compact = false,
}: {
  figure: ConstellationFigure;
  /** The Christmas silhouette to cut the frame in. Omitted, it is the arch. */
  shape?: ChristmasShape;
  compact?: boolean;
}) {
  const clipped = shape !== undefined && "clip" in shape;

  return (
    <figure className="relative text-center">
      <Cap shape={shape} />

      <div
        style={
          shape
            ? {
                aspectRatio: shape.ratio,
                borderRadius: "radius" in shape ? shape.radius : undefined,
                clipPath: "clip" in shape ? shape.clip : undefined,
              }
            : undefined
        }
        className={cn(
          "relative w-full overflow-hidden bg-sand-200 shadow-card",
          /* No seasonal cut: the sanctuary window, as it is for most of the year. */
          !shape && "window-arch aspect-[4/5]",
          /*
            A clipped frame has no edge to rule: the ring would be cut away with
            everything else outside the polygon, and a half-drawn hairline is
            worse than none. Every curved cut keeps its hairline, which is what
            stops a bauble reading as a floating disc.
          */
          !clipped && "ring-1 ring-[var(--border)]",
        )}
      >
        {figure.image ? (
          <Image
            src={figure.image.src}
            alt={figure.image.alt}
            fill
            sizes="(max-width: 640px) 25vw, 9rem"
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="grid size-full place-items-center bg-brand-800"
          >
            <span
              className={cn(
                "font-display font-semibold text-white/85",
                compact ? "text-[clamp(0.9rem,2.6vw,1.9rem)]" : "text-2xl",
              )}
            >
              {figure.initials}
            </span>
          </div>
        )}

        {/* Blown glass, once it is an ornament rather than a window. */}
        {shape ? <Sheen /> : null}
      </div>

      {/*
        On the stage the caption is taken off the screen entirely - but not out
        of the document.

        Eleven names crossing each other at eleven different depths and sizes is
        text nobody can read and everybody has to look at; the arch is the whole
        of what the pass is meant to say, and the sections directly below name
        every one of these people properly and at rest. So `sr-only`, not
        `hidden`: the constellation is still a list of people, and a reader on a
        screen reader should get their names whatever the screen is doing.

        The still gallery keeps its captions. Nothing is moving there and nothing
        is overlapping, so a name under a face is simply a name under a face.
      */}
      <figcaption className={cn("mt-2.5", compact && "sr-only")}>
        <span className="block text-balance font-display text-sm font-semibold leading-tight">
          {figure.name}
        </span>

        <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
          {figure.designation}
        </span>
      </figcaption>
    </figure>
  );
}
