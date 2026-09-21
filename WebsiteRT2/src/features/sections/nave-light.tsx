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

export interface NaveLightProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Describes the picture for assistive tech. */
  label: string;
}

/**
 * How long the stage holds the page, in screens, on top of the one it fills.
 *
 * The same 1.6 the leadership and fellowship stages take, and the same for the
 * same reason: the three chapters open on one gesture - the page stops, one
 * thing happens, the page goes on - and a reader held for two and a half
 * screens on "those who serve" and again on "find your people" should be held
 * for two and a half screens here.
 *
 * It is also the slowest thing on the page by some margin, which is the whole
 * point of this one: two and a half screens buys a shaft of light about eleven
 * seconds to cross a room. Anything quicker is a searchlight.
 */
const HOLD = 1.6;

/**
 * How fast the light breathes on its own, in cycles per second, when the page
 * is still.
 *
 * The same pulse as the other two stages, and doing the same job: a stage that
 * freezes solid the instant a thumb leaves the screen reads as a broken video.
 * What it drives here is the one thing in a real church that is never still
 * even when everything else is - the strength of the daylight. The shafts do
 * not creep on their own; they brighten and dim, the way they do when there is
 * weather outside.
 *
 * Runs only while the section is on screen and pinned; see `inView` below.
 */
const IDLE_SPEED = 0.045;

/** How far the daylight rises and falls over that breath, as a fraction. */
const BREATH = 0.08;

/**
 * Where the light enters the room and where it comes to rest, in scene units.
 *
 * It starts off the left wall entirely - the first act is an empty church in
 * flat shade, before anything has happened to it - and finishes standing on the
 * rood. `TRAVEL_END` is not a round number because it is not a choice: it is
 * whatever puts the middle of the leading shaft on the cross at the height the
 * cross hangs at. See `SHAFTS` for the arithmetic it comes from.
 */
const TRAVEL_START = -74;
const TRAVEL_END = 46;

/**
 * The room, in a 160x160 field.
 *
 * Square rather than letterboxed, and that is a full-bleed decision rather than
 * a drawing one: the stage fills the viewport edge to edge with
 * `preserveAspectRatio="slice"`, so whatever the scene's aspect is, the screen
 * crops the other axis away. A wide scene on an upright phone would be cropped
 * to a fifth of its width - the middle bay and nothing else. Square, the same
 * phone keeps half the room, which is the altar, the rood, the aisle and a bay
 * either side of it; and a wide monitor crops vault and floor instead, which
 * are the two things in here with least in them.
 *
 * It is a nave from the back, where anybody arriving actually stands: the vault
 * overhead, the clerestory, the arcade across the far end, the altar and rood
 * in the middle bay, and the backs of the pews running away in front. Flat and
 * spare on purpose - this is a church the way a woodcut is a church, and every
 * line that is not load-bearing is a line competing with the light.
 */
const BAYS = [28, 54, 80, 106, 132];
const PIERS = [15, 41, 67, 93, 119, 145];
const SPRING = 82;
const FLOOR = 112;
const BOSS = { x: 80, y: 12 };

/**
 * The shafts, before they are moved.
 *
 * Two of them, because a clerestory has more than one window in it and a single
 * beam in an empty room reads as a spotlight. The second is fainter and further
 * back; together they say "morning" in a way one of them cannot.
 *
 * Each is four corners: a narrow mouth above the frame and a wide foot below
 * it, leaning right at about twenty degrees. The source is off the frame rather
 * than fixed to one of the lancets, and that is deliberate - a sun that moves
 * has to be allowed to move, and a beam pinned to a window it has walked away
 * from is the one thing that would break it.
 *
 * The lean is what sets `TRAVEL_END`: at the rood's height the leading shaft's
 * middle has come 34 units right of its mouth, so the mouth has to stand 46
 * units left of the rood for the light to land on it.
 */
const SHAFTS = [
  { points: "-11,-10 11,-10 88,170 52,170", opacity: 1 },
  { points: "-54,-10 -36,-10 38,170 8,170", opacity: 0.5 },
];

/** Where dust hangs in the leading shaft. `[x, y, radius, delay]`. */
const MOTES: [number, number, number, number][] = [
  [3, 8, 0.5, 0],
  [-4, 24, 0.36, 1.7],
  [9, 38, 0.6, 3.4],
  [2, 52, 0.4, 0.8],
  [16, 64, 0.52, 2.6],
  [7, 78, 0.34, 4.1],
  [22, 88, 0.6, 1.2],
  [13, 100, 0.44, 3],
  [29, 112, 0.36, 5.2],
  [20, 124, 0.54, 2.1],
  [36, 134, 0.4, 4.6],
  [26, 146, 0.48, 0.4],
  [43, 156, 0.36, 2.9],
  [33, 166, 0.52, 5.8],
  [46, 72, 0.3, 3.7],
  [-1, 94, 0.38, 5],
  [11, 140, 0.32, 1.4],
  [39, 46, 0.42, 4.9],
];

/**
 * A shaft of light crossing an empty nave.
 *
 * The chapter has just said "gather with us", and this is the room it is
 * inviting people into, an hour before any of them are in it. Nothing happens
 * except the one thing that happens in every church every day whether anybody
 * is watching or not: the sun comes round, crosses the floor, and rests on the
 * cross. Where it falls, the stone warms from shade to sunlight and then cools
 * again behind it.
 *
 * ## Cinema
 *
 * It fills the section edge to edge and there is a camera on it. Over the pin
 * the frame pushes slowly in - a tenth, no more, which is about as much as a
 * shot can move before it stops being a held shot - and the room comes apart
 * into three planes as it does: the vault drifts one way, the pews the other,
 * the arcade holds. Nothing in the room is actually moving. It is one scale and
 * three translations, and it is enough to turn a flat drawing into a place with
 * depth in it, because that is exactly the information a real dolly gives an
 * eye.
 *
 * The caption is laid into the foot of the frame over a scrim rather than set
 * in a block beneath it. A picture that ends two thirds of the way down the
 * screen so a paragraph can have the rest is an illustration; a picture that
 * runs to all four edges with the words *in* it is a shot.
 *
 * ## Against the other two stages
 *
 * This is the third pinned stage on the page and deliberately the third
 * *picture*. `LeadershipConstellation` is a camera in the literal sense:
 * portraits on a loop, out of the middle of the screen and past the reader in
 * perspective. `FellowshipConstellation` is a chart: fixed points, and lines
 * drawn between them once, forwards. This one is a room, and the only thing
 * that happens in it is that the light gets round to it. Its subject does not
 * move at all: a single mask travels, and every warming and cooling the reader
 * sees is a consequence of that one number rather than a thing that had to be
 * animated.
 *
 * It is also the one stage in daylight. The other two are night skies and had
 * to be; a room lit from a window cannot be staged on black without becoming a
 * room lit by a torch.
 *
 * Under `prefers-reduced-motion` the shot is rendered where it finishes - the
 * light standing on the cross, the camera at the end of its push - with no pin
 * and nothing moving. Not a plainer substitute for the composition: the
 * composition, at the moment it was made for. See `still`.
 */
export function NaveLight({ eyebrow, title, subtitle, label }: NaveLightProps) {
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
   * The shot at its last frame, as a number.
   *
   * Everything on the stage reads its state off one value between 0 and 1, so
   * the still rendering is not a second set of components with the animation
   * taken out of them - it is the same components handed a 1. Every window
   * below closes at or before the end of the travel, so a constant 1 is the
   * finished picture by construction, and there is only ever one drawing to
   * maintain.
   */
  const still = useMotionValue(1);
  const drive = pinned ? scrollYProgress : still;

  /*
   * The daylight's breath, counted in cycles. Advanced by elapsed time rather
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

  const weather = useTransform(
    clock,
    (value) => 1 + Math.sin(value * Math.PI * 2) * BREATH,
  );

  /*
   * The camera.
   *
   * A tenth of a push over two and a half screens, which is slow enough that a
   * reader never catches it moving and still arrives somewhere closer than they
   * started. The lift is smaller again: the frame settles a little as it comes
   * in, the way a shot on a head does rather than the way a zoom does.
   */
  const cameraScale = useTransform(drive, [0, 1], [1, 1.1], { clamp: true });
  const cameraLift = useTransform(drive, [0, 1], [0, -1.6], { clamp: true });
  const camera = useMotionTemplate`translate3d(0, ${cameraLift}%, 0) scale(${cameraScale})`;

  /*
   * The three planes.
   *
   * Vault above, arcade holding the middle, pews in front. The two that move
   * move against each other and by very little - two scene units on a field of
   * a hundred and sixty - because the whole of parallax is that near things
   * travel further than far ones, and the eye reads a couple of units of that
   * as depth long before it reads it as movement.
   */
  const vaultShift = useTransform(drive, [0, 1], [0, 2.4], { clamp: true });
  const pewShift = useTransform(drive, [0, 1], [0, -4.6], { clamp: true });
  const vaultTransform = useMotionTemplate`translate(0px, ${vaultShift}px)`;
  const pewTransform = useMotionTemplate`translate(0px, ${pewShift}px)`;

  /*
   * Where the light is.
   *
   * Three stops rather than two, and the third is the whole difference between
   * a light crossing a room and a light arriving somewhere: the last fifth of
   * the pin covers three units. It decelerates into the rood and stands there
   * for as long as the reader keeps scrolling, which is what turns the movement
   * into an ending rather than stopping it at one.
   */
  const shaft = useTransform(
    drive,
    [0.06, 0.78, 1],
    [TRAVEL_START, TRAVEL_END - 3, TRAVEL_END],
    { clamp: true },
  );
  const shaftTransform = useMotionTemplate`translate(${shaft}px, 0px)`;

  /*
   * The room comes up on the approach: the building is standing there in shade
   * before the stage owns the screen, and the sun is what the pin is for.
   *
   * On `arrival` rather than on the pin - see the note above. This is the whole
   * of the blank-screen fix: gated on the pin, the frame was a flat sheet of
   * wall colour for the entire screen it took to climb into view.
   */
  const dawn = useTransform(arrival, [0.1, 0.6], [0, 1], { clamp: true });

  /* The shafts fade in at the wall rather than switching on. */
  const shaftFade = useTransform(drive, [0.06, 0.2], [0, 1], { clamp: true });
  const beam = useTransform(() => shaftFade.get() * weather.get());

  /*
   * The room's own light, rising as the sun comes round to the window.
   *
   * Separate from the shafts and much weaker, because a real room does not stay
   * at one exposure while a beam crosses it - everything comes up a little. It
   * is what keeps the shade from reading as a flat grey plate the shafts are
   * slid across.
   */
  const ambient = useTransform(drive, [0.1, 0.85], [0, 1], { clamp: true });

  /* The rood, once the light is on it. */
  const rood = useTransform(drive, [0.78, 0.98], [0, 1], { clamp: true });
  const roodGlow = useTransform(() => rood.get() * weather.get());

  /*
   * The vignette, closing by a few per cent as the shot lands.
   *
   * The oldest trick there is and still the right one: the frame darkens at the
   * corners exactly as the light arrives in the middle, so the reader's eye is
   * taken to the cross without a single thing on the screen being moved to put
   * it there.
   */
  const vignette = useTransform(drive, [0.2, 1], [0.4, 0.92], { clamp: true });

  /* The caption, which arrives with the room and stays for the rest of the pin. */
  const copyOpacity = useTransform(arrival, [0.2, 0.75], [0, 1], { clamp: true });
  const copyLift = useTransform(arrival, [0.2, 0.75], [22, 0], { clamp: true });
  const copyTransform = useMotionTemplate`translate3d(0, ${copyLift}px, 0)`;

  return (
    <div
      ref={outerRef}
      /*
       * One screen for the stage plus the hold - and the extra height *is* the
       * scroll budget, exactly as it is on the other two stages and on every
       * hero. There is no separate "how long should this last" number to keep
       * in step with anything.
       *
       * `svh` here against the `dvh` on the pinned frame below: the document's
       * height has to be stable or a retracting address bar would resize it and
       * shunt the page under the reader's thumb, while the frame has to fill
       * what is actually visible or the events grid below shows in a strip
       * beneath it.
       */
      style={pinned ? { height: `calc(100svh + ${HOLD * 100}svh)` } : undefined}
      className="relative"
    >
      {/*
        The frame.

        Edge to edge and nothing else in it - no flex column, no block beneath.
        The picture is the section; the words are laid into it.
      */}
      <div
        role="img"
        aria-label={label}
        className={cn(
          "relative overflow-hidden bg-[var(--surface-muted)]",
          pinned ? "sticky top-0 h-[100dvh]" : "h-[86svh] min-h-[34rem]",
        )}
      >
        <motion.div
          style={{ opacity: dawn, transform: camera }}
          className="absolute inset-0 will-change-transform"
        >
          {/*
            `slice`, so the room covers the frame on any screen rather than
            sitting inside it with wall showing round the edges. The scene is
            square for exactly this reason - see the note on the geometry above.
          */}
          <svg
            viewBox="0 0 160 160"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 size-full"
          >
            <defs>
              {/* The soft edge of a shaft. One filter, used by the mask and by
                  the visible beams, because they are the same shape. */}
              <filter id="nave-soft" x="-45%" y="-20%" width="190%" height="140%">
                <feGaussianBlur stdDeviation="3.6" />
              </filter>

              <filter id="nave-bloom" x="-90%" y="-90%" width="280%" height="280%">
                <feGaussianBlur stdDeviation="2.6" />
              </filter>

              {/* A shaft falls off as it goes down the room: the mouth is the
                  brightest part of any beam, and the foot is where the air has
                  had furthest to scatter it. */}
              <linearGradient id="nave-beam" x1="0" y1="0" x2="0.35" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-100)" stopOpacity="0.85" />
                <stop offset="52%" stopColor="var(--color-accent-200)" stopOpacity="0.44" />
                <stop offset="100%" stopColor="var(--color-accent-300)" stopOpacity="0.08" />
              </linearGradient>

              {/*
                The sunlit copy of the room is drawn over the shaded one and
                shown only where the shafts are. That is the entire mechanism:
                one mask, one number, and every warming and cooling in the
                picture is a consequence of it rather than a thing that had to
                be animated.
              */}
              <mask
                id="nave-sun"
                maskUnits="userSpaceOnUse"
                x="-120"
                y="-40"
                width="420"
                height="260"
              >
                <motion.g style={{ transform: shaftTransform }}>
                  {SHAFTS.map(({ points, opacity }) => (
                    <polygon
                      key={points}
                      points={points}
                      fill="white"
                      opacity={opacity}
                      filter="url(#nave-soft)"
                    />
                  ))}
                </motion.g>
              </mask>
            </defs>

            {/* The room in shade. */}
            <Nave vault={vaultTransform} pews={pewTransform} />

            {/* The room in sunlight, shown only under the shafts. */}
            <g mask="url(#nave-sun)">
              <Nave lit vault={vaultTransform} pews={pewTransform} />
            </g>

            {/* The room's own exposure coming up with the morning. */}
            <motion.rect
              x="-20"
              y="-20"
              width="200"
              height="200"
              fill="var(--color-accent-200)"
              style={{ opacity: ambient }}
              opacity={0.16}
            />

            {/* The rood takes the light and keeps it. Outside the mask, because
                the ending is the one thing in the picture allowed to persist
                after the shaft has settled on it. */}
            <motion.g style={{ opacity: roodGlow }}>
              <path
                d={ROOD}
                fill="none"
                stroke="var(--color-accent-300)"
                strokeWidth={5.5}
                strokeLinecap="round"
                filter="url(#nave-bloom)"
                opacity={0.5}
              />
              <path
                d={ROOD}
                fill="none"
                stroke="var(--color-accent-700)"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            </motion.g>

            {/* The shafts themselves - the air in them, and the dust hanging
                in the leading one. */}
            <motion.g style={{ opacity: beam, transform: shaftTransform }}>
              {SHAFTS.map(({ points, opacity }) => (
                <polygon
                  key={points}
                  points={points}
                  fill="url(#nave-beam)"
                  opacity={opacity}
                  filter="url(#nave-soft)"
                />
              ))}

              {/*
                Dust. The one thing in the picture that says the light is a body
                of air rather than a gradient, and the only thing here that
                moves on a clock instead of on the scroll - because dust does
                not stop when you stop reading. One CSS animation with a delay
                per mote, so eighteen of them cost one animated property; see
                `.nave-mote` in `globals.css`.
              */}
              {MOTES.map(([x, y, radius, delay], index) => (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r={radius}
                  fill="var(--color-accent-100)"
                  style={{ animationDelay: `${delay}s` }}
                  className="nave-mote"
                />
              ))}
            </motion.g>
          </svg>
        </motion.div>

        {/* The vignette, closing on the cross. */}
        <motion.div
          aria-hidden
          style={{ opacity: vignette }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(115%_80%_at_50%_44%,transparent_38%,color-mix(in_oklab,var(--color-sand-500)_46%,transparent))]"
        />

        {/*
          The caption, laid into the foot of the frame.

          On its own scrim rather than in a block below the picture: the shot
          runs to all four edges, and the words are in it. The gradient is tall
          and slow so it reads as the floor falling into shadow rather than as a
          bar with text on it.
        */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--surface-muted)] via-[color-mix(in_oklab,var(--surface-muted)_82%,transparent)] to-transparent"
        />

        <Container className="absolute inset-x-0 bottom-0 pb-14 sm:pb-16">
          <motion.div
            style={{ opacity: copyOpacity, transform: copyTransform }}
            className="mx-auto max-w-2xl text-center"
          >
            <Eyebrow>{eyebrow}</Eyebrow>

            <Heading as="h3" level="h2" className="mt-4 text-balance">
              {title}
            </Heading>

            <span aria-hidden className="mx-auto mt-5 block h-px w-16 rule-gild" />

            <Text size="sm" tone="muted" className="mt-5 text-pretty">
              {subtitle}
            </Text>
          </motion.div>
        </Container>
      </div>
    </div>
  );
}

/** The cross over the altar, in one string so the glow and the line agree. */
const ROOD = "M80 62v34M69 74h22";

/**
 * The building, drawn twice.
 *
 * Once in shade and once in sunlight, identical but for four colours - which is
 * why it is one component with a flag rather than two drawings that would have
 * to be kept in step with each other by hand. The sunlit copy is the shaded one
 * with warmth in it, not a different room, and the only way to guarantee that
 * is for there to be one room.
 *
 * The two moving planes are handed in rather than derived here, for the same
 * reason: both copies have to be on exactly the same camera or the sunlit stone
 * would slide against the shaded stone it is supposed to be.
 */
function Nave({
  lit,
  vault,
  pews,
}: {
  lit?: boolean;
  vault: MotionValue<string>;
  pews: MotionValue<string>;
}) {
  const stone = lit ? "var(--color-accent-700)" : "var(--color-sand-400)";
  const fill = lit ? "var(--color-accent-100)" : "var(--color-sand-200)";
  const deep = lit ? "var(--color-accent-200)" : "var(--color-sand-300)";
  const pew = lit ? "var(--color-accent-600)" : "var(--color-sand-500)";

  return (
    <g fill="none" stroke={stone} strokeLinecap="round" strokeLinejoin="round">
      {/* ---- The vault, overhead ------------------------------------------ */}
      <motion.g style={{ transform: vault }}>
        {/* Ribs fanning up from every pier to the boss. A fan vault is the one
            ceiling that can be drawn in six lines and still be a ceiling. */}
        {PIERS.map((x) => (
          <path
            key={`rib-${x}`}
            d={`M${x} 54Q${(x + BOSS.x) / 2} ${20 + Math.abs(x - BOSS.x) * 0.1} ${BOSS.x} ${BOSS.y}`}
            strokeWidth={0.7}
            opacity={0.5}
          />
        ))}
        <circle cx={BOSS.x} cy={BOSS.y} r="3.2" fill={deep} strokeWidth={0.7} />

        {/* The clerestory: one lancet over each bay. */}
        {BAYS.map((x) => (
          <path
            key={`lancet-${x}`}
            d={`M${x - 4} 50V34q0-7 4-10 4 3 4 10v16z`}
            fill={deep}
            strokeWidth={0.7}
            opacity={0.9}
          />
        ))}
        <path d="M4 54h152" strokeWidth={0.6} opacity={0.5} />
      </motion.g>

      {/* ---- The arcade, holding the middle ------------------------------- */}
      {BAYS.map((x) => (
        <path
          key={`arch-${x}`}
          d={`M${x - 10} ${FLOOR}V${SPRING}q0-13 10-18 10 5 10 18v${FLOOR - SPRING}`}
          fill={fill}
          strokeWidth={0.9}
        />
      ))}

      {PIERS.map((x) => (
        <path key={`pier-${x}`} d={`M${x} 54V${FLOOR}`} strokeWidth={1.8} opacity={0.7} />
      ))}

      {/* The altar under the middle bay, and the rood over it. */}
      <rect x="70" y="96" width="20" height="7" rx="0.9" fill={fill} strokeWidth={0.8} />
      <path d={ROOD} strokeWidth={1.6} />

      {/* ---- The floor and the pews, in front ----------------------------- */}
      <path d={`M0 ${FLOOR}h160`} strokeWidth={1} />

      <motion.g style={{ transform: pews }}>
        {[122, 136, 152].map((y) => (
          <path key={`flag-${y}`} d={`M0 ${y}h160`} strokeWidth={0.4} opacity={0.22} />
        ))}

        {/*
          The pews, from the back.

          Three ranks, each split at the aisle, each a little wider and a little
          lower than the one behind it - which is the whole of the perspective
          in this picture and as much as it needs. A nave drawn in true
          recession would be a corridor coming at the reader, and that is the
          leadership stage's move, one chapter up.
        */}
        {[
          { y: 126, inset: 30, gap: 7 },
          { y: 141, inset: 18, gap: 8.5 },
          { y: 157, inset: 4, gap: 10 },
        ].map(({ y, inset, gap }) => (
          <g key={`pews-${y}`} stroke={pew} strokeWidth={2.6} opacity={0.72}>
            <path d={`M${inset} ${y}H${80 - gap}`} />
            <path d={`M${80 + gap} ${y}H${160 - inset}`} />
          </g>
        ))}
      </motion.g>
    </g>
  );
}
