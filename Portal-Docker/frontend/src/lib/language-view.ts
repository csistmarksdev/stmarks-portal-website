"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Which language the bilingual fields show: one at a time, or both side by
 * side. One preference for the whole CMS — switching it in any field (or in
 * the blog editor) switches every field, and it is remembered between visits.
 */
export type LanguageView = "en" | "ta" | "both";

const KEY = "portal.bilingual-editor.view";
const EVENT = "portal:language-view";
const DEFAULT: LanguageView = "en";

/** Fallback when storage is blocked (private mode, policy). */
let memory: LanguageView | null = null;

function read(): LanguageView {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "en" || saved === "ta" || saved === "both") return saved;
  } catch {
    // Fall through to the in-memory choice.
  }
  return memory ?? DEFAULT;
}

function subscribe(onChange: () => void): () => void {
  // Same tab: our own event. Other tabs: the storage event.
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

export function useLanguageView(): [LanguageView, (next: LanguageView) => void] {
  // The server render (and first client frame) uses the default, so hydration
  // matches; the saved choice applies straight after.
  const view = useSyncExternalStore(subscribe, read, () => DEFAULT);
  const set = useCallback((next: LanguageView) => {
    memory = next;
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Not persisted, but still applied for this page.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [view, set];
}

/* -------------------------------------------------------------------------- */
/* One switch per page                                                        */
/* -------------------------------------------------------------------------- */

/*
 * Every bilingual field registers its element here, and only the first one in
 * document order shows the language switch. A form gets exactly one switch, at
 * the top of its bilingual fields, without each page having to place it — and
 * the fields themselves keep plain label rows that line up with their
 * neighbours.
 */

const fields = new Map<string, HTMLElement>();
const fieldListeners = new Set<() => void>();
let firstId: string | null = null;

function recompute() {
  let first: [string, HTMLElement] | null = null;
  for (const entry of fields) {
    if (
      !first ||
      entry[1].compareDocumentPosition(first[1]) & Node.DOCUMENT_POSITION_FOLLOWING
    ) {
      first = entry;
    }
  }
  const next = first?.[0] ?? null;
  if (next === firstId) return;
  firstId = next;
  fieldListeners.forEach((listener) => listener());
}

export function registerBilingualField(id: string, element: HTMLElement): () => void {
  fields.set(id, element);
  recompute();
  return () => {
    fields.delete(id);
    recompute();
  };
}

function subscribeFields(listener: () => void) {
  fieldListeners.add(listener);
  return () => fieldListeners.delete(listener);
}

/** True for the bilingual field that should carry the page's language switch. */
export function useIsFirstBilingualField(id: string): boolean {
  return useSyncExternalStore(
    subscribeFields,
    () => firstId === id,
    () => false,
  );
}
