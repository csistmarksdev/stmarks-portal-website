"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { isMotionReduced } from "@/lib/motion-preference";

type Drawable = HTMLImageElement | ImageBitmap;

export type DrawFrame = (
  ctx: CanvasRenderingContext2D,
  source: Drawable,
  canvasWidth: number,
  canvasHeight: number,
) => void;

export interface FrameSet {
  /** URL for a 1-indexed frame. */
  src: (index: number) => string;
  /** Ceiling on the canvas's device pixel ratio for this set. */
  maxDpr: number;
  /**
   * Frames kept decoded ahead of the reader, in the direction of travel. More
   * rides out a faster swipe; each costs width x height x 4 bytes of memory,
   * so a set of small frames can afford a longer reach than a set of large.
   */
  decodeAhead: number;
}

export interface UseFrameSequenceOptions {
  frameCount: number;
  /** The full-size set, for desktops and landscape screens. */
  desktop: FrameSet;
  /** The reduced set, used while `mobileQuery` matches. */
  mobile: FrameSet;
  mobileQuery: string;
  draw: DrawFrame;
  /** 1-indexed frame shown, alone, under reduced motion. */
  stillFrame: number;
  /** False holds off every request until the section is near. */
  enabled?: boolean;
  stillPriority?: "high" | "low";
}

/** How many frames must arrive before the canvas is shown. */
const INITIAL_FRAMES = 12;

/**
 * Frames kept decoded in the direction of travel, and behind it.
 *
 * This window is what keeps scrubbing smooth, and *how* it is filled matters
 * more than its size.
 *
 * Drawing an `<img>` to a canvas decodes the JPEG synchronously on the main
 * thread whenever the browser has not kept its pixels - and across 300 frames
 * a phone keeps very few - so nearly every frame change on a scroll paid for a
 * full decode inside that scroll's own animation frame. The obvious fix,
 * `createImageBitmap(img)`, is no fix at all: profiled, Chromium decodes an
 * `<img>` source *synchronously* too, and it was 60% of the hero's main-thread
 * time on its own.
 *
 * What is genuinely decoded off the main thread is a **Blob**. So frames are
 * fetched as compressed blobs (a few tens of KB each - cheap to hold all of
 * them) and only the ones near the reader are turned into bitmaps, on the
 * browser's decode threads. Drawing a bitmap is a plain copy. Bitmaps that fall
 * out of the window are closed, so memory stays flat whatever the length.
 */
const DECODE_BEHIND = 6;

/** Frame downloads in flight at once. */
const FETCH_CONCURRENCY = 6;

/** Tries per frame before it is given up on. */
const FETCH_ATTEMPTS = 3;

const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const supportsBitmaps = () => typeof createImageBitmap === "function";

/**
 * Plays a scroll-scrubbed image sequence into a canvas.
 *
 * The caller owns progress: it measures its own section and calls `setFrame`
 * with a 0-based index. Everything about getting that frame onto the canvas
 * without stalling - which set of files, fetching, decoding ahead, canvas
 * sizing - lives here.
 */
export function useFrameSequence({
  frameCount,
  desktop,
  mobile,
  mobileQuery,
  draw,
  stillFrame,
  enabled = true,
  stillPriority = "high",
}: UseFrameSequenceOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  /** Compressed frames, by 0-based index. Replaced wholesale per load. */
  const blobsRef = useRef<(Blob | undefined)[]>([]);
  /** `<img>` fallback for browsers without `createImageBitmap`. */
  const imagesRef = useRef<(HTMLImageElement | undefined)[]>([]);
  const bitmapsRef = useRef(new Map<number, ImageBitmap>());
  const pendingRef = useRef(new Set<number>());
  /** Bumped per load, so late decodes from an abandoned set are dropped. */
  const generationRef = useRef(0);

  const frameIndexRef = useRef(0);
  const directionRef = useRef<1 | -1>(1);
  /** `decodeAhead` of the set being played. */
  const aheadRef = useRef(desktop.decodeAhead);
  /** Wakes the download queue when the reader moves; set while fetching. */
  const pumpRef = useRef<(() => void) | null>(null);
  /**
   * Whether the opening has been let through once. Only the first load holds
   * the queue to the opening frames until idle; a reload of the set (a phone
   * turned on its side mid-sequence) must fetch around the reader at once.
   */
  const openedOnceRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  const reducedMotion = useReducedMotion();
  const isMobile = useMediaQuery(mobileQuery);
  const set = isMobile ? mobile : desktop;

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    // `alpha: false`: every frame covers the canvas edge to edge, and an
    // opaque canvas skips blending against what is behind it.
    ctxRef.current ??= canvas.getContext("2d", { alpha: false });
    return ctxRef.current;
  }, []);

  /**
   * The best thing to draw for `index`: its bitmap, else the nearest decoded
   * neighbour - a frame early is invisible, a stalled frame is not. Never an
   * undecoded image, which would decode on this thread right now.
   */
  const sourceFor = useCallback((index: number): Drawable | null => {
    const bitmaps = bitmapsRef.current;
    const exact = bitmaps.get(index);
    if (exact) return exact;

    const reach = Math.max(aheadRef.current, DECODE_BEHIND);
    for (let d = 1; d <= reach; d++) {
      const near = bitmaps.get(index - d) ?? bitmaps.get(index + d);
      if (near) return near;
    }

    const image = imagesRef.current[index];
    return image?.complete && image.naturalWidth > 0 ? image : null;
  }, []);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    const source = sourceFor(frameIndexRef.current);
    if (!canvas || !ctx || !source) return;

    draw(ctx, source, canvas.width, canvas.height);
  }, [draw, getContext, sourceFor]);

  /*
   * Whether a decoded frame is worth keeping: within `decodeAhead` on *either*
   * side. Decoding is still directional (see `decodeAround`), but keeping is
   * not - it used to be, and a thumb scroll wobbles back and forth constantly,
   * so every small reversal turned the frames decoded ahead into frames
   * "behind", closed them, and had to decode them all again a moment later.
   */
  const inWindow = useCallback((index: number) => {
    return Math.abs(index - frameIndexRef.current) <= aheadRef.current;
  }, []);

  /** Decodes the window around the current frame and releases the rest. */
  const decodeAround = useCallback(() => {
    if (!supportsBitmaps()) return;

    const center = frameIndexRef.current;
    const direction = directionRef.current;
    const bitmaps = bitmapsRef.current;
    const pending = pendingRef.current;
    const blobs = blobsRef.current;
    const generation = generationRef.current;

    for (const [index, bitmap] of bitmaps) {
      if (!inWindow(index)) {
        bitmap.close();
        bitmaps.delete(index);
      }
    }

    // Nearest first, leading side first, so the next frame needed is first.
    const order: number[] = [center];
    for (let d = 1; d <= aheadRef.current; d++) {
      order.push(center + d * direction);
      if (d <= DECODE_BEHIND) order.push(center - d * direction);
    }

    for (const index of order) {
      const blob = blobs[index];
      if (!blob || bitmaps.has(index) || pending.has(index)) continue;

      pending.add(index);
      createImageBitmap(blob)
        .then((bitmap) => {
          // A newer load owns `pending` now; this decode belongs to nothing.
          if (generation !== generationRef.current) {
            bitmap.close();
            return;
          }
          /*
           * Cleared before anything else, and that order is the fix for frames
           * vanishing after a trip back to the top. This used to return early
           * for a frame the reader had already scrolled past *without* clearing
           * its pending mark - and a frame marked pending is never decoded
           * again. A fast scroll strands dozens of them that way, so the next
           * pass down found holes all through the sequence and drew neighbours
           * instead: measured, 75% of frames failed to change on every pass
           * after the first.
           */
          pending.delete(index);
          if (!inWindow(index)) {
            bitmap.close();
            return;
          }
          bitmaps.set(index, bitmap);
          // Repaint if this is the frame on screen, or if the frame on screen
          // is standing in with a neighbour - this one may be a closer one.
          const current = frameIndexRef.current;
          if (index === current || !bitmaps.has(current)) paint();
        })
        .catch(() => {
          if (generation === generationRef.current) pending.delete(index);
        });
    }
  }, [inWindow, paint]);

  const releaseAll = useCallback(() => {
    generationRef.current += 1;
    for (const bitmap of bitmapsRef.current.values()) bitmap.close();
    bitmapsRef.current.clear();
    pendingRef.current.clear();
  }, []);

  /** Shows a 0-based frame. Cheap to call on every scroll frame. */
  const setFrame = useCallback(
    (index: number) => {
      const previous = frameIndexRef.current;
      if (index === previous) return;
      directionRef.current = index > previous ? 1 : -1;
      frameIndexRef.current = index;
      paint();
      decodeAround();
      pumpRef.current?.();
    },
    [decodeAround, paint],
  );

  // Fetch. Re-runs when the set changes (a phone turned on its side).
  useEffect(() => {
    if (!enabled) return;

    /*
     * Read the queries directly rather than trusting this render's values.
     * During hydration the hooks above still report their server answer
     * (false), and acting on it would start a phone fetching desktop frames -
     * or a reduced-motion reader fetching all of them - for one render.
     */
    const active = window.matchMedia(mobileQuery).matches ? mobile : desktop;
    const { src } = active;
    const fallbackSrc = desktop.src;
    aheadRef.current = active.decodeAhead;
    const onlyStill = isMotionReduced();

    releaseAll();
    const blobs: (Blob | undefined)[] = new Array(frameCount);
    const images: (HTMLImageElement | undefined)[] = new Array(frameCount);
    blobsRef.current = blobs;
    imagesRef.current = images;
    const controller = new AbortController();
    let initialLoaded = 0;
    let cancelled = false;

    /*
     * Counts a frame of the opening as *settled* - arrived, or given up on.
     *
     * The canvas used to wait for all of the opening frames to arrive, so a
     * single one failing (a dropped request on a phone, a missing file) left
     * the hero invisible for good. Now a frame that has exhausted its retries
     * counts too: the hero shows with whatever it has.
     */
    const settled = (index: number) => {
      if (cancelled) return;
      // Under reduced motion the still is the only frame, so it alone reveals.
      if (onlyStill || index < INITIAL_FRAMES) {
        initialLoaded++;
        if (initialLoaded === (onlyStill ? 1 : Math.min(INITIAL_FRAMES, frameCount))) {
          setIsReady(true);
        }
      }
    };

    const arrived = (index: number) => {
      if (cancelled) return;
      settled(index);
      if (inWindow(index)) decodeAround();
      if (index === frameIndexRef.current) paint();
    };

    const loadFrame = (i: number, high: boolean): Promise<void> | void => {
      const priority = high ? "high" : "low";
      const index = i - 1;
      const url = src(i);

      if (!supportsBitmaps()) {
        const img = new Image();
        img.decoding = "async";
        img.setAttribute("fetchpriority", priority);
        img.onload = () => arrived(index);
        img.onerror = () => settled(index);
        img.src = url;
        images[index] = img;
        return;
      }

      // `priority` is Fetch Priority; TypeScript's DOM types lag behind it.
      const init: RequestInit & { priority: string } = {
        signal: controller.signal,
        priority,
      };

      /*
       * Each frame gets a few attempts, and the phone-sized set falls back to
       * the full-size file of the same frame. A failure used to be final: the
       * frame was struck off the download queue and became a permanent hole
       * the hero stepped around - and if the phone-sized files were missing
       * altogether (not deployed), every frame on every phone failed.
       */
      const attempt = (tries: number, from: string): Promise<void> =>
        fetch(from, init)
          .then((response) => {
            if (!response.ok) throw new Error(String(response.status));
            return response.blob();
          })
          .then((blob) => {
            if (cancelled) return;
            blobs[index] = blob;
            arrived(index);
          })
          .catch(() => {
            if (cancelled || controller.signal.aborted) return;
            if (tries < FETCH_ATTEMPTS) {
              // On the last try, the full-size file of the same frame.
              const next = tries === FETCH_ATTEMPTS - 1 ? fallbackSrc(i) : from;
              return wait(400 * tries).then(() => attempt(tries + 1, next));
            }
            settled(index);
          });

      return attempt(1, url);
    };

    // Under reduced motion the sequence never scrubs: one still, nothing else.
    if (onlyStill) {
      frameIndexRef.current = stillFrame - 1;
      loadFrame(stillFrame, stillPriority === "high");

      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    /*
     * Downloads, nearest the reader first.
     *
     * Requesting all of them at once in frame order meant a reader who
     * scrolled before the tail had arrived ran into frames that did not exist
     * yet - the hero froze on the last one it had and then jumped, which read
     * as frames being skipped. Instead a few are in flight at a time, and each
     * free slot goes to whichever missing frame is closest ahead of where the
     * reader is *now*, so the frames about to be needed are always the next
     * ones to arrive. Until the browser is first idle only the opening frames
     * are fetched, so the rest never compete with the page's own loading.
     */
    if (!supportsBitmaps()) {
      for (let i = 1; i <= frameCount; i++) loadFrame(i, i <= INITIAL_FRAMES);
      return () => {
        cancelled = true;
      };
    }

    const missing = new Set<number>();
    for (let i = 0; i < frameCount; i++) missing.add(i);
    let inFlight = 0;
    let opened = openedOnceRef.current;

    const nearestMissing = () => {
      const center = frameIndexRef.current;
      const direction = directionRef.current;
      for (let d = 0; d < frameCount; d++) {
        const ahead = center + d * direction;
        if (missing.has(ahead)) return ahead;
        const behind = center - d * direction;
        if (missing.has(behind)) return behind;
      }
      return -1;
    };

    const pump = () => {
      while (!cancelled && inFlight < FETCH_CONCURRENCY && missing.size > 0) {
        const index = nearestMissing();
        if (index < 0) return;
        if (!opened && index >= INITIAL_FRAMES) return;

        missing.delete(index);
        inFlight++;
        const near = Math.abs(index - frameIndexRef.current) <= aheadRef.current;
        Promise.resolve(loadFrame(index + 1, near)).finally(() => {
          inFlight--;
          pump();
        });
      }
    };

    pumpRef.current = pump;
    pump();

    const openRest = () => {
      opened = true;
      openedOnceRef.current = true;
      pump();
    };

    const idleHandle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(openRest, { timeout: 1500 })
        : window.setTimeout(openRest, 300);

    return () => {
      cancelled = true;
      pumpRef.current = null;
      controller.abort();
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle as number);
      } else {
        window.clearTimeout(idleHandle as number);
      }
    };
  }, [
    enabled,
    // Not read inside, but each is a reason to start over.
    set,
    reducedMotion,
    mobile,
    desktop,
    mobileQuery,
    frameCount,
    stillFrame,
    stillPriority,
    paint,
    decodeAround,
    inWindow,
    releaseAll,
  ]);

  useEffect(() => releaseAll, [releaseAll]);

  /*
   * Canvas sizing, from the canvas's own rendered box rather than the window:
   * `window.innerHeight` excludes the mobile address bar while the viewport
   * units on the canvas's container do not, and measuring the window left the
   * canvas short of its box. The observer catches the address bar collapsing,
   * which a window `resize` does not always report on mobile.
   */
  useEffect(() => {
    if (!isReady) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, set.maxDpr);
      const { width, height } = canvas.getBoundingClientRect();
      if (width === 0 || height === 0) return;

      const nextWidth = Math.round(width * dpr);
      const nextHeight = Math.round(height * dpr);

      // Assigning `width`/`height` clears the backing store even when the value
      // is unchanged, and the observer fires on sub-pixel wobble.
      if (canvas.width === nextWidth && canvas.height === nextHeight) return;

      canvas.width = nextWidth;
      canvas.height = nextHeight;

      // Resizing resets context state, so smoothing is re-applied here.
      const ctx = getContext();
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
      }

      paint();
    };

    resizeCanvas();
    paint();

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [isReady, set, getContext, paint]);

  return { canvasRef, isReady, reducedMotion, setFrame };
}
