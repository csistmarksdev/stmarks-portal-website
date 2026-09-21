"use client";

import { useLiturgicalSeason } from "@/components/common/liturgical-season";
import { isSnowSeason } from "@/lib/liturgical-year";

/**
 * The ambient layer for Christmas: bokeh, and a star that crosses now and then.
 *
 * Everything the season has so far is *in* the page - lights on the sections,
 * snow on the cards, frost at the corners. This is the air of the room: lights
 * far enough out of focus to have no edges, and once in a while something
 * crossing the sky above the hero.
 *
 * ## Why it sits behind the page and not over it
 *
 * `fixed inset-0` with a negative z-index. Body carries the site's background
 * colour, which the browser propagates to the canvas, so a negative layer here
 * paints *above* that canvas and *below* every piece of content - the same
 * mechanism the frost at the four corners uses. Nothing on this layer can ever
 * come between the reader and a word, at any scroll position.
 *
 * ## Why the orbs have no edges
 *
 * A bokeh light is a lens failing to resolve a point source, so it is a soft
 * disc with a slightly brighter rim and no outline whatever. These are radial
 * gradients rather than blurred circles: a real `filter: blur()` at this radius
 * is one of the most expensive things a compositor can be asked for, repeated
 * twelve times over a scrolling page, and a two-stop gradient is free and
 * indistinguishable.
 *
 * Every animation is `transform` and `opacity` only, all of it very slow, and
 * the blanket reduced-motion rule in `globals.css` stills the lot - leaving the
 * lights simply hanging there, which is what out-of-focus lights do anyway.
 */

/** left/top as viewport percentages; size in px; the drift period in seconds. */
const BOKEH = [
  { left: 8, top: 18, size: 190, tone: "rose", period: 38, delay: -4 },
  { left: 26, top: 62, size: 120, tone: "amber", period: 46, delay: -19 },
  { left: 41, top: 12, size: 240, tone: "frost", period: 52, delay: -31 },
  { left: 58, top: 74, size: 150, tone: "rose", period: 41, delay: -11 },
  { left: 72, top: 28, size: 200, tone: "amber", period: 49, delay: -25 },
  { left: 88, top: 58, size: 130, tone: "frost", period: 36, delay: -7 },
  { left: 16, top: 86, size: 160, tone: "amber", period: 44, delay: -16 },
  { left: 66, top: 92, size: 110, tone: "rose", period: 39, delay: -28 },
  { left: 94, top: 8, size: 170, tone: "frost", period: 55, delay: -2 },
] as const;

const BOKEH_TONE = {
  rose: "oklch(0.712 0.158 22 / 0.5)",
  amber: "oklch(0.842 0.12 86 / 0.45)",
  frost: "oklch(0.9 0.05 235 / 0.4)",
} as const;

export function ChristmasEffects() {
  const season = useLiturgicalSeason();

  if (!isSnowSeason(season)) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden"
    >
      {BOKEH.map((orb, index) => (
        <span
          key={index}
          className="christmas-bokeh absolute rounded-full"
          style={{
            left: `${orb.left}%`,
            top: `${orb.top}%`,
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            marginLeft: `${-orb.size / 2}px`,
            marginTop: `${-orb.size / 2}px`,
            animationDuration: `${orb.period}s`,
            animationDelay: `${orb.delay}s`,
            /*
             * Two stops and a hole: brighter just inside the rim, fading to
             * nothing at the edge. That inner ring is what makes a soft disc
             * read as a light out of focus rather than as a smudge.
             */
            backgroundImage: `radial-gradient(circle at 50% 50%, ${BOKEH_TONE[orb.tone]} 0%, ${BOKEH_TONE[orb.tone]} 42%, transparent 68%)`,
          }}
        />
      ))}

      {/*
        A star, crossing.

        It is visible for about two seconds in every twenty - long enough to be
        seen if you happen to be looking up, short enough that it is never the
        thing you are waiting for. Christmas is the one season on this site that
        can carry it without comment.
      */}
      <span className="christmas-star absolute left-[12%] top-[14%]" />
    </div>
  );
}
