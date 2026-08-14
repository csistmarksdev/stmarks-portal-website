import { ArrowRight, Clock, MapPin } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatTime, getDateParts } from "@/lib/date";
import { localize } from "@/lib/localize";
import type { ChurchEvent } from "@/types/content";

export interface FeaturedEventCardProps {
  event: ChurchEvent;
  locale: Locale;
}

/**
 * The next gathering, given the weight of a lead article: a wide two-panel band
 * with the photograph on one side and, on the other, the date struck as a
 * tablet, the title in the display serif over a gilded rule, and the essentials
 * beneath. Rectangular by design — the arch belongs to the sanctuary imagery,
 * not to the calendar.
 */
export async function FeaturedEventCard({
  event,
  locale,
}: FeaturedEventCardProps) {
  const [t, tCommon] = await Promise.all([
    getTranslations("events"),
    getTranslations("common"),
  ]);

  const title = localize(event.title, locale);
  const { day, month, year } = getDateParts(event.startDate, locale);

  return (
    <article className="group relative isolate overflow-hidden rounded-card bg-sand-950 text-white shadow-card ring-1 ring-white/10">
      <div className="grid lg:grid-cols-2">
        <div className="relative min-h-[15rem] overflow-hidden lg:min-h-[27rem]">
          {event.image ? (
            <Image
              src={event.image.url}
              alt={localize(event.image.alt, locale)}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 bg-brand-800"
            />
          )}

          {/* Blends the photograph into the dark content panel — up from the
              foot on mobile, across to the panel on desktop. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-sand-950/85 via-sand-950/10 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-sand-950/10 lg:to-sand-950"
          />

          {/* Date, struck as a calendar tablet. */}
          <div className="absolute left-6 top-6 flex flex-col items-center rounded-2xl bg-sand-950/55 px-4 py-3 text-center ring-1 ring-white/20 backdrop-blur-md">
            <span className="numeric font-display text-3xl font-semibold leading-none">
              {day}
            </span>
            <span className="mt-1 text-[0.65rem] uppercase tracking-[0.14em] text-white/80">
              {month}
            </span>
          </div>
        </div>

        <div className="relative flex flex-col justify-center gap-5 p-8 sm:p-10 lg:p-14">
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-6 shrink-0 bg-white/40" />
            <span className="label text-white/70">{t("featured")}</span>
          </div>

          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
            {title}
          </h2>

          <span aria-hidden className="h-px w-20 rule-section" />

          <p className="max-w-xl leading-relaxed text-white/75">
            {localize(event.summary, locale)}
          </p>

          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/70">
            <div className="flex items-center gap-2.5">
              <dt className="sr-only">{t("details.when")}</dt>
              <Clock aria-hidden className="size-4 shrink-0 text-accent-300" />
              <dd className="numeric">
                {formatTime(event.startDate, locale)} · {month} {year}
              </dd>
            </div>

            <div className="flex items-center gap-2.5">
              <dt className="sr-only">{t("details.where")}</dt>
              <MapPin aria-hidden className="size-4 shrink-0 text-accent-300" />
              <dd>{localize(event.location, locale)}</dd>
            </div>
          </dl>

          <div className="mt-2">
            <Button asChild variant="accent" size="lg">
              <Link href={ROUTES.event(event.slug)}>
                {tCommon("viewDetails")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
