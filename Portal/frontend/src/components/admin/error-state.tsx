"use client";

import { RefreshCwIcon, WifiOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shown when a query fails.
 *
 * Kept visually distinct from the empty state on purpose: "nothing here yet"
 * and "we could not reach the server" look identical if you only check for an
 * absence of rows, and confusing the two makes an outage look like data loss.
 */
export function ErrorState({
  title = "Couldn't load this",
  message,
  onRetry,
  busy = false,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  busy?: boolean;
  className?: string;
}) {
  const offline =
    typeof navigator !== "undefined" && navigator.onLine === false;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-3xl border border-dashed border-destructive/40 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
        <WifiOffIcon className="size-5" />
      </span>
      <p className="font-[family-name:var(--font-display)] text-base font-semibold text-foreground">
        {offline ? "You appear to be offline" : title}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {offline
          ? "Check your connection — nothing has been lost, this is only a display problem."
          : (message ??
            "The portal could not reach the server. Your content is safe; this is a connection problem.")}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onRetry}
          disabled={busy}
        >
          <RefreshCwIcon className={cn(busy && "animate-spin")} />
          {busy ? "Retrying…" : "Try again"}
        </Button>
      )}
    </div>
  );
}
