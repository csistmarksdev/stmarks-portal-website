"use client";

import { useEffect } from "react";

/**
 * Pinned stages without `position: sticky`, for iOS / iPadOS Safari 26+.
 *
 * That Safari gives its status bar and tab bar a soft, frosted edge over
 * whatever is scrolling behind them - unless a fixed or sticky element spans
 * the screen at that edge, when it paints the bar flat instead. Every pinned
 * stage on this site (the hero, the welcome sequence, the chapter scenes) is
 * a full-screen sticky element, so on that Safari each one is marked
 * `data-glass-pin` and pinned by a scroll-driven animation instead (see
 * `html[data-ios-glass]` in `globals.css`): it moves down exactly as far as
 * the page scrolls, from where sticky would have caught it to where sticky
 * would have let it go. On screen it is the same pin; to Safari it is ordinary
 * content.
 *
 * Those two scroll offsets are layout facts, so they are measured here and
 * handed to the stylesheet as `--pin-start`, `--pin-end` and `--pin-len` on
 * each stage, and measured again whenever anything on the page changes size
 * or a stage comes or goes. Does nothing anywhere else - `data-ios-glass` is
 * set before first paint by `lib/ios-glass.ts`.
 */
export function GlassPins() {
  useEffect(() => {
    if (!document.documentElement.hasAttribute("data-ios-glass")) return;

    let frame = 0;
    const observed = new Set<Element>();

    const measure = () => {
      frame = 0;
      const scrollY = window.scrollY;
      const root = document.documentElement;
      // The whole scroll range, for layers that follow the scroll end to end
      // (the header's scrim).
      root.style.setProperty(
        "--doc-scroll",
        `${Math.max(0, root.scrollHeight - root.clientHeight)}px`,
      );
      for (const stage of document.querySelectorAll<HTMLElement>(
        "[data-glass-pin]",
      )) {
        const parent = stage.parentElement;
        if (!parent) continue;
        watch(stage);
        watch(parent);

        // Where the stage sits with no pin applied: its box now, less however
        // far the animation has carried it at this scroll position.
        const shift = new DOMMatrixReadOnly(
          getComputedStyle(stage).transform === "none"
            ? undefined
            : getComputedStyle(stage).transform,
        ).m42;
        const start = stage.getBoundingClientRect().top + scrollY - shift;

        // Sticky lets go when the stage's foot meets its parent's content box.
        const style = getComputedStyle(parent);
        const parentBottom =
          parent.getBoundingClientRect().bottom +
          scrollY -
          parseFloat(style.paddingBottom) -
          parseFloat(style.borderBottomWidth);
        const length = Math.max(0, parentBottom - start - stage.offsetHeight);

        stage.style.setProperty("--pin-start", `${start}px`);
        stage.style.setProperty("--pin-end", `${start + length}px`);
        stage.style.setProperty("--pin-len", `${length}px`);
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    const resize = new ResizeObserver(schedule);
    const watch = (el: Element) => {
      if (observed.has(el)) return;
      observed.add(el);
      resize.observe(el);
    };

    // Stages mount and unmount as sections hydrate or switch between their
    // pinned and plain layouts.
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-glass-pin"],
    });

    watch(document.body);
    window.addEventListener("resize", schedule);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return null;
}
