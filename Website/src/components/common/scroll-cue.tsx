"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export interface ScrollCueProps {
  className?: string;
}

/**
 * "Scroll to explore" hint that sits at the foot of a hero.
 *
 * Shared by the cinematic home stage and every inner-page hero so the gesture
 * reads the same everywhere. The mouse glyph is decorative — the label carries
 * it for screen readers.
 */
export function ScrollCue({ className }: ScrollCueProps) {
  const t = useTranslations("common");

  return (
    <div className={cn("flex justify-center", className)}>
      <div className="flex items-center gap-3 text-white/70">
        <span
          aria-hidden
          className="relative flex h-9 w-5 items-start justify-center rounded-full border border-white/40 p-1"
        >
          <span className="h-2 w-0.5 animate-bounce rounded-full bg-white/70" />
        </span>
        <span className="text-xs uppercase tracking-[0.18em]">
          {t("scrollToExplore")}
        </span>
      </div>
    </div>
  );
}
