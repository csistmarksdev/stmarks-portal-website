"use client";

import type { LocalizedText } from "@portal/shared";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EMPTY: LocalizedText = { en: "", ta: "" };

/**
 * Bilingual field editor — English and Tamil side by side, because the
 * Website renders an empty string (no fallback) when a language is missing.
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
  rows?: number;
}) {
  const current = value ?? EMPTY;
  const Control = multiline ? Textarea : Input;

  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Control
            placeholder="English"
            value={current.en}
            required={required}
            rows={multiline ? rows : undefined}
            onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              onChange({ ...current, en: event.target.value })
            }
          />
          <p className="mt-0.5 text-[11px] text-muted-foreground">English</p>
        </div>
        <div>
          <Control
            placeholder="தமிழ்"
            value={current.ta}
            rows={multiline ? rows : undefined}
            onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              onChange({ ...current, ta: event.target.value })
            }
          />
          <p className="mt-0.5 text-[11px] text-muted-foreground">Tamil</p>
        </div>
      </div>
    </div>
  );
}
