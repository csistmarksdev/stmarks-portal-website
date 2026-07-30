import { ArrowUpRight, CalendarClock } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import { cn } from "@/lib/utils";
import type { Fellowship } from "@/types/content";

export interface FellowshipCardProps {
  fellowship: Fellowship;
  locale: Locale;
  className?: string;
}

/**
 * A fellowship, as a single full-bleed plate.
 *
 * The photograph is the card — there is no body panel. Only the essentials ride
 * the foot of the image: the name, and one quiet meta line carrying when the
 * fellowship gathers and how many belong to it. A deep foot scrim keeps that
 * copy legible over any banner; everything else is withheld so a wall of these
 * reads as a gallery of ministries rather than a grid of data.
 */
export async function FellowshipCard({
  fellowship,
  locale,
  className,
}: FellowshipCardProps) {
  const [t, tCommon] = await Promise.all([
    getTranslations("fellowships"),
    getTranslations("common"),
  ]);

  const name = localize(fellowship.name, locale);
  const schedule = localize(fellowship.schedule, locale);

  return (
    <Card
      as="article"
      variant="solid"
      padded="none"
      interactive
      className={cn(
        "window-arch relative aspect-[4/5] overflow-hidden bg-sand-200",
        className,
      )}
    >
      <Image
        src={fellowship.banner.url}
        alt={localize(fellowship.banner.alt, locale)}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover/card:scale-[1.05]"
      />

      {/* Foot scrim only — the middle of the photograph stays untinted. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-sand-950/92 via-sand-950/25 to-transparent transition-opacity duration-500 group-hover/card:from-sand-950/96"
      />

      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 font-display text-xl font-semibold leading-snug tracking-tight text-white text-balance sm:text-2xl">
            {name}
          </h3>

          {/* Always visible in the foot, clear of the arched corners; nudges
              on hover. */}
          <span
            aria-hidden
            className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md transition-all duration-500 ease-[var(--ease-out-expo)] group-hover/card:bg-white/25 sm:size-10"
          >
            <ArrowUpRight className="size-4 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/card:-translate-y-0.5 group-hover/card:translate-x-0.5 sm:size-5" />
          </span>
        </div>

        {/* One minimal meta line: when it gathers, and its size. */}
        <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/75">
          <CalendarClock
            aria-hidden
            className="size-3.5 shrink-0 text-accent-300"
          />
          <span>{schedule}</span>
          {fellowship.memberCount ? (
            <>
              <span aria-hidden className="text-white/35">
                ·
              </span>
              <span className="numeric">
                {t("membersLabel", { count: fellowship.memberCount })}
              </span>
            </>
          ) : null}
        </p>
      </div>

      {/* The whole plate is the control. */}
      <Link
        href={ROUTES.fellowship(fellowship.slug)}
        className="window-arch absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <span className="sr-only">
          {tCommon("learnMore")}: {name}
        </span>
      </Link>
    </Card>
  );
}
