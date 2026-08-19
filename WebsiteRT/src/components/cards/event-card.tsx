import { ArrowRight, Clock, MapPin } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardAction,
  CardBody,
  CardChip,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatTime, getDateParts, getEventStatus } from "@/lib/date";
import { localize } from "@/lib/localize";
import { cn } from "@/lib/utils";
import type { ChurchEvent } from "@/types/content";

export interface EventCardProps {
  event: ChurchEvent;
  locale: Locale;
  className?: string;
}

/**
 * An entry in the church calendar.
 *
 * The date rides on the media as a frosted chip rather than sitting in the
 * body, so a grid of events can still be scanned by date the way the earlier
 * ruled list was - the numerals stay on a common baseline across a row.
 */
export async function EventCard({ event, locale, className }: EventCardProps) {
  const [t, tCommon] = await Promise.all([
    getTranslations("events"),
    getTranslations("common"),
  ]);

  const title = localize(event.title, locale);
  const status = getEventStatus(event);
  const { day, month, year } = getDateParts(event.startDate, locale);
  const isPast = status === "past";

  return (
    <Card
      as="article"
      variant="solid"
      padded="none"
      interactive
      className={cn(
        "flex h-full flex-col overflow-hidden",
        // Past events recede but stay legible - this is the archive, not a
        // disabled control.
        isPast && "opacity-80 saturate-[0.6]",
        className,
      )}
    >
      {/* Image-forward: a tall photo carries the card, the essentials read off
          it as frosted overlays, and the details drop into the panel below. */}
      <div className="relative aspect-[4/5] shrink-0 overflow-hidden rounded-t-card bg-sand-200">
        {event.image ? (
          <Image
            src={event.image.url}
            alt={localize(event.image.alt, locale)}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover/card:scale-[1.06]"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 bg-brand-800"
          />
        )}

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-sand-950/92 via-sand-950/25 to-transparent"
        />

        {/* Date, set like a tear-off from a calendar. */}
        <CardChip className="numeric absolute left-4 top-4 flex-col gap-0 px-3.5 py-2 leading-none">
          <span className="font-display text-2xl font-semibold">{day}</span>
          <span className="mt-1 text-[0.625rem] uppercase tracking-[0.14em] text-white/80">
            {month}
          </span>
        </CardChip>

        {isPast ? (
          <CardChip className="label absolute right-4 top-4 py-1">
            {t("status.past")}
          </CardChip>
        ) : null}

        {/* Title + date-line, riding the foot of the photograph. */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <p className="numeric label text-white/70">
            {month} {year}
          </p>
          <CardTitle className="mt-2 line-clamp-2 text-white group-hover/card:text-white sm:text-2xl">
            {title}
          </CardTitle>
        </div>
      </div>

      <CardBody className="gap-0">
        <p className="line-clamp-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
          {localize(event.summary, locale)}
        </p>

        <dl className="mt-5 space-y-2 text-sm text-[var(--muted-foreground)]">
          <div className="flex items-center gap-2.5">
            <dt className="sr-only">{t("details.when")}</dt>
            <Clock aria-hidden className="size-4 shrink-0 text-accent-600" />
            <dd className="numeric">{formatTime(event.startDate, locale)}</dd>
          </div>

          <div className="flex items-start gap-2.5">
            <dt className="sr-only">{t("details.where")}</dt>
            <MapPin
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-accent-600"
            />
            <dd className="line-clamp-1">{localize(event.location, locale)}</dd>
          </div>
        </dl>

        <CardFooter className="border-t border-[var(--border)]">
          <CardAction>
            {tCommon("viewDetails")}
            <ArrowRight />
          </CardAction>
        </CardFooter>
      </CardBody>

      {/*
        The card lifts on hover, so the whole surface is the control. A
        `::after` on the title would not reach the media or the footer.
      */}
      <Link
        href={ROUTES.event(event.slug)}
        className="absolute inset-0 z-10 rounded-card focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span className="sr-only">{title}</span>
      </Link>
    </Card>
  );
}
