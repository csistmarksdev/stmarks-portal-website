"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export interface HeroSlideshowProps {
  /** Image URLs, shown in order and looped. */
  images: string[];
  /** How long each slide holds, in milliseconds. */
  interval?: number;
}

/** Seconds a crossfade takes. Slides overlap for this long. */
const FADE = 1.4;

/**
 * Crossfading backdrop for {@link PageHero}, with pager dots.
 *
 * The imagery is decorative - the hero's heading carries the meaning - so the
 * picture layer is hidden from assistive tech and every image gets an empty
 * alt. The dots are not decorative: they report how many slides exist and let
 * anyone jump between them, so they stay in the accessibility tree.
 *
 * Under `prefers-reduced-motion` the images settle on the first frame and the
 * dots become the only way to move between them.
 */
export function HeroSlideshow({ images, interval = 6000 }: HeroSlideshowProps) {
  const t = useTranslations("common");
  const shouldReduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  /*
   * The hero only advances while it is actually on screen.
   *
   * Left ungated the slideshow runs for the whole visit: every dwell mounts a
   * new full-viewport image and crossfades it over the outgoing one while a
   * seconds-long push-in scales it. That is continuous decode, paint and
   * compositing for a picture nobody is looking at, and it competes with the
   * scroll for the main thread - felt as stutter far down the page, in the
   * sections a reader has actually scrolled to. Parked out of view the timer
   * stops, the running animations finish, and the hero costs nothing until it
   * is scrolled back to.
   */
  const frameRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      // A little margin so the next slide is already under way by the time the
      // hero is scrolled back into sight, rather than visibly starting late.
      { rootMargin: "128px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Keyed on `index`, so picking a dot restarts the dwell rather than cutting
  // it short mid-slide.
  useEffect(() => {
    if (shouldReduceMotion || images.length < 2 || !inView) return;

    const id = window.setTimeout(() => {
      setIndex((current) => (current + 1) % images.length);
    }, interval);

    return () => window.clearTimeout(id);
  }, [index, images.length, interval, shouldReduceMotion, inView]);

  if (images.length === 0) return null;

  return (
    <>
      <div
        ref={frameRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {shouldReduceMotion ? (
          <Image
            src={images[index]}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <AnimatePresence initial={false}>
            <motion.div
              key={index}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: FADE, ease: "easeInOut" }}
            >
              {/* Slow push-in, so a held frame never looks like a still. */}
              <motion.div
                className="absolute inset-0"
                initial={{ scale: 1.06 }}
                animate={{ scale: 1.16 }}
                transition={{ duration: interval / 1000 + FADE, ease: "linear" }}
              >
                <Image
                  src={images[index]}
                  alt=""
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className="object-cover"
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {images.length > 1 ? (
        <nav
          aria-label={t("heroSlides")}
          /*
            Above the scrims, and clear of the centred scroll cue: stacked
            over it on mobile, alongside it at the container edge from `sm`.
          */
          className={cn(
            "absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5",
            "sm:bottom-8 sm:left-auto sm:right-8 sm:translate-x-0 lg:right-12",
          )}
        >
          {images.map((image, i) => {
            const current = i === index;

            return (
              <button
                key={image}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={t("goToSlide", {
                  index: i + 1,
                  total: images.length,
                })}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  // The active dot stretches into a pill, so the position
                  // reads at a glance without relying on colour alone.
                  current
                    ? "w-6 bg-white"
                    : "w-2 bg-white/40 hover:bg-white/70",
                )}
              />
            );
          })}
        </nav>
      ) : null}
    </>
  );
}
