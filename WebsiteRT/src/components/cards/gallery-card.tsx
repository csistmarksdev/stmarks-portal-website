import { ArrowUpRight, ImageIcon } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Card, CardChip } from "@/components/ui/card";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/date";
import { localize } from "@/lib/localize";
import { cn } from "@/lib/utils";
import type { GalleryAlbum } from "@/types/content";

export interface GalleryCardProps {
  album: GalleryAlbum;
  locale: Locale;
  className?: string;
  /**
   * Cover framing. `fill` drops the intrinsic ratio so the card takes its
   * height from the grid row instead — used by the bento layout on the home
   * page, where cards span differing numbers of rows.
   */
  ratio?: "square" | "portrait" | "landscape" | "fill";
}

const RATIOS = {
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  fill: "h-full",
} as const;

/**
 * An album cover. Unlike the other cards this one is all media — the caption
 * sits over the photograph, so the surface itself is the image.
 */
export async function GalleryCard({
  album,
  locale,
  className,
  ratio = "landscape",
}: GalleryCardProps) {
  const t = await getTranslations("common");

  const title = localize(album.title, locale);

  return (
    <Card
      as="article"
      variant="solid"
      padded="none"
      interactive
      className={cn(
        "overflow-hidden bg-sand-200 ring-0",
        RATIOS[ratio],
        className,
      )}
    >
      <Image
        src={album.cover.url}
        alt={localize(album.cover.alt, locale)}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover/card:scale-[1.06]"
      />

      {/* Two stops rather than three: the caption needs a deep foot, but the
          photograph should stay untinted through the middle. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-sand-950/90 via-sand-950/20 to-transparent transition-opacity duration-500 group-hover/card:from-sand-950/95"
      />

      <CardChip className="absolute right-4 top-4">
        <ImageIcon aria-hidden className="size-3.5" />
        {t("photos", { count: album.photos.length })}
      </CardChip>

      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-white sm:text-xl">
              {title}
            </h3>

            <time
              dateTime={album.date}
              className="numeric mt-2 block text-xs text-white/70"
            >
              {formatDate(album.date, locale)}
            </time>
          </div>

          {/* Slides up into place on hover, so the still card stays quiet. */}
          <span
            aria-hidden
            className="grid size-10 shrink-0 translate-y-2 place-items-center rounded-full bg-white/15 text-white opacity-0 ring-1 ring-white/25 backdrop-blur-md transition-all duration-500 ease-[var(--ease-out-expo)] group-hover/card:translate-y-0 group-hover/card:opacity-100"
          >
            <ArrowUpRight className="size-5" />
          </span>
        </div>
      </div>

      {/*
        Covers the whole card as a single tab stop. A `::after` on a link
        inside the caption would only span the caption block, since that
        block is itself absolutely positioned.
      */}
      <Link
        href={ROUTES.album(album.slug)}
        className="absolute inset-0 z-10 rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <span className="sr-only">{title}</span>
      </Link>
    </Card>
  );
}
