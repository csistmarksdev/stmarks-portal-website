"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";

import { useHeroUnderHeader } from "@/hooks/use-hero-under-header";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * A chapter's opening: its photographs as a slideshow with pagination.
 *
 * This replaced a hero that locked the page and panned a strip of photographs
 * sideways as the reader scrolled. That made every chapter several screens
 * long, held the reader in place, and (at one frame per chapter, which is what
 * it had been cut back to) showed nothing at all. Now (church request,
 * 22 Nov 2026) the hero is an ordinary screen: the photographs cross-fade on
 * their own and the reader can page through them with the dots, the arrows or
 * a swipe.
 *
 * - Auto-advances every `INTERVAL_MS`, only while the hero is on screen and the
 *   tab is visible, with a pause button (WCAG 2.2.2: anything that moves on its
 *   own for more than five seconds must be pausable).
 * - With reduced motion it does not advance by itself; the controls still work.
 * - In Simple mode the photographs and the controls are hidden by
 *   `[data-hero-photos]` in globals.css, and the title stands on its own.
 * - Photographs load one ahead of the one showing, not all at once.
 *
 * Kept as `PinnedHero` with its old props so the eight chapters that use it
 * through `PageHero` need no change; `direction` is accepted and ignored.
 */

const INTERVAL_MS = 5000;
const FADE_MS = 900;
const SWIPE_PX = 50;

export interface PinnedHeroProps {
  /** The section's photographs, in folder order. */
  images: string[];
  /** No longer used; kept so callers do not change. */
  direction?: "left" | "right";
  /** Fetch the first photograph with priority. */
  priority?: boolean;
  /** Cap on photographs. Omitted, every photograph in the folder is used. */
  maxFrames?: number;
  /** Marks the variant for the CSS in `globals.css`. */
  variant: "page" | "section";
  /** Classes for the hero frame itself - ground, height, padding, alignment. */
  frameClassName?: string;
  /** Scrims and copy, laid over the photography. */
  children: ReactNode;
}

export function PinnedHero({
  images,
  priority = false,
  maxFrames,
  variant,
  frameClassName,
  children,
}: PinnedHeroProps) {
  const t = useTranslations("common");
  const sectionRef = useRef<HTMLElement>(null);
  useHeroUnderHeader(sectionRef);

  const reducedMotion = useReducedMotion();

  const frames =
    maxFrames === undefined ? images : images.slice(0, Math.max(1, maxFrames));
  const count = frames.length;
  const multiple = count > 1;

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  /** Bumped by every manual change, so the auto-advance timer starts over. */
  const [touched, setTouched] = useState(0);
  /** Photographs that have been asked for: shown, or next in line. */
  const [requested, setRequested] = useState<Set<number>>(
    () => new Set(multiple ? [0, 1] : [0]),
  );

  const go = useCallback(
    (index: number) => {
      const next = ((index % count) + count) % count;
      setActive(next);
      setRequested((current) => {
        if (current.has(next) && current.has((next + 1) % count)) return current;
        const updated = new Set(current);
        updated.add(next);
        updated.add((next + 1) % count);
        return updated;
      });
    },
    [count],
  );

  const goManually = (index: number) => {
    go(index);
    setTouched((n) => n + 1);
  };

  // Only run the slideshow while it can be seen.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || !multiple) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [multiple]);

  useEffect(() => {
    const update = () => setTabVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  const running = multiple && !paused && !reducedMotion && onScreen && tabVisible;

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => go(active + 1), INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [running, active, go, touched]);

  // Swipe: a horizontal drag of more than SWIPE_PX pages the slideshow.
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse") return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || !multiple) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
    goManually(active + (dx < 0 ? 1 : -1));
  };

  return (
    <section
      ref={sectionRef}
      data-hero-frame
      data-hero-variant={variant}
      className={cn(frameClassName, multiple && "touch-pan-y")}
      onPointerDown={multiple ? onPointerDown : undefined}
      onPointerUp={multiple ? onPointerUp : undefined}
      onPointerCancel={() => (swipeStart.current = null)}
    >
      <div
        aria-hidden
        // The photographs - hidden in Simple mode, see globals.css.
        data-hero-photos
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {frames.map((image, index) =>
          requested.has(index) ? (
            <Image
              key={image}
              src={image}
              alt=""
              fill
              priority={priority && index === 0}
              sizes="100vw"
              className="object-cover transition-opacity ease-in-out"
              style={{
                opacity: index === active ? 1 : 0,
                transitionDuration: `${FADE_MS}ms`,
              }}
            />
          ) : null,
        )}
      </div>

      {/* The scrim over the photography, weighted to where the copy sits. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
      </div>

      <div className="w-full">{children}</div>

      {multiple ? (
        <div
          // Hidden with the photographs in Simple mode.
          data-hero-photos
          role="group"
          aria-label={t("heroPhotos")}
          /*
            On a phone: no arrows (swipe and the dots do it), left-aligned, and
            clear of the back-to-top button in the bottom-right corner - nine
            44px controls do not fit a 390px screen.
          */
          className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-start gap-0.5 pl-2 pr-16 sm:bottom-6 sm:justify-center sm:gap-1 sm:px-4"
        >
          <button
            type="button"
            onClick={() => goManually(active - 1)}
            aria-label={t("previousPhoto")}
            className="hidden size-11 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:grid"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>

          <ol className="flex items-center">
            {frames.map((image, index) => (
              <li key={image}>
                <button
                  type="button"
                  onClick={() => goManually(index)}
                  aria-label={t("heroPhoto", { index: index + 1, count })}
                  aria-current={index === active ? "true" : undefined}
                  // 44px target around a small visible dot.
                  className="group grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-white"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "block h-2 rounded-full transition-all duration-300",
                      index === active
                        ? "w-6 bg-white"
                        : "w-2 bg-white/45 group-hover:bg-white/80",
                    )}
                  />
                </button>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={() => goManually(active + 1)}
            aria-label={t("nextPhoto")}
            className="hidden size-11 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:grid"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>

          {reducedMotion ? null : (
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? t("playSlideshow") : t("pauseSlideshow")}
              aria-pressed={paused}
              className="ml-1 grid size-11 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {paused ? (
                <Play aria-hidden className="size-4" />
              ) : (
                <Pause aria-hidden className="size-4" />
              )}
            </button>
          )}

          <span className="sr-only" aria-live="polite">
            {t("heroPhoto", { index: active + 1, count })}
          </span>
        </div>
      ) : null}
    </section>
  );
}
