"use client";

import { useEffect, useState } from "react";

import { usePathname } from "@/i18n/navigation";

/**
 * A band across the middle of the viewport - the part a reader is actually
 * reading. A section counts as current while it crosses this band, so the
 * menu changes at the moment the reader's eye does rather than the moment a
 * section's top edge clips the bottom of the screen.
 */
const READING_BAND = "-45% 0px -50% 0px";

/**
 * Which of the given sections the reader is in, or null when none of them is.
 *
 * The site is one page, so the header can no longer tell you where you are by
 * comparing the pathname to a link: every top-level item now points at `/`
 * with a fragment, and the pathname is `/` for all of them. This watches the
 * sections themselves instead.
 *
 * `ids` must be a stable array - a module constant, or something memoized.
 * The observer is torn down and rebuilt whenever it changes, and rebuilding it
 * on every render would mean never observing anything.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  const pathname = usePathname();

  /*
   * Clear the highlight on navigation.
   *
   * The sections exist on the home page and nowhere else, so arriving at
   * `/contact` must not leave the last chapter of the home page lit. Adjusted
   * during render rather than from the effect below - React discards this pass
   * and re-runs immediately, so the new page's first paint already has nothing
   * highlighted, where an effect would show the stale item for a frame.
   */
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    setActive(null);
  }

  useEffect(() => {
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);

    // Nothing to watch - a page without chapters. The reset above has already
    // cleared whatever the previous page had lit.
    if (nodes.length === 0) return;

    /*
     * Which sections currently cross the band, as a set rather than a "last
     * one seen". Two chapters overlap the band for a frame or two at every
     * boundary, and taking whichever entry the observer happened to report
     * last made the menu flicker between them; taking the first in page order
     * resolves the overlap the way the reader does - the one they are leaving
     * stays current until it is gone.
     */
    const crossing = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) crossing.add(entry.target.id);
          else crossing.delete(entry.target.id);
        }

        const next = ids.find((id) => crossing.has(id)) ?? null;

        setActive((current) => (current === next ? current : next));
      },
      { rootMargin: READING_BAND },
    );

    for (const node of nodes) observer.observe(node);

    return () => observer.disconnect();
  }, [ids, pathname]);

  return active;
}
