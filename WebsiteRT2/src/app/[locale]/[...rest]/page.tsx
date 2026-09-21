import { notFound } from "next/navigation";

/**
 * Catches every unmatched path *inside* a locale and hands it to
 * `[locale]/not-found.tsx`.
 *
 * This exists because of a sharp edge in the App Router: a root
 * `app/not-found.tsx` handles all unmatched URLs for the whole application,
 * while a nested `not-found.tsx` only ever renders in response to an explicit
 * `notFound()` call from inside its own segment. So the moment the root
 * fallback was added, every mistyped path stopped reaching the locale-aware
 * 404 - masthead, footer, translated copy and all - and got the chrome-less
 * fallback meant for URLs that have no locale at all.
 *
 * A catch-all route restores the intent. The path now matches a real route
 * inside `[locale]`, that route calls `notFound()`, and the nested boundary
 * renders. Next resolves specific segments ahead of a catch-all, so no genuine
 * page is shadowed by this.
 *
 * The price, measured against a production build rather than assumed: these
 * responses carry HTTP 200, not 404. Next documents the rule - "a 200 status
 * code for streamed responses, and 404 for non-streamed" - and this segment
 * can only stream, because `[locale]/layout.tsx` is async and `loading.tsx`
 * puts a Suspense boundary above the page. So the 404 body arrives in the RSC
 * stream and React paints it on the client.
 *
 * What that costs and what it does not: `notFound()` injects
 * `<meta name="robots" content="noindex">`, which is present on every one of
 * these responses, so nothing here is indexed. A link checker reading only the
 * status line will not notice the page is missing. That is the trade being
 * made - a branded, navigable, translated dead end for the people who visit,
 * against a status line for the machines that count. Reverse it by deleting
 * this file: every unmatched path then falls to `app/not-found.tsx`, which is
 * prerendered, non-streamed, and answers a true 404 - without the masthead,
 * the footer, or the reader's own language.
 */
export default function CatchAllNotFound(): never {
  notFound();
}
