import {
  ChromelessFallback,
  fallbackStyles,
} from "@/components/common/chromeless-fallback";

/**
 * The 404 for URLs that never reach a locale.
 *
 * `[locale]/not-found.tsx` handles the ordinary case - a real locale, a path
 * that does not exist - and it is the one nearly every visitor will see. It
 * cannot handle two others, because both fail before or above that segment:
 *
 *   - a first segment that is not a locale at all (`/de/about`, `/wp-admin`),
 *     which `[locale]/layout.tsx` answers by calling `notFound()` from the
 *     layout itself, so the boundary inside that segment is not available;
 *   - a path the proxy skips by its matcher - anything with a file extension,
 *     which is how a stale link to a moved PDF or image arrives.
 *
 * Without this file both fell through to Next's built-in 404: an unstyled
 * black-on-white "404 | This page could not be found" with no route back to the
 * site. There is no root layout in this app (the locale layout renders
 * `<html>`), so this page has to supply the document itself - hence the shared
 * chromeless shell.
 *
 * Both languages, because at this point there is nothing left to tell us which
 * one the reader wanted.
 */
export default function GlobalNotFound() {
  return (
    <ChromelessFallback>
      <h1 style={fallbackStyles.title}>
        பக்கம் கிடைக்கவில்லை
        <span
          style={{
            display: "block",
            fontSize: "1.25rem",
            fontWeight: 500,
            opacity: 0.75,
          }}
        >
          Page not found
        </span>
      </h1>

      <p style={fallbackStyles.body}>
        நீங்கள் தேடும் பக்கம் இடம் மாறியிருக்கலாம், அல்லது இருந்ததில்லை.
      </p>
      <p style={fallbackStyles.bodyAlt}>
        The page you are looking for may have moved, or never existed.
      </p>

      <div style={fallbackStyles.actions}>
        {/*
          A plain anchor, not `next/link`. This page renders outside the locale
          layout and outside the router's locale context, so the locale-aware
          Link would have no prefix to resolve against. `/` is correct in both
          languages regardless: Tamil is the default and is served from the
          root, and the proxy sends an English reader on from there.
        */}
        {/* eslint-disable @next/next/no-html-link-for-pages -- a client-side
            Link would try to hydrate into a router this page does not have. */}
        <a href="/" style={fallbackStyles.primaryAction}>
          முகப்புக்குத் திரும்பு
        </a>
        <a href="/en" style={fallbackStyles.secondaryAction}>
          Return home
        </a>
        {/* eslint-enable @next/next/no-html-link-for-pages */}
      </div>
    </ChromelessFallback>
  );
}
