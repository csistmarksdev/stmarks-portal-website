"use client";

import { useTranslations } from "next-intl";

import { useLiturgicalSeason } from "@/components/common/liturgical-season";

/**
 * Good Friday, at the foot of the page.
 *
 * Calvary: three crosses on a hill, the centre one taller and standing alone
 * on its rise. Beside them the instruments the day is remembered by — the crown
 * of thorns, three nails, the spear and the sponge on hyssop — and above the
 * hill the darkness that came over the land at the sixth hour.
 *
 * ## Why this exists at all
 *
 * An earlier version of this system deliberately gave Good Friday *nothing*: a
 * stripped page, on the reasoning that a decoration surviving the day it
 * commemorates would prove the calendar was never really being kept. That
 * reasoning was wrong in one respect, and the correction is worth recording.
 * The altar is stripped on Good Friday, but the church is not empty — the cross
 * is brought forward and venerated, and it is the one day of the year the
 * building is *about* a single image. So the page carries that image, and
 * nothing else.
 *
 * ## The rules it keeps
 *
 * Everything is drawn in white on the footer's ink, at the same hairline weight
 * as every other mark on this site, and there is **no colour anywhere** — the
 * season's palette blocks in `globals.css` have already drained every scale to
 * a pure neutral, so even a stray accent class would come out grey here.
 *
 * Nothing moves. The other seasons have snow falling or light breathing behind
 * them; this one is still, which on this day is the whole point.
 *
 * The words are scripture with its reference, in the reader's own language, as
 * real translated text rather than lettering drawn as a path.
 */
export function GoodFridayScene() {
  const season = useLiturgicalSeason();
  const t = useTranslations("season.goodFriday");

  if (season !== "good-friday") return null;

  return (
    <div className="relative">
      <p className="relative z-10 flex flex-col items-center gap-5 px-6 pb-2 text-center">
        <span className="flex items-center gap-4">
          <span aria-hidden className="h-px w-10 bg-white/25 sm:w-16" />
          {/* A plain cross, unadorned — no halo, no gilding, no colour. */}
          <span aria-hidden className="text-white/60">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              className="size-5"
            >
              <path d="M12 3v18M6.5 9h11" />
            </svg>
          </span>
          <span aria-hidden className="h-px w-10 bg-white/25 sm:w-16" />
        </span>

        <span className="max-w-[24ch] text-balance font-display text-[clamp(1.25rem,2vw+0.75rem,1.875rem)] font-[500] leading-[1.35] tracking-[-0.015em] text-white/85 sm:max-w-[30ch]">
          {t("greeting")}
        </span>

        <span className="label text-white/40">{t("reference")}</span>
      </p>

      <div
        aria-hidden
        className="pointer-events-none relative -mb-px h-32 w-full select-none sm:h-40 lg:h-48"
      >
        <svg
          viewBox="0 0 1200 110"
          preserveAspectRatio="xMidYMax slice"
          className="absolute inset-0 size-full"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* The hill. Bare ground, no drift and no grass — a rise and nothing on
              it but what was put there. */}
          <path
            d="M0 96Q180 88 380 92T700 86T980 92T1200 88V110H0Z"
            className="fill-white/[0.03] stroke-white/20"
          />

          {/* --- Calvary ---------------------------------------------------
              Three crosses. The two thieves are shorter, set well back and
              drawn fainter; the centre one stands clear of both. */}
          <g className="stroke-white/25">
            <path d="M596 96V54" strokeWidth="1.4" />
            <path d="M584 64h24" strokeWidth="1.4" />
          </g>
          <g className="stroke-white/25">
            <path d="M724 96V54" strokeWidth="1.4" />
            <path d="M712 64h24" strokeWidth="1.4" />
          </g>
          <g className="stroke-white/55">
            <path d="M660 96V26" strokeWidth="2" />
            <path d="M638 42h44" strokeWidth="2" />
          </g>

          {/* --- the crown of thorns ---------------------------------------
              A ring with the thorns struck outward from it at intervals, so it
              reads as plaited rather than as a wheel. */}
          <g className="stroke-white/40">
            <circle cx="330" cy="70" r="20" />
            <circle cx="330" cy="70" r="14" className="stroke-white/25" />
            <path d="M330 50l-2-7M347 58l6-5M352 74l7 2M341 88l4 6M320 89l-3 6M306 78l-7 3M310 60l-6-5M318 50l-1-7" />
          </g>

          {/* --- three nails ------------------------------------------------
              Square-headed, tapering to a point, laid at angles as they would
              fall rather than lined up in a row. */}
          <g className="stroke-white/35">
            <path d="M436 62h9M440.5 62v26l-1.5 5-1.5-5V62" />
            <path d="M462 66l8 3M466.5 68l-8 25-3.5 4 .5-5.5 8-24" />
            <path d="M486 64l9-2M490.5 63l4 25.5-1 5-2.5-4.5-4-25" />
          </g>

          {/* --- the spear and the sponge on hyssop -------------------------
              Leaned together, as they are shown in every Arma Christi. */}
          <g className="stroke-white/28">
            <path d="M846 96L862 40" />
            <path d="M862 40l-5 8 5 6 5-6z" className="fill-white/[0.06]" />
            <path d="M900 96L886 44" />
            <circle cx="884" cy="38" r="6" className="fill-white/[0.06]" />
          </g>

          {/* --- stones ---------------------------------------------------- */}
          <g className="stroke-white/18">
            <path d="M150 98a7 4 0 0 1 14 0z" className="fill-white/[0.025]" />
            <path d="M196 99a5 3 0 0 1 10 0z" className="fill-white/[0.025]" />
            <path d="M1040 98a6 3.5 0 0 1 12 0z" className="fill-white/[0.025]" />
            <path d="M1082 99a5 3 0 0 1 10 0z" className="fill-white/[0.025]" />
          </g>
        </svg>
      </div>
    </div>
  );
}
