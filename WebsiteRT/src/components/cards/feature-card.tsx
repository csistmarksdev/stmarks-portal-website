import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Which crest colour tints the tablet's details — the azure or the gilding. */
  accent?: "brand" | "gold";
  className?: string;
}

const ACCENTS = {
  brand: {
    icon: "bg-brand-50 text-brand-700 ring-brand-500/25",
    mark: "text-brand-900/[0.05]",
  },
  gold: {
    icon: "bg-accent-50 text-accent-700 ring-accent-500/30",
    mark: "text-accent-800/[0.06]",
  },
} as const;

/**
 * A statement tablet — vision & mission set as illuminated leaves rather than
 * inked gradient panels. A warm parchment ground carries a gilded inner frame,
 * a line icon in a tinted ring, the statement in the display serif over a
 * gilded rule, and the initial of the statement standing behind it as a faint
 * versal, the way a scribe would open a passage. Deep ink on ivory, so the two
 * tablets read as one considered pair distinguished only by their accent.
 */
export function FeatureCard({
  icon: Icon,
  title,
  body,
  accent = "brand",
  className,
}: FeatureCardProps) {
  const tone = ACCENTS[accent];
  const initial = title.trim().charAt(0);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-card bg-[var(--surface)] p-8 shadow-card ring-1 ring-[var(--border)] transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:shadow-card-hover sm:p-10",
        className,
      )}
    >
      {/* Gilded inner frame — a hairline set in from the edge, like a ruled
          margin on a manuscript leaf. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-4 rounded-[2px] ring-1 ring-accent-500/20"
      />

      {/* Versal initial, standing behind the text. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-2 -top-8 select-none font-display text-[10rem] font-semibold leading-none",
          tone.mark,
        )}
      >
        {initial}
      </span>

      <span
        aria-hidden
        className={cn(
          "relative grid size-14 place-items-center rounded-full ring-1 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-1",
          tone.icon,
        )}
      >
        <Icon className="size-6" strokeWidth={1.5} />
      </span>

      <h3 className="relative mt-7 font-display text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
        {title}
      </h3>

      <span aria-hidden className="relative mt-4 block h-px w-16 rule-section" />

      <p className="relative mt-5 text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">
        {body}
      </p>
    </article>
  );
}
