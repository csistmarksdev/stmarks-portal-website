"use client";

import { useSyncExternalStore } from "react";

import {
  isMotionReduced,
  isSimpleMode,
  subscribeMotion,
} from "@/lib/motion-preference";

/**
 * Whether to render the still version of something: true under the device's
 * `prefers-reduced-motion` *or* the site's own Simple mode.
 *
 * The drop-in for framer-motion's `useReducedMotion`, which only knows about
 * the device - every animated component asks this instead, so the site switch
 * reaches all of them.
 *
 * `false` on the server and during hydration, so the markup always matches;
 * the still version takes over on the first client render after.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeMotion, isMotionReduced, () => false);
}

/** Whether the site's own Simple mode switch is on (not the device setting). */
export function useSimpleMode(): boolean {
  return useSyncExternalStore(subscribeMotion, isSimpleMode, () => false);
}
