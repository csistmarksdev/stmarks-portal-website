"use client";

import {
  motionValue,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useScrolledPast } from "@/hooks/use-scroll-position";
import { usePathname } from "@/i18n/navigation";

interface HeroScrollContextValue {
  /** 0 → 1 progress through the cinematic hero section. */
  progress: MotionValue<number>;
  /** True while a cinematic hero is mounted on the current page. */
  hasHero: boolean;
  /** Called by the hero on mount; returns its own cleanup. */
  registerHero: () => () => void;
  /**
   * True while a dark, full-bleed hero sits directly behind the header.
   *
   * The bar is transparent and full width over media and a glass pill over
   * page content, and on a single page carrying nine heroes it has to be able
   * to change its mind more than once.
   */
  heroUnderHeader: boolean;
  /** Adds a hero frame to the set that is checked against the bar. */
  registerHeroFrame: (element: HTMLElement) => () => void;
}

const HeroScrollContext = createContext<HeroScrollContextValue | null>(null);

/** A little slack, so the swap happens as the hero meets the bar, not after. */
const SLACK = 8;

/**
 * Shares the cinematic hero's scroll progress with components outside it -
 * chiefly the site header, which must stay transparent for the whole hero
 * rather than switching to glass after a few pixels of scroll.
 *
 * Progress is a MotionValue, so overlay animations read it without causing
 * a React re-render on every frame.
 */
export function HeroScrollProvider({ children }: { children: ReactNode }) {
  const [heroCount, setHeroCount] = useState(0);

  /*
   * Is any hero currently behind the bar?
   *
   * Answered here, from one scroll listener over a set of registered frames,
   * rather than by each hero reporting its own answer from an
   * IntersectionObserver. The observer version worked on a desktop and was
   * unreliable on a phone, and the reason is worth keeping: an observer's
   * `rootMargin` is in pixels, so the band it watches had to be computed from
   * `window.innerHeight` - which is exactly the number that lies while a mobile
   * address bar is collapsing. The band was rebuilt on `resize`, an event iOS
   * does not reliably send for that, so the band drifted out of step with the
   * viewport it was meant to describe.
   *
   * Two rectangles in the same coordinate space cannot drift. The header's own
   * rect gives the line to test against, every frame, whatever the browser
   * chrome is doing.
   */
  const [underHeader, setUnderHeader] = useState(false);

  const framesRef = useRef<Set<HTMLElement>>(new Set());
  const scheduleRef = useRef<(() => void) | null>(null);

  const registerHeroFrame = useCallback((element: HTMLElement) => {
    framesRef.current.add(element);
    scheduleRef.current?.();

    return () => {
      framesRef.current.delete(element);
      scheduleRef.current?.();
    };
  }, []);

  useEffect(() => {
    let ticking = false;

    const measure = () => {
      ticking = false;

      /*
       * The header's underside, in client coordinates - the same space the
       * frames are measured in, so no viewport arithmetic comes into it. Read
       * fresh each pass because the bar changes size between its two states,
       * and a stale line would make the swap hysteretic in the wrong direction.
       */
      const header = document.querySelector<HTMLElement>("[data-site-header]");
      const bar = header?.getBoundingClientRect();
      const top = bar?.top ?? 0;
      const line = (bar?.bottom ?? 60) + SLACK;

      let under = false;

      for (const frame of framesRef.current) {
        const rect = frame.getBoundingClientRect();

        // Crosses the bar: starts at or above its underside, and has not yet
        // finished passing its top edge.
        if (rect.top <= line && rect.bottom > top) {
          under = true;
          break;
        }
      }

      setUnderHeader((shown) => (shown === under ? shown : under));
    };

    const schedule = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    };

    scheduleRef.current = schedule;
    schedule();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // The one that actually fires when a mobile address bar moves.
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);

    return () => {
      scheduleRef.current = null;
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, []);

  // Created once; the hero writes to it from its scroll handler.
  const progress = useMemo(() => motionValue(0), []);

  const registerHero = useCallback(() => {
    setHeroCount((count) => count + 1);

    return () => {
      setHeroCount((count) => Math.max(0, count - 1));
      progress.set(0);
    };
  }, [progress]);

  const value = useMemo<HeroScrollContextValue>(
    () => ({
      progress,
      hasHero: heroCount > 0,
      registerHero,
      heroUnderHeader: underHeader,
      registerHeroFrame,
    }),
    [progress, heroCount, registerHero, underHeader, registerHeroFrame],
  );

  return (
    <HeroScrollContext.Provider value={value}>
      {children}
    </HeroScrollContext.Provider>
  );
}

export function useHeroScroll(): HeroScrollContextValue {
  const context = useContext(HeroScrollContext);

  if (!context) {
    throw new Error("useHeroScroll must be used within a HeroScrollProvider");
  }

  return context;
}

/**
 * True once the page has scrolled past its opening - the moment page chrome
 * (the header's glass surface, the back-to-top button) is allowed to appear.
 *
 * On a cinematic page that means the whole hero has played out; everywhere
 * else the first section is a short PageHero, so a plain scroll threshold is
 * the right measure.
 *
 * The cinematic branch is latched with hysteresis and only re-renders on an
 * actual flip. `progress` changes on every frame of an 800vh scroll, so a bare
 * `setState(value > threshold)` handed React an update on all of them - and a
 * single threshold made everything keyed off this flip-flop while the reader
 * hovered near the end of the hero, restarting each element's transition every
 * time. Separate on/off points give it somewhere to settle.
 */
export function usePastOpening(threshold = 24): boolean {
  const { progress, hasHero } = useHeroScroll();
  const scrolled = useScrolledPast(threshold);
  const pathname = usePathname();

  /*
   * Seeded from the value as it stands, not from `false`.
   *
   * `useMotionValueEvent` fires on *change*, so a latch that starts false is
   * only ever corrected by the next movement - and there are two ways to mount
   * this hook onto a value that has already settled and will not move again
   * until the reader scrolls. Landing on `/#downloads`, from a redirected old
   * path or from a nav click on the contact page, is one: the page is scrolled
   * to a chapter before the header has anything to subscribe to, so the value
   * is 1 and stays 1. The header would render its transparent, over-media state
   * on top of a light section until the reader moved.
   */
  const [heroComplete, setHeroComplete] = useState(() => progress.get() > 0.97);

  /*
   * Adjusting state during render on a route change - the sanctioned React
   * pattern, and better than an effect, which would paint the previous page's
   * latched value for a frame before correcting it.
   *
   * Re-read rather than reset to false, for the same reason as the seed above:
   * arriving somewhere with a fragment can leave the value settled before the
   * first change event this hook would ever see.
   */
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    setHeroComplete(progress.get() > 0.97);
  }

  useMotionValueEvent(progress, "change", (value) => {
    /*
     * The latch reads its own previous value through the updater rather than a
     * ref. A ref would have to be written to keep the two in step - during
     * render on a route change, which React forbids and which surfaced as
     * "Cannot update ref during render" and, in StrictMode, as a state update
     * on an unmounted component. The updater form has no such shadow copy, and
     * it keeps the property the ref was there for: React bails out of the
     * re-render when the returned value is unchanged, so the flip-flop still
     * costs nothing on the frames where it does not flip.
     */
    setHeroComplete((complete) => (complete ? value > 0.95 : value > 0.97));
  });

  return hasHero ? heroComplete : scrolled;
}

