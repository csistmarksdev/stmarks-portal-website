"use client";

import { useTranslations } from "next-intl";

import { useLiturgicalSeason } from "@/components/common/liturgical-season";
import { isSnowSeason } from "@/lib/liturgical-year";

/**
 * The Christmas frieze - a snowy scene along the foot of the site.
 *
 * Firs, a snowman, a lantern and the star, standing on a drift at the very
 * bottom of the page through Advent and Christmastide. It is the one piece of
 * outright seasonal illustration on the site, and it earns that by being drawn
 * rather than borrowed: fine strokes in the season's own gold on the footer's
 * ink, closer to frost etched on a dark window than to clip art dropped onto a
 * page.
 *
 * Everything about it is deliberate restraint around one indulgence:
 *
 * It is **line, not fill**. Solid silhouettes of a tree and a snowman are a
 * greetings-card motif and would fight the church's photography two hundred
 * pixels above them. Strokes at a hairline weight sit at the same optical
 * weight as the rules, keylines and cross marks used everywhere else on the
 * site, so the scene belongs to the same hand.
 *
 * It sits **in the flow**, not fixed over the page. A fixed band across the
 * bottom of the viewport would follow the reader down every page, cover
 * whatever they were reading, and turn a seasonal grace note into something to
 * be got past. Here it occupies real space at the foot of the footer, where the
 * page has finished saying what it has to say.
 *
 * It is **decorative and declared as such** - `aria-hidden`, no text, no focus
 * stop. A screen reader gets the church's address, not a description of a
 * snowman.
 *
 * Nothing in it animates. The snow already falling over the page is the motion
 * in this scene; a waving snowman would be the moment the site stopped being a
 * church's.
 */
export function ChristmasScene() {
  const season = useLiturgicalSeason();
  const t = useTranslations("season.christmas");

  if (!isSnowSeason(season)) return null;

  return (
    <div className="relative">
      {/*
        The greeting.

        Real text in the site's own display serif, not lettering drawn as an
        SVG path - which matters for three reasons that all point the same way.
        It is translated, so a Tamil reader gets "இனிய கிறிஸ்துமஸ்" rather than
        an English picture. It is *read* by a screen reader and found by search,
        because unlike the trees around it this is a message, not a decoration.
        And it is set in Fraunces at the weight and tracking the rest of the site
        uses, so the greeting is in the church's own voice instead of a
        typeface somebody drew once and pasted in.
      */}
      <p className="relative z-10 flex flex-col items-center gap-4 px-6 pb-2 text-center">
        <span className="flex items-center gap-4">
          <span aria-hidden className="h-px w-10 rule-section sm:w-16" />
          <span
            aria-hidden
            className="text-accent-200/80"
            /* The star of the nativity, struck between the rules. */
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path
                d="M12 2.5l2.4 6.4 6.4 2.4-6.4 2.4L12 20.5l-2.4-6.8L3.2 11.3l6.4-2.4z"
                className="fill-current/25"
              />
            </svg>
          </span>
          <span aria-hidden className="h-px w-10 rule-section sm:w-16" />
        </span>

        {/*
          Balanced and capped to a measure, because the greeting is now two
          wishes rather than one: "Merry Christmas & Happy New Year" is twice
          the length of what was here, and the Tamil is longer still. Left to
          itself it would break after the ampersand on a phone and leave a
          single word stranded on the second line. `text-balance` evens the two
          lines instead, and the measure decides where the break happens rather
          than the viewport deciding for it.
        */}
        <span className="max-w-[18ch] text-balance font-display text-[clamp(1.375rem,2.4vw+0.75rem,2.25rem)] font-[500] leading-[1.2] tracking-[-0.02em] text-white sm:max-w-none">
          {t("greeting")}
        </span>

        <span className="label text-white/50">{t("blessing")}</span>
      </p>

      <div
        aria-hidden
        /*
         * In the flow and full-bleed: it takes its own height, so nothing above
         * it can collide with it, and it spans the whole footer rather than
         * sitting inside the content measure - the drift has to reach both edges
         * of the page or it reads as a picture of a landscape instead of the
         * ground the page is standing on.
         */
        className="pointer-events-none relative -mb-px h-28 w-full select-none sm:h-36 lg:h-44"
      >
      <svg
        viewBox="0 0 1200 100"
        /*
         * `slice`, anchored to the bottom of the box - and the reason the band
         * gets taller at each breakpoint.
         *
         * `slice` scales to *cover*, so on a wide viewport the scale is set by
         * width and the excess is cropped off the top. At a fixed height that
         * silently decapitates the trees on a large monitor: at 1920px wide the
         * scale is 1.6, which leaves only 60 of the 100 view-box units visible.
         * The band therefore grows with the breakpoints, and every figure is
         * drawn between y=20 and y=100, so the worst case still shows all of
         * them. Horizontal crop is unimportant by construction - only the two
         * small distant firs live out at the edges.
         */
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 size-full"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* The drift. A filled band at a whisper of white so the figures have
            ground to stand on, with its crest drawn as a line. */}
        <path
          d="M0 78Q100 72 200 76T400 76T600 74T800 78T1000 74T1200 78V100H0Z"
          className="fill-white/[0.05] stroke-white/25"
        />

        {/* A second, nearer drift, so the ground has depth rather than reading
            as one cut-out edge. */}
        <path
          d="M0 88Q150 82 300 86T600 86T900 84T1200 88V100H0Z"
          className="fill-white/[0.035] stroke-white/15"
        />

        {/* --- the tall fir, dressed --------------------------------------
            Three tiers over a trunk, with a snow line struck along each tier,
            baubles hung in the branches and a star at the crown. This is the
            Christmas tree of the scene, so it is the one that carries the
            decoration; the others behind it are simply firs in snow. */}
        <g className="stroke-white/50">
          <path d="M230 30 L218 50 L224 50 L212 66 L220 66 L204 82 L256 82 L240 66 L248 66 L236 50 L242 50 Z" />
          <path d="M230 82v10" strokeWidth="2" />
          <path
            d="M216 50h28M208 66h44"
            className="stroke-white/25"
            strokeWidth="1"
          />
        </g>

        {/* the star at the crown */}
        <g className="stroke-accent-200/80">
          <path
            d="M230 14l2.6 6.4 6.4 2.6-6.4 2.6L230 32l-2.6-6.4-6.4-2.6 6.4-2.6z"
            className="fill-current/25"
          />
        </g>

        {/* baubles, hung across the tiers */}
        <g className="stroke-amber-200/70">
          <circle cx="222" cy="56" r="2.6" className="fill-current/25" />
          <circle cx="242" cy="72" r="2.6" className="fill-current/25" />
        </g>
        <g className="stroke-rose-300/70">
          <circle cx="238" cy="56" r="2.4" className="fill-current/25" />
          <circle cx="216" cy="73" r="2.4" className="fill-current/25" />
        </g>
        <g className="stroke-accent-200/70">
          <circle cx="230" cy="66" r="2.2" className="fill-current/25" />
        </g>

        {/* --- firs behind, at two distances ----------------------------- */}
        <g className="stroke-white/30">
          <path d="M128 46 L118 62 L123 62 L112 78 L144 78 L133 62 L138 62 Z" />
          <path d="M128 78v9" strokeWidth="1.75" />
        </g>
        <g className="stroke-white/28">
          <path d="M1024 42 L1012 60 L1018 60 L1006 78 L1042 78 L1030 60 L1036 60 Z" />
          <path d="M1024 78v10" strokeWidth="1.75" />
          <circle
            cx="1024"
            cy="66"
            r="2.2"
            className="fill-current/20 stroke-amber-200/60"
          />
        </g>
        <g className="stroke-white/20">
          <path d="M1092 52 L1083 66 L1088 66 L1078 80 L1106 80 L1096 66 L1101 66 Z" />
          <path d="M1092 80v8" strokeWidth="1.5" />
        </g>

        {/* --- the snowman ------------------------------------------------
            Three stacked rounds, a hat, coal eyes, a carrot, a scarf with the
            tail lifted as if there were a wind, and twig arms. Anything more
            detailed stops reading at this size. */}
        <g className="stroke-white/60">
          <circle cx="470" cy="84" r="14" className="fill-white/[0.08]" />
          <circle cx="470" cy="64" r="10" className="fill-white/[0.08]" />
          <circle cx="470" cy="48" r="7.5" className="fill-white/[0.08]" />

          {/* hat */}
          <path d="M459 41h22M463 41v-7a7 7 0 0 1 14 0v7" />

          {/* two coals and a carrot */}
          <circle cx="467" cy="46" r="1" className="fill-current stroke-none" />
          <circle cx="474" cy="46" r="1" className="fill-current stroke-none" />
          <path d="M470 49l7 2.5-7 2z" className="stroke-accent-300/80" />

          {/* scarf, tail lifted */}
          <path
            d="M461 56c6 3 12 3 18 0"
            className="stroke-rose-300/70"
            strokeWidth="2.5"
          />
          <path
            d="M478 56c3 5 5 9 9 11"
            className="stroke-rose-300/70"
            strokeWidth="2"
          />

          {/* twig arms */}
          <path d="M482 62l14-6M493 58l1-4M493 58l4-1M458 62l-14-5M447 59l-1-4M447 59l-4 0" />

          {/* coals down the body */}
          <circle cx="470" cy="60" r="1" className="fill-current stroke-none" />
          <circle cx="470" cy="78" r="1.2" className="fill-current stroke-none" />
          <circle cx="470" cy="86" r="1.2" className="fill-current stroke-none" />
        </g>

        {/* --- the lantern ------------------------------------------------
            A parish keeps a light burning through the dark half of the year;
            this is that, on a post at the edge of the path. */}
        <g className="stroke-white/35">
          <path d="M760 96V66" strokeWidth="1.5" />
          <path d="M750 66h20l-3-12h-14z" className="fill-amber-200/15" />
          <path d="M753 54l7-6 7 6" />
          <path d="M760 58v5" className="stroke-amber-200/90" strokeWidth="2" />
        </g>

        {/* --- a wreath, hung beside the path ---------------------------- */}
        <g className="stroke-white/28">
          <circle cx="880" cy="64" r="11" />
          <circle cx="880" cy="64" r="7.5" className="stroke-white/15" />
          <path
            d="M875 53c2-3 8-3 10 0"
            className="stroke-rose-300/70"
            strokeWidth="2"
          />
        </g>

        {/* --- a few gift boxes at the foot of the tree ------------------- */}
        <g className="stroke-white/35">
          <path d="M206 92h16v8h-16z" className="fill-white/[0.06]" />
          <path d="M214 92v8M206 96h16" className="stroke-rose-300/60" />
          <path d="M226 95h11v5h-11z" className="fill-white/[0.06]" />
          <path d="M231.5 95v5M226 97.5h11" className="stroke-amber-200/60" />
        </g>

        </svg>
      </div>
    </div>
  );
}
