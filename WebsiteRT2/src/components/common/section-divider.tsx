import { IlluminatedDivider } from "@/components/common/ornament";
import { cn } from "@/lib/utils";

export interface SectionDividerProps {
  /** Match the ground it sits on so the rules fade into it correctly. */
  tone?: "light" | "dark";
  className?: string;
}

/**
 * A quiet flourish between two sections that share a ground, where a tone change
 * would otherwise be the only thing separating them. The redesign's illuminated
 * divider - the crimson cross of the crest struck between two gilded rules that
 * bloom toward it - so the pause reads as a caesura in worship rather than a
 * hard rule across the measure.
 *
 * Purely decorative: hidden from assistive tech, no focus stop.
 */
export function SectionDivider({
  tone = "light",
  className,
}: SectionDividerProps) {
  return (
    <div className={cn("py-14 sm:py-16", className)}>
      <IlluminatedDivider tone={tone === "dark" ? "onDark" : "default"} />
    </div>
  );
}
