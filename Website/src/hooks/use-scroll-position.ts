"use client";

import { useEffect, useState } from "react";

/**
 * Reports whether the page has scrolled past `threshold` pixels.
 * Used by the header to swap from transparent to its glass treatment.
 */
export function useScrolledPast(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);

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
