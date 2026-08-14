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
}

const HeroScrollContext = createContext<HeroScrollContextValue | null>(null);

/**
 * Shares the cinematic hero's scroll progress with components outside it —
 * chiefly the site header, which must stay transparent for the whole hero
 * rather than switching to glass after a few pixels of scroll.
 *
 * Progress is a MotionValue, so overlay animations read it without causing
 * a React re-render on every frame.
 */
export function HeroScrollProvider({ children }: { children: ReactNode }) {
  const [heroCount, setHeroCount] = useState(0);

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
    () => ({ progress, hasHero: heroCount > 0, registerHero }),
    [progress, heroCount, registerHero],
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
 * True once the page has scrolled past its opening — the moment page chrome
 * (the header's glass surface, the back-to-top button) is allowed to appear.
 *
 * On a cinematic page that means the whole hero has played out; everywhere
 * else the first section is a short PageHero, so a plain scroll threshold is
 * the right measure.
 *
 * The cinematic branch is latched with hysteresis and only re-renders on an
 * actual flip. `progress` changes on every frame of an 800vh scroll, so a bare
 * `setState(value > threshold)` handed React an update on all of them — and a
 * single threshold made everything keyed off this flip-flop while the reader
 * hovered near the end of the hero, restarting each element's transition every
 * time. Separate on/off points give it somewhere to settle.
 */
export function usePastOpening(threshold = 24): boolean {
  const { progress, hasHero } = useHeroScroll();
  const scrolled = useScrolledPast(threshold);
  const pathname = usePathname();

  const [heroComplete, setHeroComplete] = useState(false);
  const heroCompleteRef = useRef(false);

  const [renderedPath, setRenderedPath] = useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    heroCompleteRef.current = false;
    setHeroComplete(false);
  }

  useMotionValueEvent(progress, "change", (value) => {
    const complete = heroCompleteRef.current ? value > 0.95 : value > 0.97;
    if (complete === heroCompleteRef.current) return;

    heroCompleteRef.current = complete;
    setHeroComplete(complete);
  });

  return hasHero ? heroComplete : scrolled;
}

