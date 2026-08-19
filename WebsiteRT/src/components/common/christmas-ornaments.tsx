"use client";

import { useLiturgicalSeason } from "@/components/common/liturgical-season";
import { isSnowSeason } from "@/lib/liturgical-year";

/**
 * The garland - Christmas across the whole site, not only at the foot of it.
 *
 * Ornaments hung on threads from the top edge of every page - the decoration a
 * parish actually puts up first, because you hang things from the top of the
 * room.
 *
 * There were sprays of fir in the two upper corners as well, drawn as sweeping
 * boughs with needles struck along them. At the size they rendered, they read
 * as scribble: the eye wants a silhouette it can name before it will accept
 * detail. They are gone, and what is left is a set of shapes that are legible
 * at 20 pixels - a round bauble, a five-pointed star, a bell, a six-armed
 * flake. The greenery belongs where it can be drawn large enough to be
 * greenery: the treeline in every section, and the frieze at the foot.
 *
 * ## Why the top of the *document* and not the viewport
 *
 * It is `absolute`, so it scrolls away with the page rather than following the
 * reader down it. That is not timidity, it is the only placement that works
 * here: every page on this site opens on a full-height dark photograph - the
 * cinematic hero at home, the `PageHero` everywhere else - so ornaments hung at
 * the top of the document are always over ink, where silver and frost read
 * beautifully. Fixed to the viewport, the same ornaments would drift over the
 * parchment sections below and vanish, and hang in front of whatever the reader
 * was actually trying to read.
 *
 * ## Why HTML and not one big SVG
 *
 * Each ornament is a small fixed-size SVG positioned by percentage, and the
 * threads are one-pixel divs. A single wide SVG has to choose between
 * distorting its baubles (`preserveAspectRatio: none`) and cropping its own
 * contents at some viewport width (`slice`); laid out this way there is no
 * scaling arithmetic to get wrong, and the ornaments keep their exact drawn
 * size from a 320px phone to an ultrawide monitor while their spacing flexes.
 *
 * Purely decorative: `aria-hidden`, no focus stop, nothing to read. Beneath the
 * masthead's stacking level, so it can never come between the reader and the
 * navigation, and `pointer-events-none`, so it can never come between them and
 * anything else.
 */

/** A bauble, a star, a bell, a lantern - hung at these depths and positions. */
const HANGING = [
  { left: 7, drop: 84, kind: "star", tone: "gold", hide: false },
  { left: 15, drop: 52, kind: "bauble", tone: "frost", hide: true },
  { left: 23, drop: 108, kind: "bauble", tone: "red", hide: false },
  { left: 31, drop: 64, kind: "flake", tone: "frost", hide: true },
  { left: 44, drop: 96, kind: "bell", tone: "gold", hide: true },
  { left: 56, drop: 58, kind: "bauble", tone: "frost", hide: false },
  { left: 67, drop: 116, kind: "star", tone: "frost", hide: true },
  { left: 76, drop: 72, kind: "bauble", tone: "red", hide: false },
  { left: 85, drop: 44, kind: "flake", tone: "gold", hide: true },
  { left: 93, drop: 92, kind: "bauble", tone: "frost", hide: false },
] as const;

const TONE = {
  frost: "text-accent-200/70",
  gold: "text-amber-200/70",
  red: "text-rose-300/70",
} as const;

function Ornament({ kind }: { kind: (typeof HANGING)[number]["kind"] }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "size-5 sm:size-6",
  };

  if (kind === "bauble") {
    return (
      <svg {...common}>
        {/* cap and ring, then the globe, then two bands of tinsel round it */}
        <path d="M10.5 4.5h3v2h-3z" />
        <path d="M12 2.5v2" />
        <circle cx="12" cy="14" r="7.5" className="fill-current/10" />
        <path d="M4.9 11.5c4.6 1.6 9.6 1.6 14.2 0M6.6 18.2c3.4-1.5 7.4-1.5 10.8 0" />
      </svg>
    );
  }

  if (kind === "star") {
    return (
      <svg {...common}>
        <path
          d="M12 3l2.3 6.2L20.5 11l-6.2 1.8L12 19l-2.3-6.2L3.5 11l6.2-1.8z"
          className="fill-current/15"
        />
      </svg>
    );
  }

  if (kind === "bell") {
    return (
      <svg {...common}>
        <path d="M12 3.5v2" />
        <path
          d="M12 5.5a6 6 0 0 1 6 6c0 3 .7 5 1.7 6.2H4.3C5.3 16.5 6 14.5 6 11.5a6 6 0 0 1 6-6Z"
          className="fill-current/10"
        />
        <path d="M10.4 17.7a1.8 1.8 0 0 0 3.2 0" />
      </svg>
    );
  }

  /* A six-armed flake, cut like the ones falling over the page. */
  return (
    <svg {...common}>
      <path d="M12 2.5v19M4 7l16 10M20 7L4 17" />
      <path d="M12 6.5l-2.2-2.2M12 6.5l2.2-2.2M12 17.5l-2.2 2.2M12 17.5l2.2 2.2" />
      <path d="M7.4 9.4l-3-.6M16.6 14.6l3 .6M7.4 14.6l-3 .6M16.6 9.4l3-.6" />
    </svg>
  );
}

export function ChristmasOrnaments() {
  const season = useLiturgicalSeason();

  if (!isSnowSeason(season)) return null;

  return (
    <div
      aria-hidden
      /*
       * `z-30` sits above the hero's photography and its scrims and below the
       * masthead at `z-50`, so the ornaments hang in front of the picture and
       * behind the navigation - which is the order they would be in if they
       * were really hanging in the room.
       */
      className="pointer-events-none absolute inset-x-0 top-0 z-30 h-40 select-none overflow-hidden lg:h-48"
    >
      {HANGING.map((item, index) => (
        <span
          key={index}
          className={[
            "absolute top-0 flex -translate-x-1/2 flex-col items-center",
            // The denser half of the set only appears once there is width to
            // hang it in; on a phone the same count reads as bunting.
            item.hide ? "hidden sm:flex" : "flex",
            TONE[item.tone],
          ].join(" ")}
          style={{ left: `${item.left}%` }}
        >
          {/* The thread. Fades in from the top edge so it reads as hanging from
              somewhere rather than as a line that begins abruptly. */}
          <span
            className="w-px bg-gradient-to-b from-transparent via-current to-current opacity-40"
            style={{ height: `${item.drop}px` }}
          />
          <Ornament kind={item.kind} />
        </span>
      ))}
    </div>
  );
}
