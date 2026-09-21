"use client";

import type { CSSProperties } from "react";
import { useId } from "react";

import { useLiturgicalSeason } from "@/components/common/liturgical-season";
import { isLentSeason, isSnowSeason } from "@/lib/liturgical-year";
import { cn } from "@/lib/utils";

/**
 * Christmas in every section: a treeline along the foot, ornaments hung from
 * the head.
 *
 * Rendered by `Section` itself, so the whole site is dressed by one change
 * rather than by decorating twenty page files by hand - and so nothing anyone
 * adds later can forget to join in.
 *
 * ## What replaced what
 *
 * The first attempt put an abstract spray of fir in two corners: boughs as
 * sweeping curves with needles struck along them in pairs. At the size it
 * actually rendered, that reads as scribble rather than as greenery - the eye
 * needs a silhouette it recognises before it will accept detail. Everything
 * here is a shape you can name from across the room: a triangular fir with a
 * star on top, a round bauble on a thread. Nothing is suggested; it is drawn.
 *
 * ## Geometry
 *
 * Every figure is a small fixed-size SVG positioned by percentage, never one
 * wide SVG stretched across the section. A wide one has to choose between
 * distorting its own contents (`preserveAspectRatio: none`) and cropping them
 * at some viewport width (`slice`); laid out this way there is no scaling
 * arithmetic to get wrong, the trees keep their drawn proportions from a 320px
 * phone to an ultrawide monitor, and only their spacing flexes.
 *
 * The tree path is symmetric about its own centre line by construction - every
 * point on the left has its mirror on the right - which is why it reads as a
 * fir at 40px rather than as a lopsided arrow.
 *
 * ## Layer
 *
 * `-z-10`, the same layer as the section's own light and grain, so every
 * decoration is behind the words. No arrangement can land on a paragraph, a
 * heading or a control at any width. Purely decorative: `aria-hidden`, no
 * focus stop, no text.
 */

/* A fir: star, three tiers, trunk, and two baubles caught in the branches. */
export function Tree({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 40 62"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* The star at the crown. */}
      <path
        d="M20 2l1.6 4 4 1.6-4 1.6L20 15l-1.6-3.8-4-1.6 4-1.6z"
        className="fill-current/25"
      />

      {/* Three tiers, mirrored point for point about x=20. */}
      <path d="M20 13 L13 27 L17 27 L9 40 L14 40 L4 52 L36 52 L26 40 L31 40 L23 27 L27 27 Z" />

      {/* Trunk and base. */}
      <path d="M20 52v7" strokeWidth="1.6" />
      <path d="M15 59h10" strokeWidth="1.6" />

      {/* Baubles. */}
      <circle cx="16" cy="34" r="1.7" className="fill-current/30" />
      <circle cx="25" cy="45" r="1.7" className="fill-current/30" />
      <circle cx="21" cy="46" r="1.3" className="fill-current/30" />
    </svg>
  );
}

/*
 * The same tree, in Lent: no star, no baubles, no tiers - a trunk and the limbs
 * that fork from it.
 *
 * Drawn to the same 40×62 box as the fir above, and standing on the same line,
 * so that a reader who saw the site in December meets the same horizon in
 * March with everything taken off it. That correspondence is the whole idea:
 * Lent is not decorated differently, it is the same page undressed.
 */
export function BareTree({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 40 62"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* Trunk, to the same base line the fir stands on. */}
      <path d="M20 59V22" strokeWidth="1.5" />
      <path d="M15 59h10" strokeWidth="1.5" />

      {/* Limbs, forking upward and outward. */}
      <path d="M20 42L8 28M20 42l12-13M20 33L10 22M20 33l11-10M20 50l-9-7M20 50l10-6" />

      {/* Twigs at the ends of the four upper limbs. */}
      <path d="M8 28l-4-2M8 28l0-4M32 29l4-3M32 29l0-4M10 22l-3-3M31 23l3-3" />
    </svg>
  );
}

/* A bauble on a thread, hung from the top edge of the section. */
export function Bauble({
  drop,
  className,
  style,
}: {
  drop: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox={`0 0 20 ${drop + 22}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d={`M10 0v${drop}`} className="opacity-50" />
      <path d={`M7.5 ${drop}h5v2.5h-5z`} />
      <circle cx="10" cy={drop + 11} r="7.5" className="fill-current/18" />
      <path
        d={`M3.2 ${drop + 8.5}c4.4 1.6 9.2 1.6 13.6 0M4.6 ${drop + 15}c3.4-1.3 7.4-1.3 10.8 0`}
        className="opacity-70"
      />
    </svg>
  );
}

/* A star on a thread - the other thing that hangs. */
export function HangingStar({
  drop,
  className,
  style,
}: {
  drop: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox={`0 0 20 ${drop + 20}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d={`M10 0v${drop}`} className="opacity-50" />
      <path
        d={`M10 ${drop} l2.3 5.6 5.6 2.3-5.6 2.3L10 ${drop + 16}l-2.3-5.8-5.6-2.3 5.6-2.3z`}
        className="fill-current/22"
      />
    </svg>
  );
}

/*
 * A veil, hung from a rod at the head of the section.
 *
 * The Lenten counterpart to a bauble, and the reason it is a veil rather than
 * a purple ornament: from Passiontide the crosses and images of a church are
 * *covered*, not taken down - the same practice the site already follows by
 * drawing the colour out of its photography through Holy Week. So what hangs
 * here in March is the cloth that hangs in the building.
 *
 * Drawn as cloth over a rod, with the hem scalloped by two shallow curves, so
 * it reads as fabric and not as a flag.
 */
export function Veil({
  drop,
  className,
  style,
}: {
  drop: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox={`0 0 22 ${drop + 30}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* The cord it hangs by, then the rod. */}
      <path d={`M11 0v${drop}`} className="opacity-50" />
      <path d={`M4 ${drop}h14`} strokeWidth="1.4" />

      {/* The cloth, hem scalloped. */}
      <path
        d={`M6 ${drop + 1}h10v16c-1.6 2.6-3.4 2.6-5 0c-1.6 2.6-3.4 2.6-5 0z`}
        className="fill-current/12"
      />

      {/* One fold, so the cloth has a front and a side. */}
      <path d={`M11 ${drop + 2}v14`} className="opacity-45" />
    </svg>
  );
}

/* A stone. A wilderness is made of these, and little else. */
export function Stone({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 22 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M2 11c0-4.5 4-7.5 9-7.5s9 3 9 7.5z" className="fill-current/10" />
    </svg>
  );
}

/**
 * What Lent hangs, and where. Four against Christmas's eight, and set wider
 * apart: the season is counted in what is missing from the room.
 */
const LENT_HANGING = [
  { left: 13, drop: 34, hide: false },
  { left: 38, drop: 20, hide: true },
  { left: 64, drop: 44, hide: false },
  { left: 88, drop: 26, hide: true },
] as const;

/** Stones along the foot, between the bare trees. */
const LENT_STONES = [
  { left: 8, width: 18, hide: true },
  { left: 24, width: 13, hide: false },
  { left: 46, width: 20, hide: false },
  { left: 58, width: 12, hide: true },
  { left: 79, width: 16, hide: false },
  { left: 93, width: 12, hide: true },
] as const;

/*
 * Calvary, for the sections on Good Friday: three crosses, the centre one
 * taller and the two beside it shorter and fainter.
 *
 * Drawn to the same 40×62 box the fir and the bare tree stand in, on the same
 * base line - so the reader who saw firs in December and bare branches in March
 * finds, on this one day, the thing the whole calendar has been walking toward
 * standing in exactly the same place.
 */
export function Calvary({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 40 62"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* The two beside, set back. */}
      <g className="opacity-50">
        <path d="M7 59V34" />
        <path d="M1 41h12" />
        <path d="M33 59V34" />
        <path d="M27 41h12" />
      </g>

      {/* The centre, standing clear. */}
      <path d="M20 59V12" strokeWidth="1.7" />
      <path d="M9 24h22" strokeWidth="1.7" />
    </svg>
  );
}

/*
 * The crown of thorns, hung at the head of a section - the one thing Good
 * Friday hangs, in place of December's baubles and Lent's veils.
 *
 * A ring with the thorns struck outward at intervals, so it reads as plaited
 * rather than as a wheel.
 */
export function Thorns({
  drop,
  className,
  style,
}: {
  drop: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox={`0 0 28 ${drop + 30}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d={`M14 0v${drop}`} className="opacity-45" />
      <circle cx="14" cy={drop + 13} r="11" />
      <circle cx="14" cy={drop + 13} r="7.5" className="opacity-50" />
      <path
        d={`M14 ${drop + 2}v-4M23 ${drop + 7}l4-2M25 ${drop + 15}l4 1M21 ${drop + 21}l3 4M14 ${drop + 24}v4M7 ${drop + 21}l-3 4M3 ${drop + 15}l-4 1M5 ${drop + 7}l-4-2`}
      />
    </svg>
  );
}

/** Where Good Friday's crosses stand, and where its crowns hang. */
const CALVARIES = [
  { left: 17, height: 54, hide: false },
  { left: 50, height: 62, hide: true },
  { left: 84, height: 50, hide: false },
] as const;

const THORNS = [
  { left: 33, drop: 26, hide: true },
  { left: 68, drop: 34, hide: false },
] as const;

/*
 * There was a figure of the Risen Christ here, and it has been taken out.
 *
 * It was attempted three times - line art, then a filled silhouette in three
 * pieces, then a single continuous outline with a neck and sloping shoulders -
 * and every version read as something other than a person: a totem, then a bell
 * with sticks attached, then a blank hooded shape. The last was geometrically
 * correct, symmetric to the unit and properly closed, and it still did not work.
 *
 * The reason is scale, not craft. A human figure is the shape people read most
 * precisely and judge most harshly, and a face is not available here - it
 * caricatures at ninety pixels, and this tradition shows Christ as a sign
 * rather than as a portrait. Without one there is not enough left for the eye to
 * accept a person, and what it cannot accept as a person it reads as an object.
 * Each additional detail made it worse rather than better, which is the signal
 * that the premise was wrong rather than the drawing.
 *
 * So the season is carried by the emblems the church already uses for it, all
 * legible at this size precisely because they were always meant to be signs:
 * the lily, the butterfly, and the empty cross. The resurrection is stated by
 * the cross being *empty*, which is how it has been stated in glass and stone
 * for centuries without drawing a body.
 */

/* A butterfly - the oldest emblem of the resurrection there is: the thing that
   comes out of a sealed tomb changed. */
export function Butterfly({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 44 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M22 10v22" />
      <path
        d="M22 12c-4-7-13-10-16-5s2 11 9 12c-5 2-7 7-4 9s8-1 11-7Z"
        className="fill-current/12"
      />
      <path
        d="M22 12c4-7 13-10 16-5s-2 11-9 12c5 2 7 7 4 9s-8-1-11-7Z"
        className="fill-current/12"
      />
      <path d="M22 10l-4-6M22 10l4-6" />
    </svg>
  );
}

/* The empty cross, with a few rays behind it so the emptiness reads as glory
   rather than as absence. */
export function EmptyCross({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 40 96"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <g className="opacity-40" strokeWidth="0.9">
        <path d="M20 8V2M8 18l-4-4M32 18l4-4M4 34H0M36 34h4" />
      </g>
      <path d="M20 92V12" />
      <path d="M6 30h28" />
      <path d="M13 92h14" strokeWidth="1.15" />
    </svg>
  );
}

/*
 * The Easter lily.
 *
 * The first version was a thin stem with a small trumpet and two wisps of leaf,
 * and at forty pixels it read as a weed. This one gives the flower most of the
 * height: a wide six-petal trumpet with its stamens showing, a second bloom
 * opening below it, and leaves with enough body to be leaves.
 */
export function Lily({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 44 108"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M22 104V34" strokeWidth="1.3" />
      <path d="M16 104h12" strokeWidth="1.3" />
      <path
        d="M22 74c-9-2-14-8-15-16 8 1 14 6 15 14M22 62c8-2 13-7 14-14-7 1-12 5-14 12"
        className="fill-current/10"
      />
      <path
        d="M22 34c-12-6-18-14-18-21 8 1 14 5 18 10 4-5 10-9 18-10 0 7-6 15-18 21Z"
        className="fill-current/16"
      />
      <path d="M22 34V13M22 22l-9-8M22 22l9-8" className="opacity-55" />
      <path
        d="M22 13V6M22 10l-4-4M22 10l4-4"
        className="opacity-45"
        strokeWidth="0.9"
      />
      <path d="M22 52l10-6" className="opacity-70" />
      <path
        d="M32 46c-6-3-9-7-9-11 4 1 7 3 9 6 3-3 6-5 10-5 0 4-4 8-10 10Z"
        className="fill-current/14"
      />
    </svg>
  );
}

/*
 * Ash Wednesday's own figures.
 *
 * The day has one image and it is not a landscape: a thumb, a smudge of ash,
 * and a cross drawn on a forehead. So these are the things that are *on the
 * table* at the imposition - the bowl the ashes are in, the palm they were
 * burned from, and the mark itself - rather than another set of trees.
 *
 * They are drawn at the lowest weight of any season's set. The day is the
 * quietest on the calendar that is not Good Friday, and the figures should be
 * noticed a moment after the paper is, not before it.
 */

/* The bowl of ashes, with the ash heaped in it. */
export function AshBowl({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 56 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* The heap, mounded above the rim. */}
      <path
        d="M16 24c3-7 8-10 12-10s9 3 12 10Z"
        className="fill-current/22"
      />
      {/* A few grains catching the light on top of it. */}
      <path d="M24 20l1-2M31 18l1-2M27 16l1-1.5" className="opacity-55" strokeWidth="0.9" />

      {/* The bowl: a shallow dish on a foot. */}
      <path d="M8 24h40a20 20 0 0 1-40 0Z" className="fill-current/12" />
      <path d="M22 40h12M28 38v4" />
    </svg>
  );
}

/*
 * The mark itself - a cross thumbed onto a forehead.
 *
 * Two short strokes, deliberately uneven and slightly rough at the ends,
 * because this one is made with a thumb rather than drawn with a pen. It is the
 * only figure in the whole seasonal set that is meant to look *imperfect*, and
 * the roughness is the entire point of it.
 */
export function AshCross({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 40 44"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      className={className}
      style={style}
    >
      <path d="M20 8.5c.6 6 .8 14 .4 27" strokeWidth="3.4" className="opacity-80" />
      <path d="M9.5 19c7-.8 14-.9 21 .2" strokeWidth="3.1" className="opacity-70" />
      {/* The smudge either side, where the thumb lifted. */}
      <path d="M8 19.5c-.8.2-1.4.5-1.8.9M31 19.6c.9.1 1.6.4 2.1.8" strokeWidth="1.4" className="opacity-40" />
    </svg>
  );
}

/*
 * A palm frond - last year's Palm Sunday branches, which are what the ashes are
 * made of. It is the one figure on this site that belongs to two seasons at
 * once, and the reason the day connects backwards as well as forwards.
 */
export function PalmFrond({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 40 62"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* The spine, from the base line up and curving. */}
      <path d="M20 59c0-16 1-28 4-42" strokeWidth="1.4" />
      <path d="M15 59h10" strokeWidth="1.4" />

      {/* Leaflets, shorter toward the tip, angled with the curve. */}
      <path d="M21 48l-9 5M21 48l8 3M22 40l-9 4M22 40l8 2M23 32l-8 3M23 32l7 2M24 25l-7 3M24 25l6 2M25 19l-5 2M25 19l5 2" />
    </svg>
  );
}

/*
 * The Easter row, along the foot of every section.
 *
 * Linear and alternating: lilies, with the empty cross standing among them and
 * a butterfly at intervals - the way a chancel is dressed for the season, with
 * flowers along the front and the cross among them.
 *
 * Heights vary so it reads as a planting rather than a fence, and `hide` thins
 * the row on a phone, where the full set closes into a hedge.
 */
const EASTER_ROW = [
  { left: 3, kind: "lily", height: 46, hide: true },
  { left: 10, kind: "lily", height: 56, hide: false },
  { left: 17, kind: "cross", height: 72, hide: false },
  { left: 24, kind: "lily", height: 50, hide: true },
  { left: 31, kind: "lily", height: 60, hide: false },
  { left: 38, kind: "butterfly", height: 26, hide: true },
  { left: 45, kind: "lily", height: 52, hide: false },
  { left: 52, kind: "cross", height: 80, hide: false },
  { left: 59, kind: "lily", height: 58, hide: false },
  { left: 66, kind: "lily", height: 44, hide: true },
  { left: 73, kind: "butterfly", height: 24, hide: false },
  { left: 80, kind: "lily", height: 54, hide: false },
  { left: 87, kind: "cross", height: 70, hide: false },
  { left: 94, kind: "lily", height: 48, hide: true },
] as const;

/*
 * A ray of light, falling from the head of the section - Easter's counterpart
 * to December's baubles and Lent's veils.
 *
 * The season's decoration is the light itself, so what falls here is not an
 * object but a shaft of it: a beam that widens as it descends and fades as it
 * goes.
 *
 * Built from a gradient and a `clip-path` rather than an SVG, and that is not
 * a style preference. An SVG beam needs a `linearGradient` with an `id`, and
 * this component renders in *every section on every page* - so the document
 * would carry one duplicated id per ray per section, which is invalid HTML and
 * leaves every ray but the first pointing at somebody else's gradient. Two CSS
 * properties have no identity to collide over.
 */
function Ray({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={className}
      style={{
        ...style,
        backgroundImage:
          "linear-gradient(to bottom, currentColor, transparent 92%)",
        /* Narrow where the light enters, wider where it lands. */
        clipPath: "polygon(34% 0, 66% 0, 100% 100%, 0 100%)",
        opacity: 0.5,
      }}
    />
  );
}

/** Where Easter's light falls from the head of a section. */
const RAYS = [
  { left: 12, drop: 96, width: 26, hide: true },
  { left: 30, drop: 140, width: 34, hide: false },
  { left: 52, drop: 84, width: 22, hide: true },
  { left: 71, drop: 128, width: 30, hide: false },
  { left: 89, drop: 100, width: 24, hide: true },
] as const;

/* A candy cane - a hooked stripe, the one piece of this set that is pure
   childhood rather than liturgy, and the better for being outnumbered. */
export function CandyCane({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 30 76"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      className={className}
      style={style}
    >
      <path d="M11 74V26a9 9 0 0 1 18 0v6" />
      <g className="opacity-45" strokeWidth="1.4">
        <path d="M13 68l6-4M13 58l6-4M13 48l6-4M13 38l6-4M15 30l6-5M23 27l5 3" />
      </g>
    </svg>
  );
}

/* A hand bell, with its clapper. */
export function Bell({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 44 56"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M22 6V2" />
      <circle cx="22" cy="8" r="3" className="fill-current/20" />
      <path
        d="M22 11a14 14 0 0 1 14 14c0 8 2 13 4 16H4c2-3 4-8 4-16A14 14 0 0 1 22 11Z"
        className="fill-current/14"
      />
      <path d="M17 44a5 5 0 0 0 10 0" />
      <path d="M22 44v6" className="opacity-70" />
    </svg>
  );
}

/* A wrapped gift, ribboned and bowed. */
export function Gift({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 52 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M6 18h40v28H6z" className="fill-current/12" />
      <path d="M6 18h40M26 18v28" />
      <path d="M26 18c-8 0-13-3-13-7s6-5 8-2 5 9 5 9ZM26 18c8 0 13-3 13-7s-6-5-8-2-5 9-5 9Z" className="fill-current/18" />
    </svg>
  );
}

/* A wreath on the wall: a ring of greenery with a bow at its foot. */
export function Wreath({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 56 60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <circle cx="28" cy="26" r="19" className="fill-current/[0.07]" />
      <circle cx="28" cy="26" r="13" className="opacity-45" strokeWidth="1" />
      <g className="opacity-55" strokeWidth="1">
        <path d="M28 7v-4M43 15l4-3M43 37l4 3M28 45v4M13 37l-4 3M13 15l-4-3" />
      </g>
      <path d="M22 44c3-4 9-4 12 0M28 44v10M22 54l6-6 6 6" className="opacity-80" />
    </svg>
  );
}

/* A candle in the window - the light a house leaves burning through the dark
   half of the year. */
export function Candle({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 30 72"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path
        d="M15 14c3.5 4.5 5 8 5 11a5 5 0 0 1-10 0c0-3 1.5-6.5 5-11Z"
        className="christmas-flame fill-current/22"
      />
      <path d="M9 30h12v32H9z" className="fill-current/12" />
      <path d="M4 62h22" strokeWidth="1.6" />
      <path d="M7 68c5-3 11-3 16 0" className="opacity-55" />
    </svg>
  );
}

/* A spray of holly: two leaves and three berries. */
export function Holly({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 60 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path
        d="M6 24c7-9 17-12 26-10-4 4-4 7-1 10-6 4-16 5-25 0Z"
        className="fill-current/12"
      />
      <path
        d="M32 38c9-7 12-17 10-26-4 4-7 4-10 1-4 6-5 16 0 25Z"
        className="fill-current/12"
      />
      <circle cx="38" cy="24" r="3" className="fill-current/30" />
      <circle cx="46" cy="28" r="2.6" className="fill-current/30" />
      <circle cx="43" cy="18" r="2.4" className="fill-current/30" />
    </svg>
  );
}

/*
 * Icicles, hanging from the head of the section.
 *
 * One element per spike. The first version of these was a single
 * `repeating-conic-gradient` across the whole head - no markup, very clever,
 * and it rendered as a solid white band, because a 90° wedge struck from the
 * top of a small tile fills nearly all of it. Twenty tiles of that is a line,
 * which is what appeared on the page.
 *
 * A triangle cut with `clip-path` is a shape rather than an inference: it is
 * exactly as wide and as long as it says it is, and a row of them at differing
 * lengths reads as ice because real icicles are never the same length twice.
 * The gradient down each one puts the light at the top, where the ice is
 * thickest, and lets the point go almost clear.
 */
const ICICLES = [
  { left: 3, width: 7, length: 18, hide: true },
  { left: 9, width: 9, length: 30, hide: false },
  { left: 14, width: 6, length: 14, hide: true },
  { left: 21, width: 8, length: 24, hide: false },
  { left: 27, width: 7, length: 36, hide: true },
  { left: 33, width: 6, length: 16, hide: false },
  { left: 39, width: 9, length: 27, hide: true },
  { left: 46, width: 7, length: 20, hide: false },
  { left: 52, width: 8, length: 33, hide: true },
  { left: 58, width: 6, length: 15, hide: false },
  { left: 64, width: 9, length: 25, hide: true },
  { left: 71, width: 7, length: 38, hide: false },
  { left: 77, width: 6, length: 17, hide: true },
  { left: 83, width: 8, length: 28, hide: false },
  { left: 89, width: 7, length: 21, hide: true },
  { left: 96, width: 9, length: 32, hide: false },
] as const;

function Icicles({ onDark }: { onDark: boolean }) {
  return (
    <>
      {ICICLES.map((spike, index) => (
        <span
          key={`ice-${index}`}
          className={cn(
            "absolute top-0 -translate-x-1/2",
            spike.hide && "hidden sm:block",
          )}
          style={{
            left: `${spike.left}%`,
            width: `${spike.width}px`,
            height: `${spike.length}px`,
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            backgroundImage: `linear-gradient(to bottom, ${
              onDark ? "oklch(0.94 0.03 235 / 0.5)" : "oklch(0.99 0.01 235 / 0.95)"
            }, ${
              onDark ? "oklch(0.9 0.04 235 / 0.15)" : "oklch(0.95 0.03 235 / 0.35)"
            })`,
          }}
        />
      ))}
    </>
  );
}

/*
 * A string of lights, swagged across the head of the section.
 *
 * The wire and the bulbs are generated from the *same* quadratic curves, which
 * is the only detail here that matters: four arcs across the width, each
 * sampled at five points for its bulbs. Hand-placing the bulbs against a
 * hand-drawn wire is how you end up with lights floating a few pixels off the
 * string, and at this width nobody would ever get all twenty right.
 *
 * The wire is one stretched SVG with a non-scaling stroke, so it spans any
 * viewport without the line thickening; the bulbs are absolutely positioned
 * elements, so they keep their drawn size and their glow.
 */
const LIGHT_ARCS = 4;
const BULBS_PER_ARC = 5;

/** A point on the swag, as a percentage across and a fraction down the band. */
function bulbAt(arc: number, i: number) {
  const t = (i + 1) / (BULBS_PER_ARC + 1);
  const span = 100 / LIGHT_ARCS;
  const x0 = arc * span;
  const x1 = x0 + span / 2;
  const x2 = x0 + span;
  /*
   * The same control points as the wire below, expressed as fractions of the
   * band: the wire is drawn in a 24-unit view box at y=3 and y=21, and the band
   * is 3.5rem tall. Writing them as the wire's own numbers over 24 - rather
   * than as eyeballed decimals - is what keeps every bulb on the string when
   * either is retuned.
   */
  const y0 = 3 / 24;
  const y1 = 21 / 24;
  const y2 = 3 / 24;

  const u = 1 - t;
  return {
    left: u * u * x0 + 2 * u * t * x1 + t * t * x2,
    top: u * u * y0 + 2 * u * t * y1 + t * t * y2,
  };
}

const BULB_TONES = [
  "text-rose-300",
  "text-amber-200",
  "text-accent-200",
  "text-emerald-200",
] as const;

function StringLights() {
  const bulbs = [];
  for (let arc = 0; arc < LIGHT_ARCS; arc++) {
    for (let i = 0; i < BULBS_PER_ARC; i++) {
      bulbs.push({ ...bulbAt(arc, i), key: `${arc}-${i}` });
    }
  }

  const span = 100 / LIGHT_ARCS;
  const wire = Array.from({ length: LIGHT_ARCS }, (_, arc) => {
    const x0 = arc * span;
    return `M${x0} 3Q${x0 + span / 2} 21 ${x0 + span} 3`;
  }).join("");

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-14">
      <svg
        viewBox="0 0 100 24"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        fill="none"
      >
        {/* `vector-effect` keeps the wire a hairline however far it is
            stretched - without it, a swag across a wide monitor draws as a
            rope. */}
        <path
          d={wire}
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          className="opacity-40"
        />
      </svg>

      {bulbs.map((bulb, index) => (
        <span
          key={bulb.key}
          className={cn(
            // Centred on its point in both axes: positioned by the top-left
            // corner, a 7px bulb hangs three and a half pixels below the wire.
            "christmas-bulb absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full",
            BULB_TONES[index % BULB_TONES.length],
          )}
          style={{
            left: `${bulb.left}%`,
            top: `calc(${bulb.top} * 3.5rem)`,
            animationDelay: `${(index % 7) * 0.45}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * The treeline. Fourteen firs across the foot of the section at four heights,
 * spaced unevenly on purpose: an even row at one height is a fence, and the
 * variation is what makes it read as a stand of trees in snow.
 *
 * `hide` thins the row to seven on a phone, where the full set would be a solid
 * band of green rather than a treeline.
 */
const TREELINE = [
  { left: 2, kind: "tree", height: 52, hide: false },
  { left: 7, kind: "gift", height: 24, hide: true },
  { left: 11, kind: "tree", height: 36, hide: true },
  { left: 16, kind: "candle", height: 40, hide: false },
  { left: 21, kind: "tree", height: 62, hide: false },
  { left: 26, kind: "cane", height: 34, hide: true },
  { left: 30, kind: "tree", height: 42, hide: true },
  { left: 35, kind: "holly", height: 22, hide: false },
  { left: 40, kind: "tree", height: 56, hide: false },
  { left: 45, kind: "gift", height: 20, hide: true },
  { left: 49, kind: "wreath", height: 34, hide: false },
  { left: 54, kind: "tree", height: 40, hide: true },
  { left: 59, kind: "tree", height: 60, hide: false },
  { left: 64, kind: "cane", height: 30, hide: true },
  { left: 68, kind: "bell", height: 30, hide: false },
  { left: 73, kind: "tree", height: 46, hide: true },
  { left: 78, kind: "tree", height: 62, hide: false },
  { left: 83, kind: "gift", height: 22, hide: true },
  { left: 87, kind: "holly", height: 20, hide: false },
  { left: 92, kind: "tree", height: 38, hide: true },
  { left: 97, kind: "tree", height: 54, hide: false },
] as const;

/*
 * Falling ash, hung from the head of the section.
 *
 * Ash Wednesday's counterpart to December's baubles, Lent's veils, Good
 * Friday's crown and Easter's light - and the only one of the five that is not
 * an object. Nothing is hung on this day; something falls.
 *
 * A thread that fades in from the top edge and ends in a speck, with a second
 * and third speck adrift beside it. The line is thinner and fainter than the
 * threads of the other seasons because it is not holding anything up: it is the
 * path something took on the way down. *To dust you shall return* is the
 * sentence of the day, and this is the only figure that says it without words.
 */
export function AshFall({
  drop,
  className,
  style,
}: {
  drop: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox={`0 0 16 ${drop + 16}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.9"
      strokeLinecap="round"
      className={className}
      style={style}
    >
      <path d={`M8 0v${drop}`} className="opacity-30" />
      <circle cx="8" cy={drop + 3} r="1.5" className="fill-current/45 stroke-none" />
      <circle cx="4" cy={drop + 8} r="1" className="fill-current/30 stroke-none" />
      <circle cx="11.5" cy={drop + 12} r="0.8" className="fill-current/22 stroke-none" />
    </svg>
  );
}

/*
 * A heap of ash on the ground: a low mound with the grain of it showing.
 *
 * Flatter and wider than Lent's stones, because ash settles where a stone sits.
 * It is what is left of the palms, and the reason the fronds beside it are
 * drawn dry.
 */
export function AshHeap({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 34 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M2 13c1-6 6-9 15-9s14 3 15 9z" className="fill-current/14" />
      <path d="M10 9l2-2M17 7l2-2M23 9l2-2" className="opacity-45" strokeWidth="0.8" />
    </svg>
  );
}

/*
 * Ash Wednesday's row: the table at the imposition rather than a landscape.
 *
 * Sparser than Lent's, which is itself sparser than December's - the fast opens
 * on this day, and the page should be at its emptiest before the six weeks that
 * follow gradually strip it further.
 */
const ASH_ROW = [
  { left: 3, kind: "heap", height: 11, hide: true },
  { left: 9, kind: "frond", height: 48, hide: false },
  { left: 16, kind: "cross", height: 32, hide: true },
  { left: 22, kind: "bowl", height: 28, hide: false },
  { left: 29, kind: "heap", height: 9, hide: true },
  { left: 35, kind: "frond", height: 40, hide: false },
  { left: 42, kind: "cross", height: 38, hide: true },
  { left: 50, kind: "bowl", height: 32, hide: false },
  { left: 57, kind: "heap", height: 12, hide: true },
  { left: 64, kind: "frond", height: 52, hide: false },
  { left: 71, kind: "cross", height: 30, hide: true },
  { left: 78, kind: "bowl", height: 26, hide: false },
  { left: 85, kind: "heap", height: 10, hide: true },
  { left: 91, kind: "frond", height: 44, hide: false },
  { left: 97, kind: "cross", height: 34, hide: true },
] as const;

/** Ash falling from the head of the section, at these depths. */
const ASH_FALL = [
  { left: 7, drop: 30, hide: true },
  { left: 19, drop: 58, hide: false },
  { left: 31, drop: 22, hide: true },
  { left: 44, drop: 44, hide: false },
  { left: 56, drop: 68, hide: true },
  { left: 68, drop: 26, hide: false },
  { left: 81, drop: 50, hide: true },
  { left: 93, drop: 36, hide: false },
] as const;

/** What hangs from the head of the section, and how far down. */
const HANGING = [
  { left: 6, drop: 26, kind: "bauble", hide: true },
  { left: 17, drop: 52, kind: "star", hide: false },
  { left: 29, drop: 18, kind: "bauble", hide: true },
  { left: 43, drop: 44, kind: "bauble", hide: false },
  { left: 57, drop: 24, kind: "star", hide: true },
  { left: 71, drop: 58, kind: "bauble", hide: false },
  { left: 84, drop: 22, kind: "star", hide: true },
  { left: 94, drop: 40, kind: "bauble", hide: false },
] as const;

export interface SectionOrnamentsProps {
  /** Ink grounds need the light tones; parchment needs the saturated ones. */
  onDark?: boolean;
}

export function SectionOrnaments({ onDark = false }: SectionOrnamentsProps) {
  const season = useLiturgicalSeason();
  const id = useId();

  const christmas = isSnowSeason(season);
  const lent = isLentSeason(season);
  const goodFriday = season === "good-friday";
  const ashWednesday = season === "ash-wednesday";
  const easter = season === "easter";

  if (!christmas && !lent && !goodFriday && !easter && !ashWednesday)
    return null;

  /*
   * The row is shifted along by a few positions per section, from the id React
   * already gave this instance. Identical rows down a page read as wallpaper -
   * the eye finds the repeat instead of the trees - and a shift is enough to
   * break that without needing a second drawing. Stable per section, so nothing
   * moves about between renders.
   */
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
  const shift = (hash % 5) * 1.7;

  /*
   * Red at low strength on snow-white paper; the pale step at rather more on
   * ink. The same value on both grounds would be invisible on one of them.
   */
  /*
   * Lent is quieter than Christmas by a wide margin, and that gap is the season
   * doing its work: the same figures at the same size, drawn at roughly half
   * the strength, on paper that has itself gone ashen. It should be noticed
   * only once the reader stops to look.
   */
  const tone = christmas
    ? onDark
      ? "text-accent-200/40"
      : "text-accent-600/25"
    : lent || ashWednesday
      ? onDark
        ? "text-accent-200/25"
        : "text-accent-700/15"
      : easter
        ? /* The brightest of the four, because this is the season of light. */
          onDark
          ? "text-accent-200/55"
          : "text-accent-500/40"
        : /*
           * Good Friday. Named in white and black rather than through the accent
           * scale - the season's palette has already drained every scale to a
           * neutral, so this would come out grey either way, but saying it in
           * plain monochrome means the one day the site has no colour does not
           * depend on a token to stay that way.
           */
          onDark
          ? "text-white/25"
          : "text-black/20";

  return (
    <div
      aria-hidden
      /* `data-season-ornaments` is the hook the season blocks in `globals.css`
         use to light this layer; it carries no styling of its own. */
      data-season-ornaments=""
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 select-none overflow-hidden",
        tone,
      )}
    >
      {/* Ice on the eaves, then the lights below it - Christmas only. */}
      {christmas ? <Icicles onDark={onDark} /> : null}
      {christmas ? <StringLights /> : null}

      {/*
        Hung from the head of the section - Christmas only. Lent hangs nothing:
        an ornament on a thread is a thing being celebrated, and this is the
        season of taking them down.
      */}
      {christmas &&
        HANGING.map((item, index) => {
        const Hung = item.kind === "star" ? HangingStar : Bauble;

        return (
          <Hung
            key={`hang-${index}`}
            drop={item.drop}
            className={cn(
              "absolute top-0 w-4 -translate-x-1/2 sm:w-5",
              item.hide && "hidden sm:block",
            )}
            style={{ left: `${(item.left + shift) % 100}%` }}
            />
          );
        })}

      {/* Light falling from the head, through Eastertide. */}
      {easter &&
        RAYS.map((ray, index) => (
          <Ray
            key={`ray-${index}`}
            className={cn(
              "absolute top-0 -translate-x-1/2",
              ray.hide && "hidden sm:block",
            )}
            style={{
              left: `${(ray.left + shift) % 100}%`,
              width: `${ray.width}px`,
              height: `${ray.drop}px`,
            }}
          />
        ))}

      {/* The Easter row: lilies, with empty crosses and butterflies among them. */}
      {easter &&
        EASTER_ROW.map((item, index) => {
          const Standing =
            item.kind === "cross"
              ? EmptyCross
              : item.kind === "butterfly"
                ? Butterfly
                : Lily;

          return (
            <Standing
              key={`easter-${index}`}
              className={cn(
                "absolute bottom-0 w-auto -translate-x-1/2",
                item.hide && "hidden sm:block",
              )}
              style={{
                left: `${(item.left + shift) % 100}%`,
                height: `${item.height}px`,
              }}
            />
          );
        })}

      {/* The crown of thorns - the only thing Good Friday hangs. */}
      {goodFriday &&
        THORNS.map((item, index) => (
          <Thorns
            key={`thorn-${index}`}
            drop={item.drop}
            className={cn(
              "absolute top-0 w-6 -translate-x-1/2 sm:w-7",
              item.hide && "hidden sm:block",
            )}
            style={{ left: `${(item.left + shift) % 100}%` }}
          />
        ))}

      {/* Calvary, along the foot - three crosses, three times across the
          section, and nothing else standing. */}
      {goodFriday &&
        CALVARIES.map((item, index) => (
          <Calvary
            key={`calvary-${index}`}
            className={cn(
              "absolute bottom-0 w-auto -translate-x-1/2",
              item.hide && "hidden sm:block",
            )}
            style={{
              left: `${(item.left + shift) % 100}%`,
              height: `${item.height}px`,
            }}
          />
        ))}

      {/* Ash falling from the head - Ash Wednesday only. Nothing is hung on
          this day; something falls. */}
      {ashWednesday &&
        ASH_FALL.map((item, index) => (
          <AshFall
            key={`ashfall-${index}`}
            drop={item.drop}
            className={cn(
              "absolute top-0 w-3 -translate-x-1/2 sm:w-4",
              item.hide && "hidden sm:block",
            )}
            style={{ left: `${(item.left + shift) % 100}%` }}
          />
        ))}

      {/* The imposition table - Ash Wednesday only. */}
      {ashWednesday &&
        ASH_ROW.map((item, index) => {
          const Standing =
            item.kind === "bowl"
              ? AshBowl
              : item.kind === "cross"
                ? AshCross
                : item.kind === "heap"
                  ? AshHeap
                  : PalmFrond;

          return (
            <Standing
              key={`ash-${index}`}
              className={cn(
                "absolute bottom-0 w-auto -translate-x-1/2",
                item.hide && "hidden sm:block",
              )}
              style={{
                left: `${(item.left + shift) % 100}%`,
                height: `${item.height}px`,
              }}
            />
          );
        })}

      {/* Veils at the head, through Lent and Holy Week - not Ash Wednesday,
          which has its own row above. */}
      {lent &&
        LENT_HANGING.map((item, index) => (
          <Veil
            key={`veil-${index}`}
            drop={item.drop}
            className={cn(
              "absolute top-0 w-4 -translate-x-1/2 sm:w-5",
              item.hide && "hidden sm:block",
            )}
            style={{ left: `${(item.left + shift) % 100}%` }}
          />
        ))}

      {/* Stones on the ground, through Lent and Holy Week. */}
      {lent &&
        LENT_STONES.map((stone, index) => (
          <Stone
            key={`stone-${index}`}
            className={cn(
              "absolute bottom-0 -translate-x-1/2",
              stone.hide && "hidden sm:block",
            )}
            style={{
              left: `${(stone.left + shift) % 100}%`,
              width: `${stone.width}px`,
            }}
          />
        ))}

      {/*
        Standing along the foot: firs in December, the same trees stripped bare
        in Lent. Lent also thins the row - every other one is dropped at every
        width, so the wilderness has space in it.
      */}
      {(christmas || lent) &&
        TREELINE.map((tree, index) => {
        const Standing = !christmas
          ? BareTree
          : tree.kind === "gift"
            ? Gift
            : tree.kind === "cane"
              ? CandyCane
              : tree.kind === "bell"
                ? Bell
                : tree.kind === "wreath"
                  ? Wreath
                  : tree.kind === "candle"
                    ? Candle
                    : tree.kind === "holly"
                      ? Holly
                      : Tree;

        if (lent && index % 2 === 1) return null;

        return (
        <Standing
          key={`tree-${index}`}
          className={cn(
            "absolute bottom-0 w-auto -translate-x-1/2",
            tree.hide && "hidden sm:block",
          )}
          style={{
            left: `${(tree.left + shift) % 100}%`,
            height: `${tree.height}px`,
          }}
        />
        );
      })}
    </div>
  );
}
