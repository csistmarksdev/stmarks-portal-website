import { defineRouting } from "next-intl/routing";

import { defaultLocale, locales, type Locale } from "./locales";

/*
 * The locale set itself lives in `./locales`, which imports nothing - see the
 * note there. Re-exported so every existing `from "@/i18n/routing"` keeps
 * working and there is still one place to import a locale from.
 */
export { defaultLocale, locales, type Locale };

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

  /*
   * F-072: with detection off the `NEXT_LOCALE` cookie is never read, so
   * writing it only put a `Set-Cookie` on cached page responses. Off.
   */
  localeCookie: false,

  /*
   * F-051: the middleware's `Link: …; rel=alternate` header named a different
   * host from the HTML's hreflang tags. Each page declares its own alternates
   * in HTML (`pageMetadata()` in `lib/seo.ts`) and the sitemap does the same,
   * so the header is switched off and there is one source.
   */
  alternateLinks: false,
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
