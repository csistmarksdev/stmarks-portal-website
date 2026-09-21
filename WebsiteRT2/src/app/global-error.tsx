"use client";

import { useEffect } from "react";

import {
  ChromelessFallback,
  fallbackStyles,
} from "@/components/common/chromeless-fallback";

/**
 * Last-resort boundary: catches failures in the root layout itself, where the
 * per-locale `error.tsx` cannot render. It replaces the whole document, so it
 * shares the chromeless shell with `not-found.tsx` - no stylesheet, no fonts,
 * no i18n provider assumed, since the provider is one of the things that may
 * have failed. Both languages are written out for the same reason.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Site fatal error:", error);
  }, [error]);

  return (
    <ChromelessFallback>
      <h1 style={fallbackStyles.title}>
        இந்தப் பக்கத்தை ஏற்ற முடியவில்லை
        <span
          style={{
            display: "block",
            fontSize: "1.25rem",
            fontWeight: 500,
            opacity: 0.75,
          }}
        >
          This page could not be loaded
        </span>
      </h1>

      <p style={fallbackStyles.body}>
        எங்கள் தரப்பில் ஏதோ தவறு நடந்துவிட்டது. சிறிது நேரம் கழித்து மீண்டும்
        முயற்சிக்கவும்.
      </p>
      <p style={fallbackStyles.bodyAlt}>
        Something went wrong at our end. Please try again in a moment.
      </p>

      <div style={fallbackStyles.actions}>
        <button
          type="button"
          onClick={reset}
          style={fallbackStyles.primaryAction}
        >
          மீண்டும் முயற்சி · Try again
        </button>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a
            hard navigation is the point: the app shell is what just failed. */}
        <a href="/" style={fallbackStyles.secondaryAction}>
          முகப்பு · Home
        </a>
      </div>

      {/* The server-side hash of the real error - see the note in
          `[locale]/error.tsx`. It is the only handle anyone has on what
          actually happened here. */}
      {error.digest ? (
        <p style={fallbackStyles.reference} translate="no">
          Reference: {error.digest}
        </p>
      ) : null}
    </ChromelessFallback>
  );
}
