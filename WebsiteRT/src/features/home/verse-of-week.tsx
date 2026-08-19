import { getLocale, getTranslations } from "next-intl/server";

import { CrossMark } from "@/components/common/ornament";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui/container";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/date";
import { localize } from "@/lib/localize";
import { GRAIN } from "@/lib/textures";
import { getWeeklyVerse } from "@/services";

/**
 * Verse of the week.
 *
 * The pause between sections. Everything here is light and type - no
 * photography, deliberately, because every hero on the site now carries
 * imagery and this section earns its weight by withholding it.
 *
 * Depth comes from stacked layers instead: a drifting brass bloom, film grain,
 * and a vignette that closes the edges - and the scripture is centred and
 * struck between gilded rules like the head of an illuminated page.
 */
export async function VerseOfWeek() {
  const [t, verse] = await Promise.all([
    getTranslations("home.verse"),
    getWeeklyVerse(),
  ]);

  const locale = (await getLocale()) as Locale;

  return (
    <section
      /* `data-verse` is the hook the season blocks in `globals.css` use to
         light this section; it carries no styling of its own. */
      data-verse=""
      className="relative isolate overflow-hidden bg-sand-950 py-32 text-white sm:py-40 lg:py-48"
    >
      {/*
        One light, from above.

        There were two coloured blooms here before - one high left, one low
        right - drifting past each other, which is a lava lamp, not a sanctuary.
        A single warm source entering at the crown is what a lit church actually
        looks like from the back of the nave, and it puts the light where the
        scripture is rather than in the corners.
      */}
      <div
        aria-hidden
        className="verse-bloom pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            `radial-gradient(58% 55% at 50% -8%, var(--season-light-dark, oklch(0.508 0.166 34 / 0.5)), transparent 72%)`,
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      {/* Closes the edges so the light reads as light, not as a gradient band. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(118% 96% at 50% 42%, transparent 36%, oklch(0.158 0.009 66 / 0.92) 100%)",
        }}
      />

      <Container size="md" className="relative">
        <Reveal>
          <figure className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
            {/* The head of an illuminated page: the cross, then the kicker
                struck between two rules. */}
            <CrossMark size="md" tone="onDark" />

            <div className="mt-6 flex items-center gap-4">
              <span
                aria-hidden
                className="h-px w-10 rule-section rule-section-dark sm:w-16"
              />
              <p className="label shrink-0 text-white/70">{t("eyebrow")}</p>
              <span
                aria-hidden
                className="h-px w-10 rule-section rule-section-dark sm:w-16"
              />
            </div>

            <blockquote className="mt-12 sm:mt-14">
              {/*
                Set in the display serif, at rest, with a faint warm halo so the
                letterforms lift off the ground without being tinted by it. The
                quotation marks hang outside the measure the way they would in a
                printed lectionary.
              */}
              {/* `data-verse-text` is the hook for the Tamil metrics in
                  globals.css. The sizes here are set inline rather than through
                  `Heading`, so this line never picked up the `data-heading`
                  scale that steps the rest of the site's Tamil down, and it was
                  setting at the full Latin size in a script that needs less. */}
              <p
                data-verse-text=""
                className="text-balance font-display text-[1.75rem] font-normal leading-[1.34] tracking-[-0.012em] [text-shadow:0_2px_60px_var(--season-light-dark,oklch(0.702_0.18_38/0.28))] sm:text-4xl sm:leading-[1.3] lg:text-[3.25rem] lg:leading-[1.24]"
              >
                &ldquo;{localize(verse.text, locale)}&rdquo;
              </p>
            </blockquote>

            <figcaption className="mt-14 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3.5">
                <span
                  aria-hidden
                  className="h-px w-8 rule-section rule-section-dark"
                />
                <cite className="font-display text-base font-semibold not-italic text-accent-200">
                  {localize(verse.reference, locale)}
                </cite>
                <span
                  aria-hidden
                  className="h-px w-8 rule-section rule-section-dark"
                />
              </div>

              <time
                dateTime={verse.weekOf}
                className="numeric text-xs text-white/40"
              >
                {formatDate(verse.weekOf, locale)}
              </time>
            </figcaption>
          </figure>
        </Reveal>
      </Container>
    </section>
  );
}
