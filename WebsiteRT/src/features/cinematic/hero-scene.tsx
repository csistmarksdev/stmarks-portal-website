"use client";

import {
  motion,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface HeroSceneProps {
  progress: MotionValue<number>;
  /** Scroll progress where the scene reaches full opacity. */
  start: number;
  end: number;
  /** Cross-fade length on either side, as a fraction of total progress. */
  fade?: number;
  children: ReactNode;
  className?: string;
}

/**
 * One "beat" of the cinematic intro.
 *
 * Scenes overlap slightly so one morphs into the next — as a scene leaves it
 * drifts up and contracts, while the incoming one rises and settles.
 * `pointerEvents` is driven from the same progress so hidden scenes never
 * swallow clicks meant for the scene on screen.
 *
 * Motion is opacity + transform only, for the same reason `Reveal` gave up its
 * blur: an animated `filter` re-rasters the whole layer every frame, and five
 * of these are stacked at full viewport size over a canvas that is repainting
 * on the same frames. `visibility` follows opacity so the four scenes that are
 * not on screen are skipped by the compositor entirely rather than being
 * composited invisibly for the whole 800vh scroll.
 */
export function HeroScene({
  progress,
  start,
  end,
  fade = 0.06,
  children,
  className,
}: HeroSceneProps) {
  const shouldReduceMotion = useReducedMotion();

  const range = [start - fade, start, end, end + fade];

  const opacity = useTransform(progress, range, [0, 1, 1, 0]);
  const y = useTransform(progress, range, [56, 0, 0, -56]);
  const scale = useTransform(progress, range, [0.94, 1, 1, 1.06]);

  // Only the scene currently on screen may receive pointer events.
  const pointerEvents = useTransform(opacity, (value) =>
    value > 0.6 ? "auto" : "none",
  );

  // Fully faded scenes are taken out of the render tree's paint work.
  const visibility = useTransform(opacity, (value) =>
    value > 0.001 ? "visible" : "hidden",
  );

  if (shouldReduceMotion) {
    // Without motion the scenes would stack; show only the first.
    if (start > 0) return null;

    return (
      <div className={cn("absolute inset-0 flex items-end", className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      style={{ opacity, y, scale, pointerEvents, visibility }}
      className={cn(
        "absolute inset-0 flex items-end will-change-transform",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
