import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ta"] as const;

export type Locale = (typeof locales)[number];

/**
 * Tamil is the default.
 *
 * This is a Tamil-speaking congregation in Madipakkam, and the site should open
 * in the language most of them read. Tamil is therefore served from `/` and
 * English from `/en` - the reverse of the usual arrangement, and the reason the
 * sitemap and the canonical tags derive their prefixes from this constant
 * rather than hard-coding "en".
 */
export const defaultLocale: Locale = "ta";

/**
 * Single source of truth for locale-aware routing. Both the navigation
 * helpers and the proxy (Next.js 16's renamed middleware) derive from this.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  // The default locale is served from `/` rather than `/ta`.
  localePrefix: "as-needed",

  /*
   * Negotiation off, so "default" means default.
   *
   * With detection on, next-intl reads the `NEXT_LOCALE` cookie and then the
   * `accept-language` header. Most browsers in Chennai send `en-IN`, so a
   * Tamil-first site with detection enabled would redirect the majority of its
   * congregation straight to English - which is the opposite of the intent.
   *
   * The cost is real and worth stating: the flag covers the cookie as well as
   * the header, so a reader who switches to English is not remembered on their
   * next visit. They land on Tamil again and switch again. That is the price of
   * a deterministic default, and it is reversible in one line if the church
   * would rather have the memory than the certainty.
   */
  localeDetection: false,
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
