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
        "flex flex-col items-center gap-4 rounded-card border border-dashed border-sand-300 bg-[var(--surface)]/50 px-6 py-16 text-center",
        className,
      )}
    >
      <CrossMark size="md" tone="gold" />
      <p className="mx-auto max-w-sm text-sm text-[var(--muted-foreground)]">
        {message}
      </p>
    </div>
  );
}
