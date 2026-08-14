"use client";

import { useTranslations } from "next-intl";

import { useLiturgicalSeason } from "@/components/common/liturgical-season";

/**
 * Easter, at the foot of the page.
 *
 * The sun coming up behind the hill; the opened tomb with its stone rolled
 * clear;
 * the three crosses of Friday standing empty on the far hill; lilies in the
 * foreground and a butterfly over them.
 *
 * ## On not drawing the figure
 *
 * A figure of the Risen Christ stood at the centre of this scene through three
 * attempts and is not here now — see the note in `section-ornaments.tsx`. The
 * short version: a human figure is the shape people read most precisely, a face
 * is available neither at this size nor in this tradition, and without one the
 * eye reads an object rather than a person. The sun rising behind the hill says
 * the same thing and is understood instantly, because the church has always
 * said it that way — in glass, in stone, and in the orientation of the building
 * itself.
 *
 * ## Read against the other two scenes
 *
 * This is the third of a set, and it only works because of what it answers.
 * December fills the ground with firs and gifts. Lent empties it to bare
 * branches and stones. Good Friday puts three crosses on it, occupied. Here the
 * same hill carries the same three crosses — *empty*, and set back — while what
 * stands forward is an opened tomb and things in flower.
 *
 * The rays are struck from behind the figure rather than around it: light
 * coming out, which is the claim of the day, rather than light shone onto a
 * monument.
 *
 * ## The words
 *
 * The Paschal greeting, in the reader's own language — the call and the
 * response, which is how it is actually said, one half by the presbyter and one
 * by everybody else. It is the only greeting on this site set as a dialogue,
 * because it is the only one that is one.
 *
 * "Halleluyah" carries a particular weight here: the word is put away for the
 * whole of Lent and returns at Easter, so the site is quite literally not
 * allowed to say it until this moment.
 */
export function EasterScene() {
  const season = useLiturgicalSeason();
  const t = useTranslations("season.easter");

  if (season !== "easter") return null;

  return (
    <div className="relative">
      <p className="relative z-10 flex flex-col items-center gap-4 px-6 pb-2 text-center">
        <span className="flex items-center gap-4">
          <span aria-hidden className="h-px w-10 rule-section sm:w-16" />
          {/* An empty cross, radiant — the Easter reading of the sign that was
              bare on Friday. */}
          <span aria-hidden className="text-accent-300">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              className="size-5 drop-shadow-[0_0_10px_var(--paschal-soft,transparent)]"
            >
              <path d="M12 4v16M7 10h10" />
              <path
                d="M12 1.5v1.5M20.5 9.5h1.5M2 9.5h1.5M18 4l1-1M6 4L5 3"
                className="opacity-70"
              />
            </svg>
          </span>
          <span aria-hidden className="h-px w-10 rule-section sm:w-16" />
        </span>

        <span className="max-w-[20ch] text-balance font-display text-[clamp(1.5rem,2.6vw+0.75rem,2.25rem)] font-[500] leading-[1.2] tracking-[-0.02em] text-white [text-shadow:0_0_30px_var(--paschal-soft,transparent)]">
          {t("greeting")}
        </span>

        <span className="max-w-[26ch] text-balance font-display text-[clamp(1rem,1.2vw+0.7rem,1.25rem)] italic leading-snug text-accent-200/90">
          {t("response")}
        </span>
      </p>

      <div
        aria-hidden
        className="pointer-events-none relative -mb-px h-44 w-full select-none sm:h-56 lg:h-64"
      >
        <svg
          viewBox="0 0 1200 170"
          preserveAspectRatio="xMidYMax slice"
          className="absolute inset-0 size-full"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/*
            --- the rising sun ---------------------------------------------

            The centre of the scene, and the whole of it: a half-disc coming up
            behind the horizon with rays struck outward from its own centre.

            Two things were left standing here when the figure of the Risen
            Christ came out, and both had to go with it. The mandorla — the
            pointed almond a risen Christ is shown within — was drawn *before*
            the figure in the source, so removing the figure left the almond
            hanging over the sunrise with nothing inside it, which is exactly
            what it looked like. And the glory rays were struck from the
            figure's crown at y=8, well above where the sun now sits, so they
            radiated from a point that no longer had anything at it.

            Both are gone. The rays below are cast from the sun's own centre
            (600, 148) and spaced evenly around the half it shows above the
            horizon, so the light comes from the thing that is making it.
          */}
          <g className="stroke-accent-300/50">
            <path
              d="M540 148a60 60 0 0 1 120 0"
              className="fill-accent-300/[0.1]"
            />
            <path
              d="M600 74V44M642 90l22-22M558 90l-22-22M676 132l30-8M524 132l-30-8M664 110l28-16M536 110l-28-16"
              className="stroke-accent-300/40"
            />
          </g>

          {/* --- the three crosses, empty, on the far hill ---------------- */}
          <g className="stroke-white/20">
            <path d="M900 148V118M890 124h20" />
            <path d="M950 148V112M938 119h24" strokeWidth="1.4" />
            <path d="M1000 148V118M990 124h20" />
          </g>

          {/* --- the ground ---------------------------------------------- */}
          <path
            d="M0 148Q200 142 400 146T760 144T1040 148T1200 144V170H0Z"
            className="fill-white/[0.04] stroke-white/25"
          />

          {/* --- the tomb, opened -----------------------------------------
              The mouth of a rock-cut grave with the stone rolled clear and
              standing on edge. The dark of the opening is a fill, because an
              empty tomb has to read as empty. */}
          <g className="stroke-white/45">
            <path
              d="M230 148V124a34 34 0 0 1 68 0v24"
              className="fill-white/[0.05]"
            />
            <path
              d="M248 148V128a16 16 0 0 1 32 0v20z"
              className="fill-sand-950/70 stroke-white/35"
            />
            <circle cx="334" cy="132" r="15" className="fill-white/[0.06]" />
            <path d="M334 117v30" className="stroke-white/20" />
            <path d="M306 148h44" className="stroke-white/20" />
          </g>

          {/* --- lilies ----------------------------------------------------
              Three trumpets on stems in the foreground: the Easter flower, and
              the only thing in this set that is in bloom. */}
          <g className="stroke-white/45">
            <path d="M420 148V112" />
            <path d="M420 122l-12 8M420 128l11 7" className="stroke-white/30" />
            <path
              d="M420 112c-9-4-13-9-13-13 5 1 9 3 13 6 4-3 8-5 13-6 0 4-4 9-13 13Z"
              className="fill-white/[0.09]"
            />
            <path d="M420 105v-8" className="stroke-white/30" />

            <path d="M448 148V120" />
            <path d="M448 128l10 7" className="stroke-white/30" />
            <path
              d="M448 120c-7-3-10-7-10-10 4 1 7 2 10 4 3-2 6-3 10-4 0 3-3 7-10 10Z"
              className="fill-white/[0.09]"
            />
          </g>

          <g className="stroke-white/38">
            <path d="M1100 148V116" />
            <path d="M1100 126l-11 7" className="stroke-white/28" />
            <path
              d="M1100 116c-8-3-12-8-12-11 5 1 8 2 12 5 4-3 7-4 12-5 0 3-4 8-12 11Z"
              className="fill-white/[0.08]"
            />
          </g>

          {/* --- a butterfly ------------------------------------------------
              The oldest emblem of the resurrection there is: the thing that
              comes out of a sealed tomb changed. */}
          <g className="stroke-accent-200/55">
            <path d="M780 96v14" />
            <path d="M780 98c-6-9-16-12-20-7s2 14 12 15c-6 3-8 9-5 12s10-1 13-9" />
            <path d="M780 98c6-9 16-12 20-7s-2 14-12 15c6 3 8 9 5 12s-10-1-13-9" />
            <path d="M780 96l-4-5M780 96l4-5" />
          </g>

          {/* --- stones, now simply ground ------------------------------- */}
          <g className="stroke-white/16">
            <path d="M160 150a7 4 0 0 1 14 0z" className="fill-white/[0.03]" />
            <path d="M860 151a5 3 0 0 1 10 0z" className="fill-white/[0.03]" />
            <path d="M1160 150a6 3.5 0 0 1 12 0z" className="fill-white/[0.03]" />
          </g>
        </svg>
      </div>
    </div>
  );
}
