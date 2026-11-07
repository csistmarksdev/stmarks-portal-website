"use client";

import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useHeroUnderHeader } from "@/hooks/use-hero-under-header";
import { useMediaQuery } from "@/hooks/use-media-query";
import { pinnedRange } from "@/lib/scroll-offsets";
import { cn } from "@/lib/utils";

/**
 * Photographs in the reel below the desktop breakpoint.
 *
 * A reel frame is the photograph at its own 16:9 shape, so on a phone held
 * upright each one is nearly four screen-widths across, and six of them made a
 * strip of ~8,600px. Squeezed into the ~3 screens of scroll a chapter opener
 * gets, that slid ~3.4px sideways for every pixel the thumb moved: the
 * pictures were flung past rather than shown. Three photographs keep the
 * opener about the same length while letting each one travel at a pace that
 * can be watched. The desktop stack, which moves each photograph once, keeps
 * them all.
 */
const REEL_FRAMES = 3;

/**
 * Sideways pixels per pixel of scroll, below the desktop breakpoint.
 *
 * The reel's scroll budget is derived from the distance it has to travel
 * rather than counted per photograph, so the pace is the same at every screen
 * shape: a gentle drift, a little faster than the thumb, never several times
 * faster. Lower is slower (and a longer opener).
 */
const REEL_SPEED = 1.5;

/**
 * The same budget for the desktop stack, which is a different effect and needs
 * more of it.
 *
 * The reel's 0.6 is priced for travel: on a 16:9 desktop it pushed a full
 * screen-width of photograph past in 0.6 screens of scroll, which read as the
 * pictures being flung by. The stack moves each photograph one screen *height*,
 * once, and the reader is meant to watch it land - so it gets a little over a
 * screen of scroll per photograph.
 *
 * Applied in `globals.css` (`[data-pinned-hero]`) rather than chosen in script,
 * so the server's markup already has the right height at every width and the
 * page does not reflow when the media query resolves.
 */
const STACK_DWELL = 1.25;

/** Desktop gets the stack; below it, the reel. Mirrors Tailwind's `lg`. */
const STACK_QUERY = "(min-width: 64rem)";

/**
 * The share of the lock the cards spend arriving. The rest is a hold on the
 * last photograph, so it is seen settled before the page moves on.
 */
const STACK_TRAVEL_END = 0.9;

/** How far a covered card sinks back, and how much it darkens. */
const STACK_SCALE = 0.9;
const STACK_DIM = 0.55;

/**
 * How wide one frame of the reel is: the photograph's own shape, or the
 * screen's, whichever is wider.
 *
 * `177.78dvh` is 16:9 at full height - the shape every photograph in
 * `public/hero` is - and on anything narrower than 16:9 it is the whole answer:
 * the frame is wider than the screen, so the reel pans across it and nothing is
 * cropped. That is the phone, the tablet held upright, and a 16:10 laptop.
 *
 * `max()` is there for the other half, and a browser window is in that half far
 * more often than a spec sheet suggests. A 1920x1080 monitor is exactly 16:9,
 * but the *window* on it is not: take the browser chrome off the top and
 * 1915x937 is 2.04:1, where a 16:9 frame is 1666px against a 1915px screen and
 * a 249px sliver of the next photograph sits at the right-hand edge. Two
 * photographs on screen at once is not a reel, it is a seam. Floored at the
 * viewport width the frame is always full-bleed, and the cost is a few percent
 * cropped off the top and bottom - 13% in that example, against the 74% off the
 * sides that started all this.
 */
const TILE_WIDTH = "w-[max(100vw,177.78dvh)]";

/**
 * Where the hero's filter and its copy strike in, hold, and drop out.
 *
 * A cut, not a dissolve. The ramps are 0.06 of the pass - about a quarter of a
 * screen of scroll - so the title arrives decisively rather than seeping in
 * over two screens the way a curve that peaks at the halfway mark and ramps all
 * the way from each end does. What that curve gave was a hero that was never
 * quite on and never quite off; what this one gives is three beats: a clean
 * photograph, a title, a clean photograph again.
 *
 * The flat middle is placed to sit *inside* the time the hero owns the whole
 * screen - full weight from 0.34 to 0.66 of the pass, against a covering window
 * of 0.26 to 0.74 on a four-frame hero. So the copy is only ever at full
 * strength while the photography is edge to edge behind it, and the ramps
 * happen while the hero is still arriving or already leaving.
 *
 * Read against the section's whole pass through the viewport rather than
 * against the lock - see `passProgress` below for why those are not the same
 * window.
 */
const FADE_STOPS = [0, 0.28, 0.34, 0.66, 0.72, 1];
const FADE_VALUES = [0, 0, 1, 1, 0, 0];

/**
 * Softens the two ends of each ramp so a fast fade still reads as a fade.
 *
 * The hold either side of it is what keeps this from smearing the effect out:
 * the easing is spread over a quarter-screen, not over the whole section, so it
 * takes the hard edges off the strike without slowing it down.
 */
const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/** Decelerates into place, so a card lands rather than stops. */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const subscribeNever = () => () => {};
const supportsScrollTimelines = () =>
  typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()");

interface StackCardProps {
  image: string;
  index: number;
  count: number;
  priority: boolean;
  progress: MotionValue<number>;
}

/**
 * One photograph in the desktop stack.
 *
 * Card `i` rises over card `i - 1` during the `i`th slice of the lock, its top
 * corners squaring off as it lands; while the card after it rises in turn, it
 * sinks back and darkens beneath it. A component of its own because each card
 * needs its own transforms, and hooks cannot be called in a loop.
 */
function StackCard({
  image,
  index,
  count,
  priority,
  progress,
}: StackCardProps) {
  const slice = STACK_TRAVEL_END / (count - 1);
  const arriveStart = (index - 1) * slice;
  const arriveEnd = index * slice;
  const coverEnd = (index + 1) * slice;

  // The first card is already in place; every other card starts below the
  // screen. Clamped by `useTransform`, so outside its slice a card holds.
  const y = useTransform(
    progress,
    index === 0 ? [0, 1] : [arriveStart, arriveEnd],
    index === 0 ? ["0%", "0%"] : ["100%", "0%"],
    { ease: easeOutCubic },
  );
  const radius = useTransform(
    progress,
    index === 0 ? [0, 1] : [arriveStart, arriveEnd],
    index === 0 ? [0, 0] : [28, 0],
  );

  // The last card is never covered.
  const covered = index < count - 1;
  const scale = useTransform(
    progress,
    [arriveEnd, coverEnd],
    covered ? [1, STACK_SCALE] : [1, 1],
  );
  const dim = useTransform(
    progress,
    [arriveEnd, coverEnd],
    covered ? [0, STACK_DIM] : [0, 0],
  );

  return (
    <motion.div
      style={{
        y,
        scale,
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
        zIndex: index,
        willChange: "transform",
      }}
      className="absolute inset-0 overflow-hidden shadow-[0_-24px_60px_rgba(0,0,0,0.45)]"
    >
      <Image
        src={image}
        alt=""
        fill
        priority={priority && index === 0}
        sizes="100vw"
        className="object-cover"
      />
      <motion.div
        style={{ opacity: dim }}
        className="absolute inset-0 bg-black"
      />
    </motion.div>
  );
}

export interface PinnedHeroProps {
  /** The section's photographs, in folder order. */
  images: string[];
  /**
   * Which way the strip travels while the hero is locked.
   *
   * Alternated down the page - see `heroDirection` in `constants/site`. One
   * chapter's photographs run left while the next one's run right, so the
   * openings read as a rhythm rather than as the same effect eight times.
   */
  direction?: "left" | "right";
  /** Fetch the first frame with priority. */
  priority?: boolean;
  /**
   * Cap on frames, for a hero that should not hold the reader as long.
   * Omitted, the hero uses every photograph in its folder.
   */
  maxFrames?: number;
  /** Marks the variant for the CSS in `globals.css`. */
  variant: "page" | "section";
  /** Classes for the hero frame itself - ground, height, padding, alignment. */
  frameClassName?: string;
  /** Scrims and copy, laid over the photography. */
  children: ReactNode;
}

/**
 * A hero that locks to the viewport and scrolls its photography sideways
 * before releasing the page to the next section.
 *
 * Each frame is the full screen - which is what makes the photographs read as
 * landscape again. They were tiles a third of a screen wide and a whole screen
 * tall, so `object-cover` was taking a landscape photograph and cropping a
 * portrait slice out of the middle of it; at full bleed the frame is the shape
 * of the screen and the picture is shown as it was taken.
 *
 * The copy does not move. It is inside the pinned frame, so the title holds
 * still while the photographs travel behind it - the reader is being shown a
 * chapter's images, not scrolled past them.
 *
 * Three cases where it does not lock:
 *
 * **`prefers-reduced-motion`.** For the reader who asked not to be moved around;
 * they get the first frame as an ordinary hero.
 *
 * **A single frame.** Nothing to travel, so nothing to hold the page for.
 *
 * It used to sit out below `lg` as well, on the theory that a driven scroll
 * fights the gesture a touch screen already has. In practice it does not - the
 * page still scrolls exactly as far as the reader pushes it, and the horizontal
 * travel is a consequence of that rather than a competing motion - and sitting
 * it out meant a phone saw one photograph per chapter and none of the effect
 * the page is built around.
 */
export function PinnedHero({
  images,
  direction = "left",
  priority = false,
  maxFrames,
  variant,
  frameClassName,
  children,
}: PinnedHeroProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  /** How far the reel overhangs the screen; the whole of its travel. */
  const [travel, setTravel] = useState(0);

  /*
   * Tells the header to open back out to its full-width, transparent state for
   * as long as this hero is the thing behind it - the same state it has at the
   * very top of the page. Watches the outer block rather than the pinned frame:
   * while the hero is locked, the outer is exactly the span of scroll over
   * which the frame owns the screen.
   */
  useHeroUnderHeader(outerRef);

  const shouldReduceMotion = useReducedMotion();

  /*
   * The folder is the source of truth for how many photographs a hero shows,
   * not just which ones. This used to be capped at four on the theory that
   * every extra frame is another screen-width of travel before the chapter
   * starts - but the cap failed the same way the old hand-kept `SLIDE_COUNT`
   * did, quietly ignoring photographs someone had already dropped in. A hero
   * that should hold the reader for less says so with `maxFrames`.
   */
  const frames =
    maxFrames === undefined ? images : images.slice(0, Math.max(1, maxFrames));

  /*
   * Decided from the frame count, which the server knows, rather than from the
   * measured travel - so the hero is already pinned in the markup React
   * hydrates and there is no reflow of the page's whole height on load. The
   * travel below is still measured, but it drives a transform, and a transform
   * costs no layout.
   */
  const pinned = !shouldReduceMotion && frames.length > 1;

  /*
   * On a desktop the photographs stack instead of panning: at 16:9 the reel is
   * a row of full screens, so panning it is the whole screen sliding sideways,
   * which read as a carousel being thrown rather than a chapter opening.
   * Evaluated on the first client render (see `useMediaQuery`), and the stack's
   * opening frame is the reel's - the first photograph, full bleed - so a
   * desktop never sees the swap.
   */
  const stacked = useMediaQuery(STACK_QUERY) && pinned;

  /*
   * Whether the reel can be left to the compositor.
   *
   * With CSS scroll-driven animations (Safari 26, Chrome 115) the reel's
   * movement is declared in `globals.css` and bound to this block's own pass
   * through the viewport, so the browser moves it in step with the scroll
   * itself, off the main thread. Driving it from here instead means reading
   * the scroll after each event and writing a transform back - which on a
   * phone trails a fast swipe and judders when the main thread is busy. Older
   * browsers keep that path. False on the server and during hydration, so the
   * markup matches; the switch happens on the first client render after.
   */
  const compositorReel = useSyncExternalStore(
    subscribeNever,
    supportsScrollTimelines,
    () => false,
  );

  useEffect(() => {
    const frame = frameRef.current;
    const track = trackRef.current;
    if (!frame || !track) return;

    /*
     * `scrollWidth`, not a measured rect: the track is translated, and a rect
     * would move with it - the overhang would shrink as the reader travelled,
     * which is a feedback loop.
     */
    const measure = () =>
      setTravel(Math.max(0, track.scrollWidth - frame.clientWidth));

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(track);

    return () => observer.disconnect();
    // The track only exists in the reel, so re-measure when the mode changes.
  }, [stacked]);

  /*
   * `start start → end end`: from the moment the tall outer block's top meets
   * the top of the viewport to the moment its bottom does - exactly the window
   * in which the frame below is stuck to the screen.
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

  const x = useTransform(
    scrollYProgress,
    [0, 1],
    direction === "left" ? [0, -travel] : [-travel, 0],
  );

  /*
   * A second window on the same element, and a deliberately different one.
   *
   * `scrollYProgress` above spans the *lock* - it is 0 for the whole time the
   * hero is climbing into view, which is exactly when the fade needs to be
   * happening. This spans the pass instead: the hero's top edge entering at the
   * foot of the viewport through to its bottom edge leaving at the top.
   *
   * It is also what keeps the contact page honest. That hero sits at the top of
   * the document, so its lock progress is 0 the moment the page loads - a fade
   * driven by it would open the page on an invisible `h1`. On the pass, a hero
   * that already fills the screen is a quarter of the way through, which is
   * past the ramp and at full weight.
   */
  const { scrollYProgress: passProgress } = useScroll({
    target: outerRef,
    offset: ["start end", "end start"],
  });

  /*
   * The stack holds the copy for the whole lock rather than a middle third.
   *
   * `FADE_STOPS` are fractions of the pass priced for the reel's budget; at the
   * stack's longer one the same fractions left the title up for only a short
   * stretch mid-reel. Measured in screens instead: the pass is the lock plus a
   * screen either side, so the copy strikes in over the last 0.3 of the hero's
   * arrival, holds from the moment it locks to the moment it releases, and
   * clears over the first 0.3 of its exit.
   */
  const lock = (frames.length - 1) * STACK_DWELL;
  const pass = lock + 2;
  const stackStops = [0, 0.7 / pass, 1 / pass, (lock + 1) / pass, (lock + 1.3) / pass, 1];

  const veil = useTransform(
    passProgress,
    stacked ? stackStops : FADE_STOPS,
    FADE_VALUES,
    { ease: easeInOut },
  );

  return (
    <div
      ref={outerRef}
      /*
       * One screen to hold the hero, plus a dwell for each further frame. The
       * extra height *is* the scroll budget - there is no second "how long
       * should this last" number to keep in step with the photography.
       */
      /*
       * One screen to hold the hero, plus a dwell for each further photograph.
       * The extra height *is* the scroll budget - there is no second "how long
       * should this last" number to keep in step with the photography - and
       * because it counts frames rather than measuring them, it is right on the
       * server and identical on every device.
       *
       * `svh` here against `dvh` in the frame, which is the same split the
       * cinematic hero makes. The document's height has to be a stable number
       * or every address-bar collapse on a phone would resize it by a multiple
       * of the change and shunt the page under the reader's thumb; the frame
       * has the opposite requirement, and has to fill what is visible.
       */
      style={
        pinned
          ? ({
              "--hero-frames": frames.length,
              "--hero-reel-frames": Math.min(frames.length, REEL_FRAMES),
              "--hero-reel-speed": REEL_SPEED,
              "--hero-dwell-stack": STACK_DWELL,
            } as CSSProperties)
          : undefined
      }
      // The height itself is in globals.css, which picks the reel's or the
      // stack's budget at the same `lg` as STACK_QUERY.
      data-pinned-hero={pinned ? "" : undefined}
      className="relative"
    >
      <section
        // Hook for the mobile-landscape block in globals.css.
        data-hero-frame
        data-hero-variant={variant}
        /*
         * `dvh` for the pinned frame, against the `svh` the block above is
         * measured in, and the mismatch is deliberate - the same split the
         * cinematic hero makes for the same reason. The scroll budget has to be
         * a stable number or every address-bar collapse on a phone would resize
         * the document by a multiple of the change and shunt the page under the
         * reader's thumb. The pinned frame has the opposite requirement: it has
         * to fill what is actually visible, or the next section shows in a strip
         * beneath it the moment the bar retracts.
         */
        className={cn(frameClassName, pinned && "sticky top-0 h-[100dvh]")}
      >
        <div
          ref={frameRef}
          aria-hidden
          // The photographs - hidden in Simple mode, see globals.css.
          data-hero-photos
          // `isolate`: the stack's cards order themselves with `z-index`, and
          // without a context of their own here they painted over the filter
          // and the copy that follow.
          className="pointer-events-none absolute inset-0 isolate overflow-hidden"
        >
          {stacked ? (
            frames.map((image, index) => (
              <StackCard
                key={image}
                image={image}
                index={index}
                count={frames.length}
                priority={priority}
                progress={scrollYProgress}
              />
            ))
          ) : (
            <motion.div
              ref={trackRef}
              style={
                !pinned
                  ? undefined
                  : compositorReel
                    ? ({
                        "--reel-from":
                          direction === "left" ? "0px" : `${-travel}px`,
                        "--reel-to":
                          direction === "left" ? `${-travel}px` : "0px",
                      } as CSSProperties)
                    : { x, willChange: "transform" }
              }
              className={cn(
                "flex h-full",
                pinned ? "w-max" : "w-full",
                pinned && compositorReel && "pinned-reel",
              )}
            >
              {frames.map((image, index) => (
                /*
                The reel. Each frame is the photograph at its own shape - full
                height, 16:9 - rather than the shape of the screen, so on a
                phone it is nearly four screen-widths across and the viewport
                travels along it instead of being handed a crop of its middle.

                That is the whole change on mobile. `object-cover` into a
                screen-shaped box was displaying a 1920x1080 photograph 1500px
                wide inside a 390px window and discarding three-quarters of its
                width; `contain` showed all of it but as a 219px band on an
                844px screen. Neither is the picture. A frame the shape of the
                picture, panned, is.

                At 16:9 and wider the frame is simply the screen, which is the
                full-bleed hero it always was.
              */
                <div
                  key={image}
                  className={cn(
                    "relative h-full shrink-0",
                    // Unpinned there is no pan to reveal the rest of a wide
                    // tile, so the photograph fills the screen, centred.
                    pinned ? TILE_WIDTH : "w-full",
                    // Below the desktop stack the reel is cut to its first
                    // few - see `REEL_FRAMES`. Hidden rather than not
                    // rendered, so server and client agree at every width.
                    index >= REEL_FRAMES && "max-lg:hidden",
                  )}
                >
                  <Image
                    src={image}
                    alt=""
                    fill
                    priority={priority && index === 0}
                    /*
                    Mirrors the `max()` above: past 16:9 the frame is the
                    screen, and below it the frame is taller-derived and wider
                    than the screen. `100vw` alone would have a phone fetch a
                    390px file for a frame four times that wide.
                  */
                    sizes="(min-aspect-ratio: 16/9) 100vw, 178vh"
                    // Nothing to crop: the box is the aspect of the photograph.
                    className="object-cover"
                  />
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/*
          The filter over the photography - neutral, no colour cast, so the
          picture reads as itself. Weighted to the bottom and the left, where
          the copy sits.

          It lives here rather than with the copy in `page-hero.tsx` because it
          fades with the section, and the section's progress is a thing only
          this component knows.
        */}
        <motion.div
          aria-hidden
          /*
           * `opacity: 1` when not pinned, never `undefined`. framer writes the
           * veil straight onto the element, and the server renders this pinned
           * (it cannot know the reader's motion setting) with the veil at 0 for
           * any chapter not yet reached. Dropping the style prop afterwards
           * does not reliably take framer's value back off, and on a phone it
           * left whole chapter titles at opacity 0 in Simple mode. An explicit
           * 1 always overwrites it. `data-hero-veil` is the CSS safety net.
           */
          style={pinned ? { opacity: veil } : { opacity: 1 }}
          data-hero-veil
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
        </motion.div>

        {/*
          The copy rises and falls with the filter, on the same value - they
          are one thing arriving and leaving, and driving them apart by even a
          little would read as the title being late rather than as a fade.

          The wrapper is left `static` on purpose. `opacity` makes a stacking
          context but not a containing block, so the scroll cue inside still
          positions against the hero frame the way it did when it was a direct
          child - which `relative` here would quietly break, pinning it to the
          bottom of the copy instead of the bottom of the screen.
        */}
        <motion.div
          // See the veil above: explicit 1, never undefined.
          style={pinned ? { opacity: veil } : { opacity: 1 }}
          data-hero-veil
          className="w-full"
        >
          {children}
        </motion.div>
      </section>
    </div>
  );
}
