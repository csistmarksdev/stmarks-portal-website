import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ta"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/**
 * Single source of truth for locale-aware routing. Both the navigation
 * helpers and the proxy (Next.js 16's renamed middleware) derive from this.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  // The default locale is served from `/` rather than `/en`.
  localePrefix: "as-needed",
});

export const localeLabels: Record<Locale, string> = {
  en: "English",
  ta: "தமிழ்",
};

export const localeShortLabels: Record<Locale, string> = {
  en: "EN",
  ta: "த",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
