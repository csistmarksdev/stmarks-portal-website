import { cn } from "@/lib/utils";

/**
 * Liturgical cross mark — the redesign's section ornament, lifted from the
 * cross at the heart of the parish crest. Replaces the broadsheet folio number
 * as the thing that opens a masthead: a small crimson cross, optionally haloed
 * by a faint gilded ring, so every section is headed by the same sacred sign
 * rather than a printed folio.
 */
export function CrossMark({
  className,
  size = "md",
  tone = "sacred",
  halo = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  tone?: "sacred" | "gold" | "onDark";
  halo?: boolean;
}) {
  const dims = { sm: "size-6", md: "size-8", lg: "size-11" }[size];
  const color =
    tone === "gold"
      ? "text-accent-600"
      : tone === "onDark"
        ? "text-accent-300"
        : "text-sacred";

  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-grid shrink-0 place-items-center",
        dims,
        className,
      )}
    >
      {halo ? (
        <span
          className={cn(
            "absolute inset-0 rounded-full",
            tone === "onDark"
              ? "bg-accent-300/10 ring-1 ring-accent-300/20"
              : "bg-accent-500/8 ring-1 ring-accent-500/15",
          )}
        />
      ) : null}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={cn("relative size-[55%]", color)}
      >
        <path d="M10.6 2h2.8v4.2H19v2.8h-5.6V22h-2.8V9H5V6.2h5.6V2Z" />
      </svg>
    </span>
  );
}

/**
 * Sanctuary motes — a scattering of gilded diamonds that drift slowly behind an
 * emotional section, like dust caught in light through a window. Purely
 * decorative and hidden from assistive tech; the drift stills under
 * `prefers-reduced-motion`. Kept sparse and low-contrast so it reads as depth,
 * never as confetti.
 */
export function SanctuaryMotes({
  tone = "onDark",
  className,
}: {
  tone?: "default" | "onDark";
  className?: string;
}) {
  const dot =
    tone === "onDark" ? "bg-accent-300/35" : "bg-accent-500/25";

  const motes = [
    "left-[9%] top-[22%] size-2 float-a",
    "left-[84%] top-[16%] size-1.5 float-b",
    "left-[72%] top-[64%] size-2 float-c",
    "left-[18%] top-[74%] size-1.5 float-b",
    "left-[48%] top-[12%] size-1 float-a",
    "left-[60%] top-[40%] size-1 float-c",
  ];

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      {motes.map((m, i) => (
        <span
          key={i}
          className={cn("absolute rotate-45 rounded-[1px]", dot, m)}
        />
      ))}
    </div>
  );
}

/**
 * Illuminated divider — a centred cross struck between two gilded rules that
 * bloom toward it. The redesign's rest between movements, replacing the plain
 * hairline `SectionDivider`. Small flanking diamonds pick up the gilding of the
 * crest's rays.
 */
export function IlluminatedDivider({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "onDark";
}) {
  const rule = tone === "onDark" ? "opacity-70" : "";

  return (
    <div
      aria-hidden
      className={cn("flex items-center justify-center gap-4", className)}
    >
      <span className={cn("h-px w-16 rule-gild sm:w-28", rule)} />
      <span
        className={cn(
          "size-1.5 rotate-45",
          tone === "onDark" ? "bg-accent-300/70" : "bg-accent-500/70",
        )}
      />
      <CrossMark size="sm" tone={tone === "onDark" ? "onDark" : "sacred"} />
      <span
        className={cn(
          "size-1.5 rotate-45",
          tone === "onDark" ? "bg-accent-300/70" : "bg-accent-500/70",
        )}
      />
      <span className={cn("h-px w-16 rotate-180 rule-gild sm:w-28", rule)} />
    </div>
  );
}
