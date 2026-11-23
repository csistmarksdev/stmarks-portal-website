"use client";

import { LanguagesIcon } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import {
  registerBilingualField,
  useIsFirstBilingualField,
  useLanguageView,
  type LanguageView,
} from "@/lib/language-view";
import { cn } from "@/lib/utils";

const OPTIONS: { value: LanguageView; label: string; title: string }[] = [
  { value: "en", label: "English", title: "Show English" },
  { value: "ta", label: "தமிழ்", title: "Show Tamil" },
  { value: "both", label: "Side by side", title: "Show English and Tamil together" },
];

/** English / Tamil / Side-by-side segmented switch. */
export function LanguageToggle({
  view,
  onChange,
  className,
}: {
  view: LanguageView;
  onChange: (next: LanguageView) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Language"
      className={cn("inline-flex shrink-0 gap-0.5 rounded-full bg-muted p-1", className)}
    >
      {OPTIONS.map(({ value, label, title }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={view === value}
          title={title}
          onClick={() => onChange(value)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[13px] font-medium leading-none transition-colors",
            view === value
              ? "bg-card text-foreground shadow-sm ring-1 ring-border/70"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Registers a bilingual field and tells it whether it is the page's first —
 * the one that carries the language bar. Attach `ref` to the field's root.
 */
export function useBilingualField() {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return registerBilingualField(id, ref.current);
  }, [id]);
  return { ref, isFirst: useIsFirstBilingualField(id) };
}

/** The language bar itself — rendered by the page's first bilingual field. */
export function LanguageBarView() {
  const [view, setView] = useLanguageView();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-muted/60 py-2 pl-4 pr-2 ring-1 ring-border/60">
      <p className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground">
        <LanguagesIcon className="size-4 shrink-0" />
        <span className="font-medium text-foreground">Language</span>
        <span className="hidden truncate md:inline">— fill in English and Tamil</span>
      </p>
      <LanguageToggle view={view} onChange={setView} />
    </div>
  );
}

/**
 * Places the page's language bar explicitly — for layouts where the first
 * bilingual field sits in a narrow column and would squeeze the bar. Put it
 * before the fields; being first in the page, it takes the bar over from them.
 */
export function LanguageBar({ className }: { className?: string }) {
  const { ref, isFirst } = useBilingualField();
  return (
    <div ref={ref} className={className}>
      {isFirst && <LanguageBarView />}
    </div>
  );
}

/**
 * Right-aligned note on a field's label row when the language not on screen
 * is still empty — so nothing is forgotten while working in one language.
 * Sized to the label's line so the row height never changes.
 */
export function MissingLanguageNote({
  view,
  missing,
}: {
  view: LanguageView;
  missing: { en: boolean; ta: boolean };
}) {
  // Only once the language on screen has text: on an empty form every field
  // would otherwise be flagged before the writer has started.
  const hidden =
    view === "en" && !missing.en && missing.ta
      ? "Tamil"
      : view === "ta" && !missing.ta && missing.en
        ? "English"
        : null;
  if (!hidden) return null;
  return (
    <span className="text-xs leading-none text-accent-fg">{hidden} still to fill in</span>
  );
}
