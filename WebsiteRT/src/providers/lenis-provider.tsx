"use client";

import Lenis from "lenis";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import { usePathname } from "@/i18n/navigation";

interface LenisContextValue {
  /**
   * Sends the page back to the very top, through Lenis when it is driving.
   *
   * Calling `window.scrollTo` directly would set the native offset behind
   * Lenis's back; Lenis would keep its own target and drag the page straight
   * back on the next wheel tick. Routing through the instance keeps one owner
   * of the scroll position.
   */
  scrollToTop: () => void;
}

const LenisContext = createContext<LenisContextValue | null>(null);

/**
 * Smooth scrolling.
 *
 * Lenis drives `window.scrollY` itself, so the cinematic hero's scroll
 * listener keeps working unchanged — it still reads real scroll positions.
 *
 * Disabled entirely when the user prefers reduced motion, and on touch
 * devices, where native momentum scrolling feels better than an emulated one.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Null whenever Lenis is not driving — before mount, and for the whole
  // session under reduced motion.
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;


    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Native scrolling on touch; emulated momentum feels wrong on mobile.
      syncTouch: false,
    });

    lenisRef.current = lenis;

    let frame = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };

    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollToTop = useCallback(() => {
    const lenis = lenisRef.current;

    if (lenis) {
      lenis.scrollTo(0);
      return;
    }

    // No Lenis means the reader asked for reduced motion, so an instant jump
    // is the correct behaviour rather than a fallback.
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const value = useMemo<LenisContextValue>(() => ({ scrollToTop }), [
    scrollToTop,
  ]);

  return (
    <LenisContext.Provider value={value}>{children}</LenisContext.Provider>
  );
}

export function useLenis(): LenisContextValue {
  const context = useContext(LenisContext);

  if (!context) {
    throw new Error("useLenis must be used within a LenisProvider");
  }

  return context;
}
