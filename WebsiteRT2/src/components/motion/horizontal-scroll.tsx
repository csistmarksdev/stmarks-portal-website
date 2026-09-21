"use client";

import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Children, useEffect, useRef, useState, type ReactNode } from "react";

import { pinnedRange } from "@/lib/scroll-offsets";
import { cn } from "@/lib/utils";

/**
 * The screen gutter, shared by the title and the row beneath it.
 *
 * The stage is full-bleed, so it does *not* use the site's centred measure:
 * everything on it starts at the same distance from the edge of the screen and
 * the row runs off the right-hand side. Aligning the title to the centred
 * container instead would leave it sitting visibly inboard of its own first
 * portrait on any wide monitor - the one misalignment this layout cannot hide.
 */
const GUTTER = "px-5 sm:px-8 lg:px-12";

/**
 * How much vertical scroll each `panels` slide is worth, as a fraction of a
 * screen.
 *
 * `cards` maps one pixel down to one pixel across, which is the honest ratio
 * when the row is a strip of thumbnails. Full-screen panels cannot use it: at
 * 1:1 a row of eight would be eight screen-*widths* of scrolling, which on a
 * wide monitor is twice as long as the same row feels like it should be. So
 * the pace is set per slide instead of per pixel - a little under a screen of
 * scroll to bring the next person on, which is the rhythm these carousels have
 * on the sites that do them well.
 */
const PANEL_DWELL = 0.75;

export interface HorizontalScrollProps {
  /** The cards, laid out as one horizontal track. */
  children: ReactNode;
  /**
   * Rendered above the track and pinned with it, so the stage still says what
   * it is when the reader is halfway along the row.
   */
  heading?: ReactNode;
  /** Names the track for assistive tech when it is a plain scroll region. */
  label?: string;
  /**
   * `cards` is a strip of thumbnails on the section gutter. `panels` gives each
   * child the whole viewport - one person, one screen - and paces the scroll
   * per slide rather than per pixel.
   */
  layout?: "cards" | "panels";
  className?: string;
}

/**
 * A full-viewport stage whose content travels sideways as the page scrolls
 * down.
 *
 * The section takes the whole screen and holds it: the moment its top reaches
 * the top of the viewport the page stops moving down and starts moving across,
 * and it resumes only when the last card has landed. Nothing is inset and
 * nothing is centred in the page's usual measure - the row runs edge to edge
 * and off the right-hand side, which is what makes the turn read as the page
 * itself changing direction rather than as a widget scrolling inside it.
 *
 * The scroll length is *measured*, not chosen. The outer block is one viewport
 * tall plus the track's overhang, and the pinned child is exactly one viewport,
 * so the pin lasts precisely `trackWidth - frameWidth` pixels and the row moves
 * one pixel across for every pixel down. Add a card and the stage holds a
 * little longer; nothing else needs adjusting.
 *
 * Two cases where it does not pin:
 *
 * **`prefers-reduced-motion`.** There it is a plain, swipeable, snapping scroll
 * region - the native behaviour, for the reader who asked not to be moved
 * around.
 *
 * **Nothing to scroll.** If the cards already fit, `distance` is zero, and a
 * stage that pinned anyway would hold the viewport for a screen of no movement.
 */
export function HorizontalScroll({
  children,
  heading,
  label,
  layout = "cards",
  className,
}: HorizontalScrollProps) {
  const panels = layout === "panels";
  const count = Children.count(children);
  const outerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  /** How far the track overhangs its frame; also the length of the pin. */
  const [distance, setDistance] = useState(0);

  const shouldReduceMotion = useReducedMotion();

  /*
   * False on the server and on the first client render - `distance` is 0 until
   * the track has been measured. So the markup React hydrates is the plain
   * scroll region and the pinned stage is switched on afterwards. That ordering
   * is deliberate: the inline height below exists only when pinned, and an
   * inline style that differs between server and client is a hydration
   * mismatch.
   */
  const pinned = !shouldReduceMotion && distance > 0;

  useEffect(() => {
    const frame = frameRef.current;
    const track = trackRef.current;
    if (!frame || !track) return;

    /*
     * `scrollWidth` rather than a measured rect: the track is translated while
     * pinned, and a rect would move with it - the distance would shrink as the
     * reader travelled, which is a feedback loop. Layout width is the one
     * number here that does not depend on the effect it feeds.
     */
    const measure = () =>
      setDistance(Math.max(0, track.scrollWidth - frame.clientWidth));

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(track);

    return () => observer.disconnect();
  }, []);

  /*
   * `start start → end end`: progress runs from the moment the tall outer
   * block's top meets the top of the viewport to the moment its bottom does -
   * exactly the window in which the child below is pinned.
   */
  const { scrollYProgress } = useScroll({
    target: outerRef,
    /*
     * `pinnedRange()` rather than `["start start", "end end"]`: the same range,
     * said the one way that does not crash on a block taller than the screen.
     * See the note on the helper - the string form is handed to a native
     * `ViewTimeline` with the `contain` range, which is empty here, and
     * `Element.animate` throws on the offsets it computes from it.
     */
    offset: pinnedRange(),
  });

  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  /*
   * Which slide is on screen, for the counter. Latched through the updater so
   * React bails out on the frames where it has not changed - `scrollYProgress`
   * moves every frame of a scroll several screens long, and a bare `setState`
   * would hand React an update on all of them to change a number that only
   * moves eight times.
   */
  const [current, setCurrent] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (!panels || count < 2) return;

    const next = Math.min(
      count - 1,
      Math.max(0, Math.round(value * (count - 1))),
    );

    setCurrent((shown) => (shown === next ? shown : next));
  });

  /*
   * The scroll budget. `panels` prices it per slide; `cards` keeps the 1:1
   * mapping, where the budget simply *is* the distance to travel.
   */
  const budget = panels
    ? `calc(100svh + ${Math.max(0, count - 1) * PANEL_DWELL * 100}svh)`
    : `calc(100svh + ${distance}px)`;

  return (
    <div
      ref={outerRef}
      /*
       * One viewport for the stage, plus the overhang to travel. The extra
       * height *is* the scroll budget - there is no separate "how long should
       * this last" number to keep in step with the content.
       */
      style={pinned ? { height: budget } : undefined}
      className={cn("relative", className)}
    >
      <div
        className={cn(
          "flex flex-col",
          pinned
            ? // `dvh`, so the stage fills what is actually visible on a phone
              // rather than the smallest the viewport ever gets. The padding
              // clears the floating header, which sits over the top of the
              // stage for the whole time it is pinned.
              "sticky top-0 h-[100dvh] pt-[calc(var(--header-height)+1rem)] pb-8 sm:pb-10"
            : "py-20 sm:py-24",
        )}
      >
        {heading ? (
          <div className={cn("shrink-0", GUTTER)}>{heading}</div>
        ) : null}

        <div
          ref={frameRef}
          role="group"
          aria-label={label}
          // Focusable only while it is a real scroll region, so a keyboard
          // reader can pan it with the arrow keys. Pinned, the page scroll
          // already does that job and a focus stop here would be a dead end.
          tabIndex={pinned ? undefined : 0}
          className={cn(
            // `min-h-0` is what lets the row take the height the title leaves
            // rather than the height its own content wants - without it a flex
            // child refuses to shrink and the stage overflows the viewport.
            "flex min-h-0 flex-1",
            // A strip of cards is centred in whatever height is left; panels
            // are handed that height so each slide is a full stage and can
            // centre its own contents inside it. And a strip needs air under
            // the title, where panels want every pixel.
            panels ? "items-stretch" : "mt-8 items-center sm:mt-10",
            pinned
              ? "overflow-hidden"
              : "overflow-x-auto overscroll-x-contain snap-x snap-mandatory",
          )}
        >
          <motion.div
            ref={trackRef}
            style={pinned ? { x, willChange: "transform" } : undefined}
            className={cn(
              "flex w-max",
              panels
                ? // No gutter and no gap: each child is exactly one viewport
                  // wide, so the track must be exactly `count` viewports and
                  // nothing else. A gap here would put a sliver of the next
                  // person on screen beside the current one.
                  "h-full items-stretch"
                : "items-center gap-6 sm:gap-8 lg:gap-10 " + GUTTER,
            )}
          >
            {children}
          </motion.div>
        </div>

        {/*
          Which of them you are looking at.

          Worth the line only for panels: with a strip of cards the row itself
          shows you how far along you are, but a full-screen slide gives no such
          clue - the screen looks the same at the first person and the last.

          Hidden from assistive tech: the panels are all in the document and
          reachable in order, so this is a visual position readout, not
          information a screen reader is missing.
        */}
        {pinned && panels && count > 1 ? (
          <p
            aria-hidden
            className={cn(
              "numeric label mt-6 shrink-0 text-[var(--muted-foreground)]",
              GUTTER,
            )}
          >
            {String(current + 1).padStart(2, "0")}
            <span className="mx-1.5 opacity-40">/</span>
            {String(count).padStart(2, "0")}
          </p>
        ) : null}

      </div>
    </div>
  );
}
