"use client";

import type { ImageAsset } from "@portal/shared";
import { ImageOffIcon } from "lucide-react";
import { useState } from "react";

import { thumbnailUrl } from "@/lib/image";
import { cn } from "@/lib/utils";

/**
 * The picture at the top of a record card in a collection list.
 *
 * A plain `<img>`, not `next/image`, matching the media library and picker. The
 * API's hostname is not known at build time — localhost while developing, a LAN
 * address from a phone, a domain in production — and `next/image` resolves
 * `remotePatterns` when the CMS is built, so the optimiser rejects exactly the
 * hosts this is opened from most often.
 */
export function CardBanner({
  image,
  /** Named so the empty state can say what is missing, e.g. "cover". */
  noun = "image",
  className,
}: {
  image?: ImageAsset;
  noun?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!image?.url) {
    /*
     * Absence is drawn, not skipped. The banner is what the Website puts at the
     * top of this record's page, so a record without one is a real gap someone
     * should notice here — and a card silently missing its picture reads as a
     * loading bug rather than as missing content.
     */
    return (
      <div
        className={cn(
          "grid aspect-[16/9] w-full place-items-center rounded-t-3xl bg-muted/60",
          className,
        )}
      >
        <span className="flex flex-col items-center gap-1.5 text-muted-foreground">
          <ImageOffIcon className="size-5" />
          <span className="text-[11px]">No {noun} yet</span>
        </span>
      </div>
    );
  }

  // The thumbnail on the first attempt, the original once that has 404'd.
  const src = (!failed && thumbnailUrl(image.url)) || image.url;

  return (
    <div
      className={cn("aspect-[16/9] w-full overflow-hidden rounded-t-3xl bg-muted", className)}
      /*
       * The stored blur preview, painted underneath. It is a few hundred bytes
       * already in the record, so it costs no request and gives the card its
       * colour immediately instead of a grey hole that pops.
       */
      style={
        image.blurDataURL
          ? {
              backgroundImage: `url(${image.blurDataURL})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={image.alt?.en ?? ""}
        className="size-full object-cover"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
