import type { LocalizedText } from "@portal/shared";

/** Human-readable size string, e.g. "1.2 MB" — computed at upload time. */
export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes;
  let unit = "B";
  for (const next of units) {
    if (value < 1024) break;
    value /= 1024;
    unit = next;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${unit}`;
}

/** Reading time estimate from ordered paragraphs (~200 wpm, English text). */
export function readingMinutes(body: LocalizedText[]): number {
  const words = body
    .map((paragraph) => paragraph.en)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
