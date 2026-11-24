"use client";

import type { LocalizedText } from "@portal/shared";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguageView } from "@/lib/language-view";
import { cn } from "@/lib/utils";
import {
  LanguageBarView,
  MissingLanguageNote,
  useBilingualField,
} from "@/components/admin/language-toggle";
import { visibleLanguages } from "@/components/admin/localized-field";
import { AutoTextarea } from "@/components/ui/auto-textarea";

/** Editor for `LocalizedText[]` - ordered bilingual paragraphs. */
export function ParagraphsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: LocalizedText[];
  onChange: (next: LocalizedText[]) => void;
}) {
  const paragraphs = value ?? [];
  const [view] = useLanguageView();
  const both = view === "both";
  const { ref, isFirst } = useBilingualField();

  const update = (index: number, next: LocalizedText) => {
    onChange(paragraphs.map((p, i) => (i === index ? next : p)));
  };
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= paragraphs.length) return;
    const next = [...paragraphs];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div ref={ref} className="space-y-2">
      {isFirst && <LanguageBarView />}
      {isFirst && <div aria-hidden className="h-1" />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <MissingLanguageNote
            view={view}
            missing={{
              en: paragraphs.length === 0 || paragraphs.some((paragraph) => !paragraph.en.trim()),
              ta: paragraphs.length === 0 || paragraphs.some((paragraph) => !paragraph.ta.trim()),
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...paragraphs, { en: "", ta: "" }])}
          >
            <PlusIcon /> Add paragraph
          </Button>
        </div>
      </div>
      {paragraphs.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No paragraphs yet.
        </p>
      )}
      {paragraphs.map((paragraph, index) => (
        <div key={index} className="space-y-3 rounded-2xl border border-border/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Paragraph {index + 1}
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => move(index, -1)}
                disabled={index === 0}
              >
                <ArrowUpIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => move(index, 1)}
                disabled={index === paragraphs.length - 1}
              >
                <ArrowDownIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-destructive"
                onClick={() =>
                  onChange(paragraphs.filter((_, i) => i !== index))
                }
              >
                <Trash2Icon />
              </Button>
            </div>
          </div>
          <div className={cn("grid gap-x-3 gap-y-2", both && "md:grid-cols-2")}>
            {visibleLanguages(view).map(({ locale, caption, placeholder }) => (
              <label key={locale} className="flex flex-col gap-1">
                {both && (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {caption}
                  </span>
                )}
                <AutoTextarea
                  lang={locale}
                  aria-label={`Paragraph ${index + 1}, ${caption}`}
                  stretch={both}
                  placeholder={placeholder}
                  value={paragraph[locale]}
                  onChange={(event) =>
                    update(index, {
                      ...paragraph,
                      [locale]: event.target.value,
                    })
                  }
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
