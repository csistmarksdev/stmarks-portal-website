"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches failures in the root layout itself, where the
 * per-locale `error.tsx` cannot render. It replaces `<html>`, so it carries
 * its own inline styling rather than assuming the stylesheet has loaded, and
 * its copy is English-only because the i18n provider is exactly what may have
 * failed.
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "1.5rem",
          background: "#fbfaf8",
          color: "#3a3733",
          fontFamily: "Georgia, ui-serif, serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "30rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.6875rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#8a7f6d",
            }}
          >
            CSI St. Mark&apos;s Church
          </p>
          <h1 style={{ margin: "0.75rem 0 0", fontSize: "1.75rem", fontWeight: 600 }}>
            This page could not be loaded
          </h1>
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "0.9375rem",
              lineHeight: 1.6,
              color: "#6b6459",
            }}
          >
            Something went wrong at our end. Please try again in a moment.
            {error.digest ? ` (Reference: ${error.digest})` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.75rem",
              padding: "0.625rem 1.5rem",
              borderRadius: "9999px",
              border: 0,
              background: "#3d3a7a",
              color: "#fff",
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
