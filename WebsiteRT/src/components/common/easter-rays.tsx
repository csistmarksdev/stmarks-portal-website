"use client";

import { useLiturgicalSeason } from "@/components/common/liturgical-season";

/**
 * Light through the window, over the hero of every page.
 *
 * Shafts struck down across the opening photograph at an angle, the way morning
 * sun comes through a clerestory and lands on the far wall of a nave. Seven of
 * them at four widths, none quite parallel to its neighbour, drifting very
 * slowly.
 *
 * ## Why it sits at the top of the document
 *
 * The same reasoning as the Christmas garland: every page here opens on a
 * full-height dark photograph - the cinematic hero at home, the `PageHero`
 * everywhere else - so a layer pinned to the top of the document is always over
 * ink, which is the only ground light shafts read on at all. It is `absolute`
 * rather than `fixed`, so it scrolls away with the hero it belongs to instead
 * of hanging over the parchment sections below.
 *
 * It also means neither hero component had to be touched. This is a decorative
 * layer that knows about the season; the heroes stay exactly what they were.
 *
 * ## Why it is legible without being bright
 *
 * `mix-blend-mode: screen` means each shaft can only ever *add* light to what
 * is behind it - it cannot darken a face or wash out a detail. Over the deep
 * ground of a hero photograph that reads as a real beam; over anything already
 * bright it does almost nothing, which is exactly how light behaves.
 *
 * The drift is thirty seconds a cycle, which is slow enough that it is felt
 * rather than watched. The blanket reduced-motion rule at the foot of
 * `globals.css` stills it, and the shafts simply hold their position.
 */

/** left %, width, tilt, opacity, drift period, phase. */
const SHAFTS = [
  { left: 6, width: 90, tilt: 14, opacity: 0.18, period: 34, delay: -4 },
  { left: 17, width: 44, tilt: 16, opacity: 0.3, period: 27, delay: -12 },
  { left: 29, width: 150, tilt: 13, opacity: 0.14, period: 41, delay: -20 },
  { left: 46, width: 60, tilt: 17, opacity: 0.26, period: 31, delay: -8 },
  { left: 61, width: 110, tilt: 12, opacity: 0.17, period: 37, delay: -25 },
  { left: 74, width: 40, tilt: 18, opacity: 0.32, period: 24, delay: -15 },
  { left: 88, width: 120, tilt: 15, opacity: 0.15, period: 44, delay: -2 },
] as const;

export function EasterRays() {
  const season = useLiturgicalSeason();

  if (season !== "easter") return null;

  return (
    <div
      aria-hidden
      /*
       * `z-30`: over the hero's photography and its scrims, under the masthead
       * at `z-50`. Taller than the hero it lights, so the shafts run off the
       * bottom of the picture rather than stopping in mid-air on a short
       * viewport.
       */
      className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[112svh] select-none overflow-hidden"
    >
      {/* The source: a wide bloom where the light enters, so the shafts have
          somewhere to have come from. */}
      <div
        className="absolute inset-x-0 top-0 h-1/2 mix-blend-screen"
        style={{
          backgroundImage:
            "radial-gradient(72% 62% at 62% -10%, oklch(0.93 0.1 90 / 0.5), transparent 70%)",
        }}
      />

      {SHAFTS.map((shaft, index) => (
        <span
          key={index}
          className="easter-shaft absolute -top-1/4 h-[150%] origin-top mix-blend-screen"
          style={{
            left: `${shaft.left}%`,
            width: `${shaft.width}px`,
            opacity: shaft.opacity,
            transform: `rotate(${shaft.tilt}deg)`,
            animationDuration: `${shaft.period}s`,
            animationDelay: `${shaft.delay}s`,
            backgroundImage:
              "linear-gradient(to bottom, oklch(0.95 0.06 90 / 0.9), oklch(0.9 0.09 88 / 0.35) 45%, transparent 88%)",
            /* Soft edges: a shaft with hard sides is a stripe, not light. */
            maskImage:
              "linear-gradient(to right, transparent, black 22%, black 78%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 22%, black 78%, transparent)",
          }}
        />
      ))}
    </div>
  );
}
