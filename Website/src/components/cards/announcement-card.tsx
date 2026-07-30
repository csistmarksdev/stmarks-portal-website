import { Pin } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/date";
import { localize } from "@/lib/localize";
import { cn } from "@/lib/utils";
import type { Announcement } from "@/types/content";

export interface AnnouncementCardProps {
  announcement: Announcement;
  locale: Locale;
  /** `featured` is the larger treatment used for the pinned notice. */
  variant?: "default" | "featured";
  className?: string;
}

/**
 * A notice from the church office.
 *
 * The pinned notice takes the inverted surface so it reads as the one thing
 * to look at first; the rest are plain cards in a grid.
 */
export async function AnnouncementCard({
  announcement,
  locale,
  variant = "default",
  className,
}: AnnouncementCardProps) {
  const t = await getTranslations("announcements");

  const title = localize(announcement.title, locale);
  const body = localize(announcement.body, locale);
  const date = formatDate(announcement.publishedAt, locale);

  if (variant === "featured") {
    return (
      <Card
        as="article"
        variant="dark"
        padded="none"
        className={cn("overflow-hidden", className)}
      >
        {/* Warm bloom from the top corner, so the dark card is not a slab. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(70% 100% at 0% 0%, oklch(0.508 0.105 65 / 0.35), transparent 65%)",
          }}
        />

        <div className="relative p-8 sm:p-12">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Badge variant="onDark" size="md">
              <Pin aria-hidden />
              {t("pinned")}
            </Badge>

            <time
              dateTime={announcement.publishedAt}
              className="numeric text-xs text-white/60"
            >
              {date}
            </time>
          </div>

          <h3 className="mt-6 max-w-3xl font-display text-2xl font-semibold leading-snug tracking-tight text-white sm:text-4xl">
            {title}
          </h3>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            {body}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      as="article"
      variant="solid"
      padded="none"
      className={cn("flex h-full flex-col overflow-hidden", className)}
    >
      <CardBody>
        <time
          dateTime={announcement.publishedAt}
          className="numeric label text-accent-700"
        >
          {date}
        </time>

        {/* Nothing to click through to, so the title must not colour on hover
            the way a linked card's does. */}
        <CardTitle className="mt-3 line-clamp-2 text-lg group-hover/card:text-[var(--foreground)]">
          {title}
        </CardTitle>

        <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
          {body}
        </p>
      </CardBody>
    </Card>
  );
}
