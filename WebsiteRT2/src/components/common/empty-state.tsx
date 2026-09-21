import { CrossMark } from "@/components/common/ornament";
import { cn } from "@/lib/utils";

/** Gentle placeholder for sections with no records yet. */
export function EmptyState({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // `isolate` so the arch below can sit at `z-index: -1` - above the
        // well's own fill and beneath its content, which is the only place a
        // background shape can go without either being hidden or washing over
        // the type.
        "relative isolate",
        // Sunk rather than raised, and that is the whole of the change here:
        // every other container on the site rests on the page, so the one that
        // has nothing in it reads correctly only if it goes the other way. A
        // well is waiting to be filled; a panel is simply empty.
        "flex flex-col items-center gap-4 rounded-card border border-dashed border-sand-300 bg-[var(--surface-muted)]/60 px-6 py-16 text-center shadow-[var(--inset-well)]",
        className,
      )}
    >
      {/* An arch framing the absence - the one component the architecture
          is allowed to be the content of, since there is nothing else in it. */}
      <span
        aria-hidden
        className="arch-motif pointer-events-none absolute left-1/2 top-5 -z-10 h-[82%] w-[min(14rem,42%)] -translate-x-1/2 opacity-70"
      />
      <CrossMark size="md" tone="gold" />
      <p className="mx-auto max-w-sm text-sm text-[var(--muted-foreground)]">
        {message}
      </p>
    </div>
  );
}
