/**
 * The locale set, with no dependencies.
 *
 * Split out of `routing.ts` for one reason: `next.config.ts` needs it, to build
 * the redirects from the old section paths to their chapter of the single page,
 * and `routing.ts` cannot be imported there without pulling `next-intl` into
 * the config's module graph. The config is evaluated before the app is built,
 * by a different bundler pass, and it has no business dragging a framework
 * dependency along for the sake of two string constants.
 *
 * `routing.ts` re-exports everything here, so nothing else needs to know this
 * file exists - keep importing `locales`, `defaultLocale` and `Locale` from
 * `@/i18n/routing` as before.
 */
export const locales = ["en", "ta"] as const;

export type Locale = (typeof locales)[number];

/**
 * Tamil is the default.
 *
 * This is a Tamil-speaking congregation in Madipakkam, and the site should open
 * in the language most of them read. Tamil is therefore served from `/` and
 * English from `/en` - the reverse of the usual arrangement, and the reason the
 * sitemap, the canonical tags and the legacy-path redirects derive their
 * prefixes from this constant rather than hard-coding "en".
 */
export const defaultLocale: Locale = "ta";
