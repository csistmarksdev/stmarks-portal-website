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
 * The pause between sections. Everything here is light and type — no
 * photography, deliberately, because every hero on the site now carries
 * imagery and this section earns its weight by withholding it.
 *
 * Depth comes from stacked layers instead: a drifting brass bloom, film grain,
 * and a vignette that closes the edges — and the scripture is centred and
 * struck between gilded rules like the head of an illuminated page.
 */
export async function VerseOfWeek() {
  const [t, verse] = await Promise.all([
    getTranslations("home.verse"),
    getWeeklyVerse(),
  ]);

  const locale = (await getLocale()) as Locale;

  return (
    <section className="relative isolate overflow-hidden bg-sand-950 py-28 text-white sm:py-36 lg:py-44">
      {/* Brass bloom, drifting. */}
      <div
        aria-hidden
        className="verse-bloom pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(55% 60% at 22% 18%, oklch(0.508 0.166 34 / 0.42), transparent 68%), radial-gradient(45% 55% at 82% 82%, oklch(0.586 0.196 18 / 0.34), transparent 70%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      {/* Closes the edges so the bloom reads as light, not as a gradient band. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(115% 95% at 50% 50%, transparent 38%, oklch(0.158 0.009 66 / 0.9) 100%)",
        }}
      />

      <Container size="md" className="relative">
        <Reveal>
          <figure className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
            {/* Kicker: the cross struck between two gilded rules, centred like
                the head of an illuminated page. */}
            <div className="flex items-center gap-3.5">
              <span
                aria-hidden
                className="h-px w-10 rule-gild sm:w-16"
              />
              <CrossMark size="sm" tone="onDark" />
              <p className="label shrink-0 text-accent-300/90">{t("eyebrow")}</p>
              <span
                aria-hidden
                className="h-px w-10 rotate-180 rule-gild sm:w-16"
              />
            </div>

            <blockquote className="mt-10 sm:mt-12">
              {/* A faint brass halo lifts the type off the ground without
                  tinting it. */}
              <p className="text-balance font-display text-[1.75rem] leading-[1.3] tracking-[-0.015em] [text-shadow:0_2px_60px_oklch(0.702_0.18_38/0.28)] sm:text-4xl lg:text-[3.25rem] lg:leading-[1.2]">
                &ldquo;{localize(verse.text, locale)}&rdquo;
              </p>
            </blockquote>

            <figcaption className="mt-12 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-px w-8 rule-gild" />
                <cite className="font-display text-base font-semibold not-italic text-accent-200">
                  {localize(verse.reference, locale)}
                </cite>
                <span aria-hidden className="h-px w-8 rotate-180 rule-gild" />
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
