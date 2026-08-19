"use client";

import { useTranslations } from "next-intl";

import { useLiturgicalSeason } from "@/components/common/liturgical-season";
import { isLentSeason } from "@/lib/liturgical-year";

/**
 * The Lenten frieze - a wilderness along the foot of the site.
 *
 * The counterpart to the Christmas scene, and deliberately its opposite in
 * every decision. Christmas fills the foot of the page: firs in a stand,
 * baubles, a snowman, gifts, a lit lantern, a greeting in the display serif.
 * Lent empties it. Three bare trees, a scatter of stones, one cross on the
 * horizon and a single candle - nothing in leaf, nothing hung, nothing wrapped.
 *
 * That is not a smaller Christmas. It is the whole point of the season: forty
 * days in a wilderness, an altar stripped rather than dressed. A Lent decorated
 * *like* Christmas - thorns as ornaments, violet baubles - would be the moment
 * the site stopped keeping the calendar and started illustrating it.
 *
 * So the rule here is that everything is drawn in the same hand as the
 * Christmas scene, at the same hairline weight, and there is simply far less of
 * it, spread far wider apart. The reader who saw December should recognise the
 * horizon and notice what has gone from it.
 *
 * What stands at the centre is scripture, not a wish: Joel's call at the head
 * of every Ash Wednesday liturgy, with its reference, in the reader's own
 * language. Real text rather than lettering drawn as a path - translated, read
 * aloud by a screen reader, and set in the site's own display serif.
 *
 * Never shown on Good Friday. `isLentSeason` covers Lent and Holy Week and
 * stops there; on the day the altar is stripped the foot of the page carries
 * nothing at all.
 */
export function LentScene() {
  const season = useLiturgicalSeason();
  const t = useTranslations("season.lent");

  if (!isLentSeason(season)) return null;

  return (
    <div className="relative">
      <p className="relative z-10 flex flex-col items-center gap-5 px-6 pb-2 text-center">
        <span className="flex items-center gap-4">
          <span aria-hidden className="h-px w-10 rule-section sm:w-16" />
          {/* An ash cross - the mark made on the forehead on Ash Wednesday, and
              the only ornament this season has. Struck, not filled. */}
          <span aria-hidden className="text-accent-200/70">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              className="size-4"
            >
              <path d="M12 4.5v15M6 10h12" />
            </svg>
          </span>
          <span aria-hidden className="h-px w-10 rule-section sm:w-16" />
        </span>

        <span className="max-w-[22ch] text-balance font-display text-[clamp(1.25rem,2vw+0.75rem,1.875rem)] font-[500] italic leading-[1.35] tracking-[-0.015em] text-white/90 sm:max-w-[28ch]">
          {t("greeting")}
        </span>

        <span className="label text-white/45">{t("reference")}</span>
      </p>

      <div
        aria-hidden
        className="pointer-events-none relative -mb-px h-28 w-full select-none sm:h-36 lg:h-44"
      >
        <svg
          viewBox="0 0 1200 100"
          /* Bottom-anchored `slice`, and every figure drawn between y=20 and
             y=100, for the same reason as the Christmas frieze: on a wide
             monitor the scale is set by width and the excess is cropped off
             the top. */
          preserveAspectRatio="xMidYMax slice"
          className="absolute inset-0 size-full"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* The ground. Flatter and drier than the Christmas drift - one low
              rise rather than two banks of snow, and no fill worth speaking of. */}
          <path
            d="M0 84Q200 78 400 82T800 80T1200 84V100H0Z"
            className="fill-white/[0.025] stroke-white/20"
          />

          {/* A bare tree, left of centre: trunk, six limbs, and the twigs that
              fork from them. Nothing in leaf. */}
          <g className="stroke-white/40">
            <path d="M232 92V44" strokeWidth="1.6" />
            <path d="M232 62L214 46M232 62l18-14M232 52l-12-12M232 52l13-11M232 70l-14-9M232 70l15-8" />
            <path d="M214 46l-6-3M214 46l-1-6M250 48l6-4M250 48l1-6M220 40l-5-4M245 41l5-4" />
          </g>

          {/* Two smaller ones, further off and further apart than the firs of
              December ever are - the spacing is the season. */}
          <g className="stroke-white/25">
            <path d="M120 90V56" strokeWidth="1.4" />
            <path d="M120 70l-12-11M120 70l12-10M120 62l-8-8M120 62l9-7" />
            <path d="M108 59l-4-2M108 59l0-4M132 60l4-3M132 60l0-4" />
          </g>
          <g className="stroke-white/22">
            <path d="M1010 90V52" strokeWidth="1.4" />
            <path d="M1010 68l-14-12M1010 68l14-11M1010 58l-9-9M1010 58l10-8" />
            <path d="M996 56l-5-2M996 56l0-5M1024 57l5-3M1024 57l0-5" />
          </g>

          {/* The cross on the horizon. Plain, unfixed, standing alone - this is
              the thing the whole season is walking toward. */}
          <g className="stroke-white/45">
            <path d="M760 88V38" strokeWidth="1.8" />
            <path d="M744 52h32" strokeWidth="1.8" />
          </g>

          {/* One candle, still burning. The Christmas scene has a lantern with
              a bright flame; this is a thinner light, and it is the only warm
              thing left on the page. */}
          <g className="stroke-white/30">
            <path d="M470 90V64" strokeWidth="2" />
            <path d="M462 90h16" strokeWidth="1.5" />
            <path
              d="M470 62c2.5 2.6 3.6 4.6 3.6 6.4a3.6 3.6 0 0 1-7.2 0c0-1.8 1.1-3.8 3.6-6.4Z"
              className="fill-accent-300/25 stroke-accent-300/70"
            />
          </g>

          {/* Stones. Forty days in a wilderness, and this is what a wilderness
              is made of. */}
          <g className="stroke-white/22">
            <path d="M300 90a7 4 0 0 1 14 0z" className="fill-white/[0.03]" />
            <path d="M336 91a5 3 0 0 1 10 0z" className="fill-white/[0.03]" />
            <path d="M600 89a6 3.5 0 0 1 12 0z" className="fill-white/[0.03]" />
            <path d="M868 90a8 4.5 0 0 1 16 0z" className="fill-white/[0.03]" />
            <path d="M900 91a5 3 0 0 1 10 0z" className="fill-white/[0.03]" />
            <path d="M180 91a6 3.5 0 0 1 12 0z" className="fill-white/[0.03]" />
          </g>
        </svg>
      </div>
    </div>
  );
}
