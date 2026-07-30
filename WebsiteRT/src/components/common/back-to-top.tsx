"use client";

import { ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { usePastOpening } from "@/providers/hero-scroll-provider";
import { useLenis } from "@/providers/lenis-provider";
import { cn } from "@/lib/utils";

/**
 * Returns the reader to the top of the page in one gesture.
 *
 * Appears on the same signal as the header's glass surface, so on the home
 * page it stays out of the way for the whole cinematic sequence — where the
 * scroll cue and progress rule already own the foot of the screen — and only
 * joins once the page proper begins.
 *
 * The transition is CSS rather than a motion component so the global
 * `prefers-reduced-motion` rule flattens it along with everything else; the
 * scroll itself is instant for those readers, handled in `useLenis`.
 */
export function BackToTop() {
  const t = useTranslations("common");
  const { scrollToTop } = useLenis();
  const visible = usePastOpening(600);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      // `invisible` rather than `aria-hidden`: it takes the button out of the
      // tab order and the accessibility tree together, so a keyboard reader
      // never lands on a control they cannot see.
      className={cn(
        "glass fixed bottom-6 right-6 z-40 grid size-11 place-items-center rounded-full border border-[var(--border)] text-[var(--foreground)] shadow-lg shadow-sand-900/10 transition-all duration-300 ease-[var(--ease-out-expo)]",
        "hover:border-brand-300 hover:text-[var(--primary)] active:scale-95",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none invisible translate-y-3 opacity-0",
      )}
    >
      <span className="sr-only">{t("backToTop")}</span>
      <ArrowUp aria-hidden className="size-5" />
    </button>
  );
}
