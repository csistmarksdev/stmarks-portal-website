"use client";

import { useTranslations } from "next-intl";

import { useLiturgicalSeason } from "@/components/common/liturgical-season";

/**
 * Ash Wednesday, at the foot of the page.
 *
 * Not a landscape. The other three scenes on this site are places - a snowy
 * stand of firs, a wilderness, a hill with a sunrise behind it - because their
 * seasons are stretches of time and a stretch of time has somewhere it happens.
 * This is one day, and what happens on it happens at a table: a bowl of ashes,
 * last year's palms burned down to make them, and a thumb.
 *
 * So the scene is that table, seen from across the chancel - the bowl at the
 * centre, fronds either side, and the mark itself struck large above it.
 *
 * It is the quietest scene in the set apart from Good Friday's, and
 * deliberately: the day opens a fast, and it should be the emptiest the page has
 * been since the last one. Everything the following six weeks will strip away
 * is already absent here.
 *
 * The words are the sentence said at the imposition - the oldest line in the
 * whole liturgy, and the reason nobody needs it explained.
 */
export function AshWednesdayScene() {
  const season = useLiturgicalSeason();
  const t = useTranslations("season.ashWednesday");

  if (season !== "ash-wednesday") return null;

  return (
    <div className="relative">
      <p className="relative z-10 flex flex-col items-center gap-5 px-6 pb-2 text-center">
        <span className="flex items-center gap-4">
          <span aria-hidden className="h-px w-10 rule-section sm:w-16" />
          {/* The mark, small, struck with a thumb rather than drawn. */}
          <span aria-hidden className="text-white/55">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              className="size-5"
            >
              <path d="M12 4.5c.4 3.6.5 8.4.2 15" strokeWidth="2.6" />
              <path d="M5.8 10.5c4.2-.5 8.4-.5 12.6.1" strokeWidth="2.4" />
            </svg>
          </span>
          <span aria-hidden className="h-px w-10 rule-section sm:w-16" />
        </span>

        <span className="max-w-[24ch] text-balance font-display text-[clamp(1.25rem,2vw+0.75rem,1.875rem)] font-[500] italic leading-[1.35] tracking-[-0.015em] text-white/85 sm:max-w-[32ch]">
          {t("greeting")}
        </span>

        <span className="label text-white/40">{t("reference")}</span>
      </p>

      <div
        aria-hidden
        className="pointer-events-none relative -mb-px h-28 w-full select-none sm:h-36 lg:h-44"
      >
        <svg
          viewBox="0 0 1200 100"
          preserveAspectRatio="xMidYMax slice"
          className="absolute inset-0 size-full"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* The table the ashes stand on: one line, and nothing under it. */}
          <path d="M0 88h1200" className="stroke-white/20" />

          {/* --- the bowl of ashes, at the centre ------------------------- */}
          <g className="stroke-white/45">
            <path
              d="M560 66c11-24 27-34 40-34s29 10 40 34Z"
              className="fill-white/[0.07]"
            />
            <path
              d="M584 56l3-6M614 50l3-6M600 44l3-5"
              className="stroke-white/30"
              strokeWidth="0.9"
            />
            <path d="M534 66h132a66 66 0 0 1-132 0Z" className="fill-white/[0.04]" />
            <path d="M578 88h44M600 82v6" />
          </g>

          {/* --- palm fronds, laid either side ---------------------------- */}
          <g className="stroke-white/28">
            <path d="M430 88c14-10 26-24 34-42" strokeWidth="1.3" />
            <path d="M444 76l-14 2M448 68l-14 1M453 60l-13 0M458 52l-12-1M463 44l-11-2" />
            <path d="M444 76l6-12M448 68l7-11M453 60l8-10M458 52l8-9" />
          </g>
          <g className="stroke-white/28">
            <path d="M770 88c-14-10-26-24-34-42" strokeWidth="1.3" />
            <path d="M756 76l14 2M752 68l14 1M747 60l13 0M742 52l12-1M737 44l11-2" />
            <path d="M756 76l-6-12M752 68l-7-11M747 60l-8-10M742 52l-8-9" />
          </g>

          {/* --- the mark, struck large on the left ----------------------- */}
          <g className="stroke-white/35">
            <path d="M240 34c1.2 11 1.6 26 .8 50" strokeWidth="7" />
            <path d="M212 56c19-2 38-2 57 .5" strokeWidth="6.4" />
          </g>

          {/* --- and again on the right, fainter, as if already fading ---- */}
          <g className="stroke-white/22">
            <path d="M980 42c1 9 1.3 21 .6 42" strokeWidth="6" />
            <path d="M956 60c16-1.6 32-1.6 48 .4" strokeWidth="5.4" />
          </g>

          {/* --- ash scattered on the table ------------------------------- */}
          <g className="stroke-white/16">
            <path d="M120 86a5 2.5 0 0 1 10 0z" className="fill-white/[0.03]" />
            <path d="M356 87a4 2 0 0 1 8 0z" className="fill-white/[0.03]" />
            <path d="M846 86a5 2.5 0 0 1 10 0z" className="fill-white/[0.03]" />
            <path d="M1096 87a4 2 0 0 1 8 0z" className="fill-white/[0.03]" />
          </g>
        </svg>
      </div>
    </div>
  );
}
