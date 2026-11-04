"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, type ReactNode } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * The switching message stays at least this long, so it can be read and its
 * icon seen through one cycle of its animation - a fast page would otherwise
 * take it down before either.
 */
const SWITCHING_MIN_MS = 1200;
/** ...and no longer than this, however slowly the page's images arrive. */
const SWITCHING_MAX_MS = 2500;
/** Matches the fade on `html[data-switching-out]::after` in globals.css. */
const SWITCHING_FADE_MS = 320;

/**
 * Tells framer-motion itself about Simple mode.
 *
 * The animated sections ask `useReducedMotion` and render their still versions,
 * but some motion is framer's own - a menu opening, a panel entering - and
 * framer only reads the device setting. `reducedMotion="always"` makes it skip
 * every transform and layout animation, so Simple mode covers those too.
 */

export function MotionProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  /*
   * Takes down the "Switching to ..." message on the page a mode switch
   * reloaded into - see `setSimpleMode` and `html[data-switching]` in
   * globals.css. Waits for the page to finish loading, so the reader is handed
   * a finished page rather than one still assembling under the fade.
   */
  useEffect(() => {
    const root = document.documentElement;
    if (!root.dataset.switching) return;

    const timers: number[] = [];
    const shownAt = performance.now();

    let hiding = false;
    const hide = () => {
      if (hiding) return;
      hiding = true;
      const wait = Math.max(0, SWITCHING_MIN_MS - (performance.now() - shownAt));
      timers.push(
        window.setTimeout(() => {
          root.dataset.switchingOut = "";
          timers.push(
            window.setTimeout(() => {
              delete root.dataset.switching;
              delete root.dataset.switchingTo;
              delete root.dataset.switchingOut;
            }, SWITCHING_FADE_MS),
          );
        }, wait),
      );
    };

    if (document.readyState === "complete") hide();
    else {
      window.addEventListener("load", hide, { once: true });
      timers.push(window.setTimeout(hide, SWITCHING_MAX_MS));
    }

    return () => {
      window.removeEventListener("load", hide);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"}>
      {children}
    </MotionConfig>
  );
}
