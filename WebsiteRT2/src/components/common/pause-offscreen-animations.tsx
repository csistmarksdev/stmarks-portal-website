"use client";

import { useEffect } from "react";

import { usePathname } from "@/i18n/navigation";

/**
 * Pauses the looping CSS animations of every chapter nowhere near the screen.
 *
 * The page carries a few dozen infinite CSS animations - the constellation's
 * twinkling stars, the dust motes in the nave, the verse's slow bloom, the
 * scroll cue - and a browser keeps ticking all of them on every frame, on
 * screen or not, restyling their elements each time. Profiled on a throttled
 * phone, that was a constant restyle of ~84 elements per frame anywhere on the
 * page, for animations nobody could see.
 *
 * Done through the Web Animations API rather than a stylesheet rule, and that
 * is measured, not taste: the first version toggled a `data-offscreen`
 * attribute matched by `[data-offscreen] *`, and every toggle invalidated the
 * style of the entire chapter - 600-800 elements, up to 200ms on a throttled
 * phone, landing exactly as the reader crossed from one chapter to the next.
 * `Animation.pause()` changes no style and no attribute.
 *
 * Only *infinite* animations are touched. An entrance animation finishes on
 * its own and is never left frozen half-way.
 */
export function PauseOffscreenAnimations() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document.getAnimations !== "function") return;

    const targets = [
      ...document.querySelectorAll<HTMLElement>("main > *, footer"),
    ];
    if (targets.length === 0) return;

    const looping = (root: Element) =>
      document.getAnimations().filter((animation) => {
        if (!(animation instanceof CSSAnimation)) return false;
        const target = (animation.effect as KeyframeEffect | null)?.target;
        return (
          target instanceof Element &&
          root.contains(target) &&
          animation.effect?.getComputedTiming().iterations === Infinity
        );
      });

    /** Chapters currently out of range, so late starters can be caught. */
    const offscreen = new Set<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) offscreen.delete(entry.target);
          else offscreen.add(entry.target);

          for (const animation of looping(entry.target)) {
            if (entry.isIntersecting) {
              if (animation.playState === "paused") animation.play();
            } else if (animation.playState === "running") {
              animation.pause();
            }
          }
        }
      },
      // Half a screen of margin: running again before any of it is visible.
      { rootMargin: "50% 0px" },
    );

    for (const target of targets) observer.observe(target);

    /*
     * And animations that start *after* their chapter was found off screen.
     *
     * The observer only looks when a chapter crosses the margin, and a looping
     * animation often starts later than that - its class arrives with
     * hydration, or a section mounts its decoration once its data loads - so
     * one inside a chapter already counted as off screen ran on regardless.
     * Measured: on some loads 52 were left running. `animationstart` bubbles,
     * so one listener catches every one of them as it begins.
     */
    const onStart = (event: AnimationEvent) => {
      const element = event.target as Element | null;
      if (!element) return;
      const chapter = targets.find((target) => target.contains(element));
      if (!chapter || !offscreen.has(chapter)) return;

      for (const animation of element.getAnimations()) {
        if (
          animation instanceof CSSAnimation &&
          animation.animationName === event.animationName &&
          animation.effect?.getComputedTiming().iterations === Infinity &&
          animation.playState === "running"
        ) {
          animation.pause();
        }
      }
    };

    document.addEventListener("animationstart", onStart);

    return () => {
      document.removeEventListener("animationstart", onStart);
      observer.disconnect();
      for (const target of targets) {
        for (const animation of looping(target)) {
          if (animation.playState === "paused") animation.play();
        }
      }
    };
  }, [pathname]);

  return null;
}
