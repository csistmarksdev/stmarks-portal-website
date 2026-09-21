"use client";

import { useTranslations } from "next-intl";

import { CrossMark } from "@/components/common/ornament";
import { useLiturgicalSeason } from "@/components/common/liturgical-season";
import type { Season } from "@/lib/liturgical-year";
import { scriptureKey } from "@/lib/season-scripture";
import { cn } from "@/lib/utils";

/**
 * The season's verse, struck as the head of an illuminated page.
 *
 * The same device as `VerseOfWeek` on the home page - cross, gilded rules,
 * display serif, the reference cited beneath - at a fraction of the scale,
 * because this is a closing word rather than a section of its own. Anywhere it
 * appears it should read as the last thing on the page, not as another thing
 * competing on it.
 *
 * Deliberately not wired to the Portal API like the weekly verse is. This text
 * has to be present when the API is the thing that just failed, which is
 * precisely when the error boundary renders it - so it comes from the message
 * files, which are in the bundle.
 */
export function SeasonScripture({
  /**
   * The season as the server computed it. The client re-reads its own once
   * mounted, which is what honours `?season=`; this only sets the first paint,
   * so the verse never visibly swaps under the reader.
   */
  season: serverSeason = "ordinary",
  tone = "default",
  className,
}: {
  season?: Season;
  tone?: "default" | "onDark";
  className?: string;
}) {
  const season = useLiturgicalSeason(serverSeason);
  const t = useTranslations("scripture");

  const key = scriptureKey(season);
  const onDark = tone === "onDark";

  return (
    <figure
      className={cn(
        "mx-auto flex max-w-xl flex-col items-center text-center",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className={cn("h-px w-10 rule-gild sm:w-14", onDark && "opacity-70")}
        />
        <CrossMark size="sm" tone={onDark ? "onDark" : "sacred"} />
        <span
          aria-hidden
          className={cn(
            "h-px w-10 rotate-180 rule-gild sm:w-14",
            onDark && "opacity-70",
          )}
        />
      </div>

      <blockquote className="mt-6">
        {/*
          `data-verse-text` is the hook for the Tamil metrics in `globals.css`.
          The script needs more leading than Fraunces does at the same size, and
          setting it here inline - as the weekly verse originally did - is how a
          line of Tamil ends up at the full Latin size with its vowel signs
          colliding.

          The value matters: `closing` takes the small end of that scale.
          Sharing the bare attribute with the home page's weekly verse meant
          sharing its display curve too, which set this line at 38px.
        */}
        <p
          data-verse-text="closing"
          className={cn(
            "text-balance font-display text-[1.0625rem] font-normal italic leading-[1.6] sm:text-[1.1875rem]",
            onDark ? "text-white/85" : "text-[var(--foreground)]",
          )}
        >
          &ldquo;{t(`${key}.text`)}&rdquo;
        </p>
      </blockquote>

      <figcaption className="mt-4">
        <cite
          className={cn(
            "font-display text-[0.8125rem] font-semibold not-italic tracking-wide",
            onDark ? "text-accent-200" : "text-sacred",
          )}
        >
          {t(`${key}.reference`)}
        </cite>
      </figcaption>
    </figure>
  );
}
