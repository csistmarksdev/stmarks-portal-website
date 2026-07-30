"use client";

import type { LocalizedText } from "@portal/shared";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Editor for `LocalizedText[]` — ordered bilingual paragraphs. */
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...paragraphs, { en: "", ta: "" }])}
        >
          <PlusIcon /> Add paragraph
        </Button>
      </div>
      {paragraphs.length === 0 && (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          No paragraphs yet.
        </p>
      )}
      {paragraphs.map((paragraph, index) => (
        <div key={index} className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Paragraph {index + 1}
            </span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => move(index, -1)} disabled={index === 0}>
                <ArrowUpIcon />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => move(index, 1)} disabled={index === paragraphs.length - 1}>
                <ArrowDownIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-destructive"
                onClick={() => onChange(paragraphs.filter((_, i) => i !== index))}
              >
                <Trash2Icon />
              </Button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Textarea
              placeholder="English"
              rows={3}
              value={paragraph.en}
              onChange={(event) => update(index, { ...paragraph, en: event.target.value })}
            />
            <Textarea
              placeholder="தமிழ்"
              rows={3}
              value={paragraph.ta}
              onChange={(event) => update(index, { ...paragraph, ta: event.target.value })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
