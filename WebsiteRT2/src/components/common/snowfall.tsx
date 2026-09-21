"use client";

import { useLiturgicalSeason } from "@/components/common/liturgical-season";
import { isSnowSeason } from "@/lib/liturgical-year";

/**
 * Snowfall, through Advent and Christmastide.
 *
 * A parish keeps its seasons, and this is the one the whole congregation feels
 * coming. From Advent Sunday to the eve of Epiphany the site carries a quiet
 * fall of snow over every page; on the 6th of January it is simply not there,
 * with nobody having to remember to take it down.
 *
 * Keyed to the church's year rather than to the month, so it covers the whole
 * of December and begins where the church's own year begins - see
 * `lib/liturgical-year.ts`. Snow that started on the 1st and ignored Advent, or
 * stopped on Christmas night with eleven days of Christmastide still to run,
 * would be a decoration borrowed from a shopping calendar and dropped onto a
 * site that keeps a liturgical one.
 *
 * Three decisions worth stating, because each of them is the difference between
 * seasonal warmth and a novelty plugin:
 *
 * It is *sparse*. Twenty-eight flakes, most of them under three pixels, drifting
 * at between nine and twenty-two seconds a screen. Snow read as atmosphere is
 * snow you notice on the second glance; snow read as an effect is snow that
 * arrives before the words do.
 *
 * It is *behind everything that matters*. `z-30` puts it over the page and
 * under the masthead, the menus and the dialogs, and `pointer-events-none`
 * means nothing on the page becomes harder to press because of it. It is also
 * `aria-hidden`, because there is nothing here to read.
 *
 * It is *cheap*. Every flake is one element animating `transform` and `opacity`
 * and nothing else, which the compositor runs without touching the main thread.
 * The blur on the near flakes is a static `filter` on a promoted layer, painted
 * once, not per frame.
 */

/**
 * The fall.
 *
 * Authored rather than generated. A random scatter clusters and leaves bald
 * patches - that is what randomness does - and it also means the composition
 * changes on every mount, so there is no version of it to look at and correct.
 * These twenty-eight are spaced across the width by hand, with the near, larger,
 * faster flakes deliberately outnumbered by distant ones.
 *
 * `left` is a percentage of the viewport; `size` in pixels; `duration` the time
 * to cross the screen; `delay` is negative so the fall is already in progress on
 * the first frame rather than starting empty at the top; `drift` is how far the
 * flake sways sideways on its way down.
 */
type Flake = {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
};

const FLAKES: Flake[] = [
  { left: 2, size: 2, duration: 19, delay: -2, drift: 14, opacity: 0.5 },
  { left: 7, size: 4, duration: 13, delay: -9, drift: -22, opacity: 0.72 },
  { left: 11, size: 2, duration: 21, delay: -14, drift: 10, opacity: 0.42 },
  { left: 16, size: 3, duration: 16, delay: -5, drift: 18, opacity: 0.6 },
  { left: 21, size: 2, duration: 22, delay: -18, drift: -12, opacity: 0.38 },
  { left: 25, size: 5, duration: 11, delay: -1, drift: 26, opacity: 0.78 },
  { left: 29, size: 2, duration: 20, delay: -11, drift: -16, opacity: 0.45 },
  { left: 34, size: 3, duration: 15, delay: -7, drift: 20, opacity: 0.58 },
  { left: 38, size: 2, duration: 18, delay: -16, drift: 12, opacity: 0.4 },
  { left: 43, size: 4, duration: 12, delay: -4, drift: -24, opacity: 0.7 },
  { left: 47, size: 2, duration: 21, delay: -13, drift: 15, opacity: 0.44 },
  { left: 51, size: 3, duration: 17, delay: -8, drift: -18, opacity: 0.56 },
  { left: 55, size: 2, duration: 19, delay: -3, drift: 11, opacity: 0.4 },
  { left: 59, size: 5, duration: 10, delay: -6, drift: 28, opacity: 0.8 },
  { left: 63, size: 2, duration: 22, delay: -17, drift: -13, opacity: 0.38 },
  { left: 67, size: 3, duration: 14, delay: -2, drift: 19, opacity: 0.6 },
  { left: 71, size: 2, duration: 20, delay: -12, drift: -15, opacity: 0.43 },
  { left: 75, size: 4, duration: 13, delay: -9, drift: 23, opacity: 0.72 },
  { left: 79, size: 2, duration: 18, delay: -5, drift: -10, opacity: 0.41 },
  { left: 83, size: 3, duration: 16, delay: -15, drift: 17, opacity: 0.57 },
  { left: 87, size: 2, duration: 21, delay: -10, drift: -14, opacity: 0.39 },
  { left: 91, size: 4, duration: 12, delay: -7, drift: 25, opacity: 0.68 },
  { left: 94, size: 2, duration: 19, delay: -19, drift: 13, opacity: 0.42 },
  { left: 97, size: 3, duration: 15, delay: -4, drift: -20, opacity: 0.55 },
  { left: 13, size: 6, duration: 9, delay: -11, drift: 30, opacity: 0.62 },
  { left: 45, size: 6, duration: 10, delay: -3, drift: -27, opacity: 0.58 },
  { left: 73, size: 6, duration: 9, delay: -16, drift: 24, opacity: 0.6 },
  { left: 88, size: 6, duration: 11, delay: -8, drift: -21, opacity: 0.55 },
];

/**
 * How many flakes survive on a small screen.
 *
 * A phone is a fifth of the width of a desktop and the same number of flakes
 * across it is a snowstorm - plus it is the device most likely to be doing this
 * on a budget GPU while it scrolls. The first sixteen are spread across the full
 * width by construction, so taking the tail is a thinning, not a crop.
 */
const MOBILE_FLAKES = 16;

/**
 * Whether the snow falls, decided once per page load.
 *
 * The season answers "is it Advent or Christmastide"; this answers the two
 * questions the season cannot: has the reader asked for less motion, and has
 * anyone asked to preview it out of season.
 *
 * Cached in a module-level slot because the result is read during render -
 * recomputing it would hand React a new answer every pass.
 */
let override: boolean | null | undefined;

function snowOverride(): boolean | null {
  if (override !== undefined) return override;

  /*
   * A reader who has asked for less motion has asked for this in particular,
   * and it outranks the preview switch - a permanent fall of thirty moving
   * specks is exactly what that preference exists to prevent.
   *
   * There is no still version worth showing either: snow that does not fall is
   * a scatter of dots over the church's photography. So it simply does not
   * appear. The blanket reduced-motion rule in `globals.css` would freeze the
   * animation mid-descent and leave those dots hanging there, which is why the
   * decision is taken here rather than left to CSS.
   */
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    override = false;
    return override;
  }

  /*
   * The preview switch - `?snow` on any page, in any season.
   *
   *   ?snow          the fall, now
   *   ?snow=1        …the same; `on` and `true` also work
   *   ?snow=0        Advent, without it - `off` and `false` also work
   *
   * Without this the only way to look at the thing is to wind the clock on the
   * machine forward or wait for Advent, which means a seasonal feature is first
   * seen by the congregation rather than by the person responsible for it. The
   * off switch matters just as much: in December it is the only way to check a
   * page *without* snow over it - to photograph the hero, say, or to rule the
   * snow out when something else on the page looks wrong.
   *
   * A query parameter and nothing else. No cookie, no stored preference, no
   * build flag: it lives exactly as long as the URL that carries it, so there
   * is no state anywhere that can leave the site quietly snowing in June.
   *
   * `null` means "no opinion" - fall through to the season.
   */
  const flag = new URLSearchParams(window.location.search).get("snow");

  override =
    flag === null
      ? null
      : !["0", "off", "false", "no"].includes(flag.toLowerCase());

  return override;
}

export function Snowfall() {
  /*
   * The season is `"ordinary"` on the server and on the first client render -
   * see `liturgical-season.tsx` - so this renders nothing until the real season
   * arrives a pass later. That is the correct order of importance: the page
   * arrives complete, and the snow starts after it.
   */
  const season = useLiturgicalSeason();
  const asked = typeof window === "undefined" ? null : snowOverride();
  const falling = asked ?? isSnowSeason(season);

  if (!falling) return null;

  return (
    <div aria-hidden className="snowfall">
      {FLAKES.map((flake, index) => (
        <span
          key={index}
          className={index >= MOBILE_FLAKES ? "snowflake sm-only" : "snowflake"}
          style={
            {
              left: `${flake.left}%`,
              width: `${flake.size}px`,
              height: `${flake.size}px`,
              opacity: flake.opacity,
              filter: flake.size >= 5 ? "blur(1px)" : undefined,
              "--fall-duration": `${flake.duration}s`,
              "--fall-delay": `${flake.delay}s`,
              "--drift": `${flake.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
