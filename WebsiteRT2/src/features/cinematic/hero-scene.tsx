"use client";

import {
  motion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
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
 * Scenes overlap slightly so one morphs into the next - as a scene leaves it
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
/**
 * Keeps a scene's content inside the space it is given.
 *
 * The stylesheet sizes the hero copy to the screen (`[data-hero-scene]` in
 * globals.css), and that is enough nearly everywhere - but the copy comes
 * from the Portal, in two scripts, and a long welcome in Tamil on a small
 * phone can still be taller than the room between the header and the foot of
 * the screen. Then, and only then, the content is scaled down until it fits,
 * rather than running up under the header or off the bottom. Re-checked
 * whenever the scene or its content changes size - a rotation, the address
 * bar, a font arriving.
 */
function useFitToScene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const content = fitRef.current;
    if (!scene || !content) return;

    const fit = () => {
      const style = getComputedStyle(scene);
      const room =
        scene.clientHeight -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom);
      // `offsetHeight` ignores transforms, so this is always the natural
      // height, whatever scale was applied last time.
      const natural = content.offsetHeight;
      const scale = natural > room && room > 0 ? room / natural : 1;
      content.style.transform = scale < 1 ? `scale(${scale})` : "";
      content.style.transformOrigin =
        style.alignItems === "flex-end" ? "50% 100%" : "50% 50%";
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(scene);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return { sceneRef, fitRef };
}

export function HeroScene({
  progress,
  start,
  end,
  fade = 0.06,
  children,
  className,
}: HeroSceneProps) {
  const shouldReduceMotion = useReducedMotion();
  const { sceneRef, fitRef } = useFitToScene();

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
      <div
        ref={sceneRef}
        data-hero-scene
        className={cn("absolute inset-0 flex items-end", className)}
      >
        <div ref={fitRef} className="w-full">
          {children}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={sceneRef}
      data-hero-scene
      style={{ opacity, y, scale, pointerEvents, visibility }}
      className={cn(
        "absolute inset-0 flex items-end will-change-transform",
        className,
      )}
    >
      <div ref={fitRef} className="w-full">
        {children}
      </div>
    </motion.div>
  );
}
