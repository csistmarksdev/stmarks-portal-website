"use client";

import { useEffect, useState } from "react";

/**
 * Trails `value` by `delay`, so a value driven by typing settles before it is
 * used as a query key. Without this every keystroke in a search box fires its
 * own request — "christmas" is nine round trips, eight of them already stale
 * by the time they land.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
