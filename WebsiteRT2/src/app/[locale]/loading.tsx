import { useTranslations } from "next-intl";

/**
 * Shown while a route's data resolves.
 *
 * Most pages are prerendered, so this rarely appears - it matters on a slow
 * connection, where a navigation would otherwise leave the previous page on
 * screen with no sign that anything was happening. Deliberately quiet: a
 * pulsing rule rather than a spinner or a skeleton of a layout we cannot
 * predict, so it never flashes a shape the real page does not have.
 */
export default function Loading() {
  // F-058: in the reader's language - Tamil pages used to announce "Loading".
  const t = useTranslations("common");
  return (
    <main
      id="main"
      className="flex min-h-[70vh] items-center justify-center pt-[calc(var(--header-height)+var(--safe-top))]"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{t("loading")}</span>
      <span
        aria-hidden
        className="h-px w-24 animate-pulse rounded-full bg-[var(--color-brand-300)]"
      />
    </main>
  );
}
