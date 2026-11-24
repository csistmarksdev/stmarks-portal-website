"use client";

import type { LocalizedText } from "@portal/shared";

import {
  LanguageBarView,
  MissingLanguageNote,
  useBilingualField,
} from "@/components/admin/language-toggle";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Label } from "@/components/ui/label";
import { useLanguageView, type LanguageView } from "@/lib/language-view";
import { cn } from "@/lib/utils";

const EMPTY: LocalizedText = { en: "", ta: "" };

export const LANGUAGES = [
  { locale: "en", caption: "English", placeholder: "In English" },
  { locale: "ta", caption: "தமிழ் · Tamil", placeholder: "தமிழில்" },
] as const;

export function visibleLanguages(view: LanguageView) {
  return LANGUAGES.filter(({ locale }) => view === "both" || view === locale);
}

/**
 * Bilingual field editor. The Website renders an empty string (no fallback)
 * when a language is missing, so both matter - but writing them in two cramped
 * columns is miserable, so the field shows one language at a time at full
 * width, or both side by side, by choice. The choice is shared by every field
 * in the CMS (see `useLanguageView`) and set from one bar per page, shown above
 * the page's first bilingual field. While one language is on screen, a note on
 * the label row flags the other if it still needs filling in.
 *
 * Every box grows with its text. Short fields (titles, names) wrap rather than
 * scroll out of sight; Enter still does not add a line break there, since the
 * website shows them on one line. Side by side, the two boxes keep the same
 * height however unevenly the languages run.
 */
export function LocalizedField({
  label,
  value,
  onChange,
  multiline = false,
  required = false,
  rows = 3,
}: {
  label: string;
  value?: LocalizedText;
  onChange: (next: LocalizedText) => void;
  multiline?: boolean;
  required?: boolean;
  /** Minimum height, in lines, for a multiline field. */
  rows?: number;
}) {
  const current = value ?? EMPTY;
  const [view] = useLanguageView();
  const both = view === "both";
  const { ref, isFirst } = useBilingualField();
  const filled = { en: !!current.en.trim(), ta: !!current.ta.trim() };

  return (
    <div ref={ref} className="space-y-1.5">
      {isFirst && <LanguageBarView />}
      {isFirst && <div aria-hidden className="h-2" />}
      <div className="flex items-baseline justify-between gap-3">
        <Label>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        {/* Flags the language off screen once this one has text to translate. */}
        <MissingLanguageNote view={view} missing={{ en: !filled.en, ta: !filled.ta }} />
      </div>
      <div className={cn("grid gap-x-3 gap-y-2", both && "md:grid-cols-2")}>
        {visibleLanguages(view).map(({ locale, caption, placeholder }) => (
          <label key={locale} className="flex flex-col gap-1">
            {both && (
              <span className="text-xs font-medium text-muted-foreground">{caption}</span>
            )}
            <AutoTextarea
              lang={locale}
              aria-label={`${label}, ${caption}`}
              singleLine={!multiline}
              minRows={multiline ? rows : 1}
              stretch={both}
              placeholder={placeholder}
              value={current[locale]}
              required={required && locale === "en"}
              onChange={(event) => onChange({ ...current, [locale]: event.target.value })}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
