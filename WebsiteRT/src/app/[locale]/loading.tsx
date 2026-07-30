/**
 * Shown while a route's data resolves.
 *
 * Most pages are prerendered, so this rarely appears — it matters on a slow
 * connection, where a navigation would otherwise leave the previous page on
 * screen with no sign that anything was happening. Deliberately quiet: a
 * pulsing rule rather than a spinner or a skeleton of a layout we cannot
 * predict, so it never flashes a shape the real page does not have.
 */
export default function Loading() {
  return (
    <main
      id="main"
      className="flex min-h-[70vh] items-center justify-center pt-[var(--header-height)]"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>
      <span
        aria-hidden
        className="h-px w-24 animate-pulse rounded-full bg-[var(--color-brand-300)]"
      />
    </main>
  );
}
