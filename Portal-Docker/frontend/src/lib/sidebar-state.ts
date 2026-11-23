"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the desktop sidebar is collapsed to an icon rail. Shared by the
 * sidebar and the layout (whose left padding follows it), and remembered
 * between visits.
 */
const KEY = "portal.sidebar.collapsed";
const EVENT = "portal:sidebar";
let memory = false;

function read(): boolean {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved !== null) return saved === "1";
  } catch {
    // Storage blocked: fall back to memory.
  }
  return memory;
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSidebarCollapsed(): [boolean, (next: boolean) => void] {
  // Expanded on the server and first frame, so hydration matches.
  const collapsed = useSyncExternalStore(subscribe, read, () => false);
  const set = useCallback((next: boolean) => {
    memory = next;
    try {
      window.localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      // Not persisted, still applied.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [collapsed, set];
}
