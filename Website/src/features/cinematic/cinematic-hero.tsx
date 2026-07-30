"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useHeroScroll } from "@/providers/hero-scroll-provider";

const frameCount = 300;
const currentFrame = (index: number) =>
  `/frames/ezgif-frame-${index.toString().padStart(3, "0")}.jpg`;

/** How many frames must decode before the canvas is shown. */
const INITIAL_FRAMES = 12;

/**
 * The single frame shown as a still under `prefers-reduced-motion`. Taken from
 * a little way into the sequence so it is a composed shot rather than the
 * opening frame.
 */
const STILL_FRAME = 90;

/**
 * Retina is worth it; 3x on a phone is four times the fill rate of 2x for no
 * perceptible gain on a photographic frame, and it is paid on every repaint.
 */
const MAX_DPR = 2;

/** Draws `img` cropped to cover the canvas box, centred. */
const drawImageCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
) => {
  const ratio = Math.max(canvasWidth / img.width, canvasHeight / img.height);
  const newWidth = img.width * ratio;
  const newHeight = img.height * ratio;

  ctx.drawImage(
    img,
    (canvasWidth - newWidth) / 2,
    (canvasHeight - newHeight) / 2,
    newWidth,
    newHeight,
  );
};

export interface CinematicHeroProps {
  /** Overlay content rendered above the canvas (title, scroll cue). */
  children?: ReactNode;
  /**
   * Section height as a multiple of the viewport. The animation is spread
   * across this distance — 5 means 500vh, matching the original component.
   */
  scrollLength?: number;
}

/**
 * Scroll-driven image sequence.
 *
 * The drawing logic is unchanged from the original component. Two things were
 * adapted so it can live above the rest of the page rather than being the
 * whole page:
 *
 * 1. Progress is measured against *this section's* scroll range instead of
 *    `document.documentElement.scrollTop / scrollHeight`. With page content
 *    below the hero, document-based progress would stretch the animation
 *    across the entire page and frames would still be advancing while the
 *    reader was at the footer.
 * 2. The canvas appears once the first handful of frames have decoded rather
 *    than waiting for all 300 (~16 MB), so the hero paints quickly. Remaining
 *    frames continue loading in the background and each `onload` redraws if
 *    it is the frame currently in view.
 */
export function CinematicHero({
  children,
  scrollLength = 5,
}: CinematicHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameIndexRef = useRef(0);
  const [isReady, setIsReady] = useState(false);

  const { progress, registerHero } = useHeroScroll();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Tell the header a cinematic hero owns the top of this page.
  useEffect(() => registerHero(), [registerHero]);

  /** Paints whatever frame is currently in view, if it has decoded. */
  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const image = imagesRef.current[frameIndexRef.current];

    // A frame may not have decoded yet while the sequence streams in.
    if (!canvas || !ctx || !image?.complete || image.naturalWidth === 0) return;

    drawImageCover(ctx, image, canvas.width, canvas.height);
  }, []);

  // Preload frames. The canvas reveals after INITIAL_FRAMES decode; the rest
  // are deferred to idle time and fetched at low priority so the ~15 MB tail of
  // the sequence never competes with the page's critical resources or the main
  // thread. The drawing and scroll logic below is unchanged, so the animation
  // is identical — the frames simply stream in without starving first paint.
  useEffect(() => {
    const images: HTMLImageElement[] = new Array(frameCount);
    imagesRef.current = images;
    let initialLoaded = 0;
    let cancelled = false;

    /*
     * Under reduced motion the sequence never animates, so there is nothing to
     * preload: one frame is fetched as a still and the other 299 (~15 MB) are
     * skipped outright. Everything else on the site already honours this
     * preference — this was the one animation that did not, and it is by far
     * the most motion-heavy.
     */
    if (reducedMotion) {
      const still = new Image();
      still.decoding = "async";
      still.setAttribute("fetchpriority", "high");
      still.onload = () => {
        if (cancelled) return;
        setIsReady(true);
        paint();
      };
      still.src = currentFrame(STILL_FRAME);
      // Indexed where the scroll handler pins the frame, so `paint` finds it.
      images[STILL_FRAME - 1] = still;
      frameIndexRef.current = STILL_FRAME - 1;

      return () => {
        cancelled = true;
      };
    }

    const repaintIfCurrent = (index: number) => {
      if (cancelled || index !== frameIndexRef.current) return;
      paint();
    };

    const loadFrame = (i: number, priority: "high" | "low") => {
      const index = i - 1;
      const img = new Image();
      img.decoding = "async";
      img.setAttribute("fetchpriority", priority);

      img.onload = () => {
        if (cancelled) return;

        if (index < INITIAL_FRAMES) {
          initialLoaded++;
          if (initialLoaded === INITIAL_FRAMES) setIsReady(true);
        }

        repaintIfCurrent(index);
      };

      img.src = currentFrame(i);
      images[index] = img;
    };

    // The frames needed to reveal the hero, loaded eagerly at high priority.
    for (let i = 1; i <= INITIAL_FRAMES; i++) loadFrame(i, "high");

    // The remaining frames stream in once the browser is idle, at low priority.
    const loadRest = () => {
      for (let i = INITIAL_FRAMES + 1; i <= frameCount; i++) {
        if (cancelled) return;
        loadFrame(i, "low");
      }
    };

    const idleHandle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(loadRest, { timeout: 1500 })
        : window.setTimeout(loadRest, 300);

    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle as number);
      } else {
        window.clearTimeout(idleHandle as number);
      }
    };
  }, [paint, reducedMotion]);

  /*
   * One scroll listener, one rAF, one layout read per frame.
   *
   * Progress and the frame index are the same measurement, so they are taken
   * together. Splitting them across two listeners meant two `scroll` handlers,
   * two rAF callbacks and — because `getBoundingClientRect` inside rAF forces
   * layout — two synchronous reflows on every frame of a scroll that also has
   * Lenis, five overlay scenes and a canvas repaint on it. That was the second
   * half of the stutter.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let ticking = false;

    const measure = () => {
      ticking = false;

      // Progress through this section only: 0 when its top reaches the
      // viewport top, 1 when its bottom does. Measured against the pinned
      // panel, not `window.innerHeight`: the two disagree by the height of the
      // mobile address bar, which would put progress slightly out of step with
      // what is actually on screen.
      const { top, height } = container.getBoundingClientRect();
      const pinned = stickyRef.current?.offsetHeight ?? window.innerHeight;
      const scrollable = height - pinned;
      const fraction =
        scrollable > 0 ? Math.min(Math.max(-top / scrollable, 0), 1) : 0;

      progress.set(fraction);

      // Progress still drives the overlay scenes and the header, which handle
      // reduced motion themselves; only the frame scrubbing stops.
      if (reducedMotion) return;

      const nextFrameIndex = Math.min(
        frameCount - 1,
        Math.floor(fraction * frameCount),
      );

      if (nextFrameIndex !== frameIndexRef.current) {
        frameIndexRef.current = nextFrameIndex;
        paint();
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [paint, progress, reducedMotion]);

  // Canvas sizing.
  useEffect(() => {
    if (!isReady) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    /*
     * Size the backing store from the canvas's own rendered box rather than the
     * window. `window.innerHeight` excludes the mobile address bar while the
     * `dvh` box below does not, so measuring the window left the canvas shorter
     * than its container and let the black background show through beneath it —
     * and every address-bar collapse resized it, jumping the image mid-scroll.
     * The element's own box is correct by construction at any viewport.
     */
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const { width, height } = canvas.getBoundingClientRect();
      if (width === 0 || height === 0) return;

      const nextWidth = Math.round(width * dpr);
      const nextHeight = Math.round(height * dpr);

      // Assigning `width`/`height` reallocates and clears the backing store
      // even when the value is unchanged. The observer below fires on sub-pixel
      // box changes, so without this guard an idle address-bar wobble blanked
      // and repainted the whole frame.
      if (canvas.width === nextWidth && canvas.height === nextHeight) return;

      canvas.width = nextWidth;
      canvas.height = nextHeight;

      // Resizing resets all context state, so smoothing is re-applied here.
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
      }

      paint();
    };

    resizeCanvas();
    paint();

    // Observing the element catches the `dvh` box changing as the mobile
    // address bar collapses, which a window `resize` event does not always
    // report on mobile browsers.
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [isReady, paint]);

  return (
    <div
      ref={containerRef}
      /*
       * `svh`, not `dvh`, and deliberately a different unit from the pinned
       * panel below.
       *
       * The panel must track the *visible* viewport, so it stays `dvh`. This
       * container must not: at `scrollLength` 8, a `dvh` height multiplies
       * every address-bar collapse by eight, so one flick on a phone changed
       * the document height by ~480px and shunted every section below the hero
       * up or down by that much mid-scroll — read as the page snapping to the
       * neighbouring section. `svh` is fixed for the life of the viewport, so
       * the document height is stable.
       *
       * Mixing units is safe here because nothing assumes they agree: the
       * scroll handler measures the real container box and the real panel
       * height every frame and derives progress from those, so the frames stay
       * in step whatever the address bar does.
       */
      style={{ height: `${scrollLength * 100}svh` }}
      className="relative bg-black"
    >
      <div
        ref={stickyRef}
        className="sticky top-0 h-[100dvh] w-full overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          style={{
            opacity: isReady ? 1 : 0,
            transition: "opacity 700ms ease-out",
          }}
        />

        {children ? (
          <div className="pointer-events-none absolute inset-0">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
