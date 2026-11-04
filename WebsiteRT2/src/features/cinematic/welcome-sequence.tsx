"use client";

import { motionValue } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { WelcomeTitle } from "@/features/home/welcome-title";

import {
  useFrameSequence,
  type DrawFrame,
  type FrameSet,
} from "./use-frame-sequence";

const FRAME_COUNT = 240;

/**
 * The frame the sequence pauses on: the cross standing and the Bible open
 * beneath it - the one composed still in the whole 240. Everything before it is
 * the rise and the opening; everything after is the cross coming forward and
 * blooming out to white.
 *
 * 1-indexed, to match the filenames.
 */
const HOLD_FRAME = 131;

/**
 * How much of the section's scroll is spent held on that frame - the window the
 * welcome title has to arrive, sit, and leave. A quarter of the section reads
 * as a deliberate pause; much less and the title is gone before it is read,
 * much more and the reader thinks the page has stopped working.
 */
const HOLD_SPAN = 0.24;

const frameName = (index: number) =>
  `ezgif-frame-${index.toString().padStart(3, "0")}.jpg`;

/** Matches the cinematic hero: 3x is fill rate spent on nothing visible. */
const DESKTOP: FrameSet = {
  src: (i) => `/welcome-frames/${frameName(i)}`,
  maxDpr: 2,
  decodeAhead: 16,
};

/**
 * Narrow screens draw these `contain`, so a phone shows the whole frame at
 * well under 854px across - the 1280px originals were decoded at more than
 * twice the pixels anyone saw. See `scripts/generate-mobile-frames.mjs`.
 */
const MOBILE: FrameSet = {
  src: (i) => `/welcome-frames-m/${frameName(i)}`,
  maxDpr: 2,
  decodeAhead: 16,
};

const MOBILE_QUERY = "(max-width: 900px)";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/*
 * The scroll is divided in three: frames 1-131, the hold, then frames 131-240.
 * The two moving stretches share what the hold leaves, in proportion to how
 * many frames each carries, so a frame costs the same scroll distance on either
 * side of the pause and the sequence does not visibly change speed across it.
 */
const MOVING_SPAN = 1 - HOLD_SPAN;
const HOLD_START = (MOVING_SPAN * HOLD_FRAME) / FRAME_COUNT;
const HOLD_END = HOLD_START + HOLD_SPAN;

/** 0-based frame index for a given fraction through the section. */
const frameForProgress = (fraction: number) => {
  if (fraction <= HOLD_START) {
    return clamp(
      Math.floor((fraction / HOLD_START) * HOLD_FRAME),
      0,
      HOLD_FRAME - 1,
    );
  }

  if (fraction < HOLD_END) return HOLD_FRAME - 1;

  const after = (fraction - HOLD_END) / (1 - HOLD_END);

  return clamp(
    HOLD_FRAME - 1 + Math.floor(after * (FRAME_COUNT - HOLD_FRAME + 1)),
    HOLD_FRAME - 1,
    FRAME_COUNT - 1,
  );
};

/** 0 → 1 through the pause. Pinned at the ends outside it. */
const holdForProgress = (fraction: number) =>
  clamp((fraction - HOLD_START) / HOLD_SPAN, 0, 1);

/**
 * Draws `img` scaled to *contain* the canvas, with its outermost row and column
 * of pixels stretched into whatever letterbox is left over.
 *
 * The hero above this uses `cover`, which is right for a photograph of a room:
 * crop it and it is still a room. These frames are a single centred object with
 * air around it, and cover crops that air away - on a phone it would fill the
 * screen with the upright of the cross and cut both halves off the open Bible.
 * Contain keeps the whole composition at every viewport, and extending the edge
 * pixels means the bars it leaves continue the studio backdrop's own gradient
 * rather than sitting on it as a flat band with a seam.
 */
const drawImageContain: DrawFrame = (ctx, img, canvasWidth, canvasHeight) => {
  const ratio = Math.min(canvasWidth / img.width, canvasHeight / img.height);
  const width = img.width * ratio;
  const height = img.height * ratio;
  const x = (canvasWidth - width) / 2;
  const y = (canvasHeight - height) / 2;

  // +1 on each bar so rounding never leaves a hairline of bare canvas.
  if (y > 0) {
    ctx.drawImage(img, 0, 0, img.width, 1, 0, 0, canvasWidth, y + 1);
    ctx.drawImage(
      img,
      0,
      img.height - 1,
      img.width,
      1,
      0,
      y + height - 1,
      canvasWidth,
      canvasHeight - y - height + 1,
    );
  }

  if (x > 0) {
    ctx.drawImage(img, 0, 0, 1, img.height, 0, 0, x + 1, canvasHeight);
    ctx.drawImage(
      img,
      img.width - 1,
      0,
      1,
      img.height,
      x + width - 1,
      0,
      canvasWidth - x - width + 1,
      canvasHeight,
    );
  }

  ctx.drawImage(img, x, y, width, height);
};

export interface WelcomeSequenceProps {
  /** Section height as a multiple of the viewport. */
  scrollLength?: number;
}

/**
 * The welcome sequence - the second scroll-driven frame run, picking up where
 * the cinematic hero's 300 frames leave off.
 *
 * It is a separate section rather than 240 more frames appended to the hero's
 * canvas, for one reason that decides everything else: these frames are white.
 * The hero is a dark room with a black scrim over it and five panels of white
 * type pinned across its whole progress; extending that canvas would have put
 * white type on a white studio backdrop and required the scrim, the panels and
 * every scene range in `HeroStage` to be re-timed around the join. As its own
 * section it keeps its own scroll range, its own light ground, and leaves the
 * hero exactly as it was.
 *
 * Frames stream in only once the section is within a viewport of being reached,
 * so its ~3.6 MB is never on the critical path for the page's opening.
 */
export function WelcomeSequence({ scrollLength = 6 }: WelcomeSequenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [isNear, setIsNear] = useState(false);

  const { canvasRef, isReady, reducedMotion, setFrame } = useFrameSequence({
    frameCount: FRAME_COUNT,
    desktop: DESKTOP,
    mobile: MOBILE,
    mobileQuery: MOBILE_QUERY,
    draw: drawImageContain,
    stillFrame: HOLD_FRAME,
    enabled: isNear,
    stillPriority: "low",
  });

  /*
   * Owned here, not shared through `HeroScrollProvider`. That value belongs to
   * the cinematic hero, and the header reads it to decide whether it is sitting
   * over dark media. This section is light, so the header's ordinary glass
   * treatment is the correct one over it and it registers nothing.
   */
  const hold = useMemo(() => motionValue(0), []);

  /*
   * Only start fetching when the section is roughly a viewport away. The hero
   * above is 800vh of its own frames; there is no reason for these to compete
   * with those, and a reader who never scrolls this far never pays for them.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsNear(true);
        observer.disconnect();
      },
      { rootMargin: "100% 0px" },
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // One scroll listener, one rAF, one layout read per frame - the hero's
  // arrangement, and for its reasons.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let ticking = false;

    const measure = () => {
      ticking = false;

      const { top, height } = container.getBoundingClientRect();
      const pinned = stickyRef.current?.offsetHeight ?? window.innerHeight;
      const scrollable = height - pinned;
      const fraction = scrollable > 0 ? clamp(-top / scrollable, 0, 1) : 0;

      // The title is scrubbed, not played: scrolling back up takes it away
      // again the way it arrived, which is the grammar of the whole page.
      // `WelcomeTitle` branches on reduced motion itself and ignores this.
      hold.set(holdForProgress(fraction));

      if (reducedMotion) return;

      setFrame(frameForProgress(fraction));
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
  }, [hold, reducedMotion, setFrame]);

  return (
    <div
      ref={containerRef}
      /*
       * `svh` for the container and `dvh` for the pinned panel, for the reason
       * the hero gives: multiplying an address-bar collapse by the scroll
       * length moves every section below it by hundreds of pixels mid-scroll.
       */
      style={{ height: `${scrollLength * 100}svh` }}
      // Collapsed to one still screen under reduced motion, and hidden
      // altogether in Simple mode - see globals.css.
      data-frame-sequence
      data-motion-scene
      className="relative bg-[var(--background)]"
    >
      <div
        ref={stickyRef}
        data-frame-stage
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

        <WelcomeTitle hold={hold} />
      </div>
    </div>
  );
}
