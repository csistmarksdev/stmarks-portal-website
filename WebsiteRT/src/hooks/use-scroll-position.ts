"use client";

import { useEffect, useState } from "react";

import { usePathname } from "@/i18n/navigation";

/**
 * Reports whether the page has scrolled past `threshold` pixels.
 * Used by the header to swap from transparent to its glass treatment.
 */
export function useScrolledPast(threshold = 24): boolean {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  /*
   * Reset scroll state synchronously on route navigation so the new page
   * starts at top threshold before paint, avoiding stale scrolled state.
   */
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    setScrolled(false);
  }

  useEffect(() => {
    let ticking = false;

    const update = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        setScrolled(window.scrollY > threshold);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => window.removeEventListener("scroll", update);
  }, [threshold]);

  return scrolled;
}

