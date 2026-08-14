"use client";

import { useEffect, useState } from "react";

/**
 * Tracks a CSS media query from JavaScript.
 *
 * For the cases a Tailwind breakpoint class cannot cover: not "style this
 * differently at that width" but "do not render this at all". A dialog is the
 * example — it portals an overlay to the end of `<body>`, so hiding its content
 * with `xl:hidden` leaves the backdrop behind, dimming and blurring a page that
 * has no dialog visible on it.
 *
 * Starts `false` and corrects itself in an effect. Deliberate: the server has no
 * viewport, so any other initial value is a guess that React would flag as a
 * hydration mismatch. Callers should treat `false` as "not yet known to be
 * wide", which is why it suits hiding an overlay rather than showing one.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
