import { cn } from "@/lib/utils";

/**
 * Liturgical cross mark — the section ornament, lifted from the cross at the
 * heart of the parish crest.
 *
 * The halo is off by default now. A tinted ring around a small glyph is the
 * icon-in-a-circle treatment that every template on the internet uses for its
 * feature list, and setting one behind the cross at the head of every section
 * turned a sacred sign into a UI badge. Bare, at the same size, it reads as a
 * mark struck on the page — which is what it is. The ring is still available
 * for the one or two places that genuinely want a medallion.
 */
export function CrossMark({
  className,
  size = "md",
  tone = "sacred",
  halo = false,
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
      /* Stable hook for season styling — see `data-button` on the Button. */
      data-ornament="cross"
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
      {/*
        A drawn cross, not a filled block.

        The previous mark was a solid slab: 2.8 units of stroke on a 24 unit
        square, with the arms meeting the upright at the same weight. At the
        sizes it is actually used — 24 to 44 pixels — that reads as a heavy
        plus sign. Struck as a line instead, with rounded ends and the
        crossbar set high in the classical proportion, it reads as a cross
        cut into stone or ruled in ink: lighter on the page, and more
        obviously made by a hand.
      */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        className={cn("relative size-[62%]", color)}
      >
        <path d="M12 2.6v18.8M5.4 8.4h13.2" />
      </svg>
    </span>
  );
}

/**
 * Illuminated divider — a centred cross struck between two long rules.
 *
 * The rest between movements. It had a pair of gilded diamonds flanking the
 * cross as well; four marks where one will do is how a flourish becomes
 * clutter, so the cross now stands alone between the rules and the pause reads
 * as a caesura rather than an ornament rail.
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
      className={cn("flex items-center justify-center gap-5", className)}
    >
      <span className={cn("h-px w-20 rule-gild sm:w-36", rule)} />
      <CrossMark size="sm" tone={tone === "onDark" ? "onDark" : "sacred"} />
      <span className={cn("h-px w-20 rotate-180 rule-gild sm:w-36", rule)} />
    </div>
  );
}
