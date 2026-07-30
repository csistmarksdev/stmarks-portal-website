"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query.
 *
 * Built on `useSyncExternalStore` rather than `useState` + `useEffect`. Beyond
 * avoiding the cascading render, it reads the value *during* the first client
 * render instead of after a paint, so a consumer never briefly sees the wrong
 * answer. That matters for `prefers-reduced-motion`: a single render of
 * `false` is long enough for the cinematic hero to begin fetching frames a
 * reduced-motion visitor should never download.
 *
 * Returns false during SSR, where no media query can be evaluated.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
