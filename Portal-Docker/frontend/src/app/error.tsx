"use client";

import { RefreshCwIcon } from "lucide-react";
import { useEffect } from "react";

/**
 * Route-level error boundary. Without one, a render-time throw anywhere in the
 * admin shell leaves a blank white page with no way forward.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Kept so the failure is visible in the browser console and in whatever
    // collects logs, rather than vanishing into the boundary.
    console.error("Portal route error:", error);
  }, [error]);

  return (
    <main className="grid min-h-[60dvh] place-items-center px-6 py-16">
      <div className="max-w-md text-center">
        <p className="label text-accent-fg">Something went wrong</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          This page stopped working
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Nothing you had saved is affected. Try again, and if it keeps
          happening tell whoever looks after the portal
          {error.digest ? ` and quote the code ${error.digest}` : ""}.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-300 hover:bg-primary-hover hover:shadow-md"
        >
          <RefreshCwIcon className="size-4" /> Try again
        </button>
      </div>
    </main>
  );
}
