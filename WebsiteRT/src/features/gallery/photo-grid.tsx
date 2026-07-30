"use client";

import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import { cn } from "@/lib/utils";
import type { GalleryPhoto, GalleryVideo } from "@/types/content";

export interface PhotoGridProps {
  photos: GalleryPhoto[];
  locale: Locale;
  className?: string;
}

type Provider = "file" | "youtube" | "vimeo";

/** Which player an item needs — honour an explicit provider, else read the URL. */
function resolveProvider(video: GalleryVideo): Provider {
  if (video.provider) return video.provider;
  if (/(?:youtube\.com|youtu\.be)/i.test(video.url)) return "youtube";
  if (/vimeo\.com/i.test(video.url)) return "vimeo";
  return "file";
}

function youTubeId(url: string): string | null {
  return url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/)?.[1] ?? null;
}

function vimeoId(url: string): string | null {
  return url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] ?? null;
}

/** Autoplaying embed URL for a hosted clip; falls back to the raw URL. */
function embedSrc(video: GalleryVideo, provider: Provider): string {
  if (provider === "youtube") {
    const id = youTubeId(video.url);
    return id
      ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`
      : video.url;
  }
  if (provider === "vimeo") {
    const id = vimeoId(video.url);
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : video.url;
  }
  return video.url;
}

/**
 * Masonry-ish media grid with a lightbox that pages through both photographs
 * and videos, the way Google Photos mixes stills and clips. Video items carry a
 * play badge in the grid; in the lightbox a file clip plays inline through the
 * HTML5 player and a YouTube/Vimeo link is embedded.
 *
 * Keyboard: arrow keys move between items, Escape closes (handled by Radix).
 */
export function PhotoGrid({ photos, locale, className }: PhotoGridProps) {
  const t = useTranslations("gallery.lightbox");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const isOpen = activeIndex !== null;

  const goTo = useCallback(
    (direction: 1 | -1) => {
      setActiveIndex((current) => {
        if (current === null) return current;
        return (current + direction + photos.length) % photos.length;
      });
    },
    [photos.length],
  );

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goTo(1);
      if (event.key === "ArrowLeft") goTo(-1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, goTo]);

  const activePhoto = activeIndex !== null ? photos[activeIndex] : null;
  const activeVideo = activePhoto?.video ?? null;
  const activeProvider = activeVideo ? resolveProvider(activeVideo) : null;
  /*
   * Captions are `LocalizedTextOptional`, so either language may be missing —
   * an editor who writes only English should still see it rather than nothing.
   */
  const caption = activePhoto?.caption
    ? (locale === "ta"
        ? activePhoto.caption.ta || activePhoto.caption.en
        : activePhoto.caption.en || activePhoto.caption.ta
      )?.trim() || null
    : null;

  return (
    <>
      <ul
        className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4",
          className,
        )}
      >
        {photos.map((photo, index) => {
          const alt = localize(photo.image.alt, locale);

          return (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={
                  photo.video ? `${t("playVideo")}: ${alt}` : undefined
                }
                className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-sand-200"
              >
                <Image
                  src={photo.image.url}
                  alt={photo.video ? "" : alt}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-110"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-sand-950/0 transition-colors duration-300 group-hover:bg-sand-950/20"
                />

                {/* Play badge marks a video, echoing YouTube / Google Photos. */}
                {photo.video ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 grid place-items-center"
                  >
                    <span className="grid size-12 place-items-center rounded-full bg-sand-950/55 text-white ring-1 ring-white/30 backdrop-blur-sm transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:scale-110 sm:size-14">
                      <Play className="size-5 translate-x-0.5 fill-current sm:size-6" />
                    </span>
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => !open && setActiveIndex(null)}
      >
        {activePhoto ? (
          <DialogContent
            showClose={false}
            /* Full-bleed: reset the centred-card positioning to a viewport-
               filling column so the viewer covers the screen like a photos app. */
            className="left-0 top-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col"
            aria-describedby={undefined}
          >
            <DialogTitle className="sr-only">
              {`${activeVideo ? t("video") : t("label")}: ${localize(activePhoto.image.alt, locale)}`}
            </DialogTitle>

            {/* Top bar: counter and close, above the stage. */}
            <div className="relative z-20 flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <p aria-live="polite" className="text-sm font-medium text-white/80">
                {t("counter", {
                  current: (activeIndex ?? 0) + 1,
                  total: photos.length,
                })}
              </p>

              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                aria-label={t("close")}
                className="grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>

            {/* Stage: the media fills the screen, letterboxed over the dark
                backdrop; a file clip and a YouTube/Vimeo embed both play here. */}
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6 sm:px-16">
              {activeVideo && activeProvider === "file" ? (
                <video
                  // Remount on navigation so the previous clip stops and the
                  // new one autoplays from the start.
                  key={activeIndex}
                  src={activeVideo.url}
                  poster={activePhoto.image.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-full max-w-full rounded-lg bg-black object-contain"
                />
              ) : activeVideo ? (
                <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-lg bg-black shadow-2xl">
                  <iframe
                    key={activeIndex}
                    src={embedSrc(activeVideo, activeProvider!)}
                    title={localize(activePhoto.image.alt, locale)}
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              ) : (
                <div className="relative mx-auto h-full w-full max-w-7xl">
                  <Image
                    key={activeIndex}
                    src={activePhoto.image.url}
                    alt={localize(activePhoto.image.alt, locale)}
                    fill
                    sizes="100vw"
                    priority
                    className="object-contain"
                  />
                </div>
              )}

              {photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => goTo(-1)}
                    aria-label={t("previous")}
                    className="absolute left-2 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:left-4 sm:size-12"
                  >
                    <ChevronLeft aria-hidden className="size-5 sm:size-6" />
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo(1)}
                    aria-label={t("next")}
                    className="absolute right-2 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:right-4 sm:size-12"
                  >
                    <ChevronRight aria-hidden className="size-5 sm:size-6" />
                  </button>
                </>
              ) : null}
            </div>

            {/* The caption an editor wrote in the Portal. It was stored and
                served all along without ever reaching the page — a field that
                changes nothing when filled in is worse than no field. */}
            {caption ? (
              <figcaption className="relative z-20 mx-auto w-full max-w-3xl px-4 pb-6 text-center text-sm leading-relaxed text-white/80 sm:px-6 sm:text-base">
                {caption}
              </figcaption>
            ) : null}
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
