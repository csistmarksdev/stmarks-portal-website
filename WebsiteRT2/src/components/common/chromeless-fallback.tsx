import type { CSSProperties, ReactNode } from "react";

/**
 * The chrome for the two pages that render *outside* the locale layout.
 *
 * `app/not-found.tsx` (a URL whose first segment is not a locale) and
 * `app/global-error.tsx` (the root layout itself threw) both replace the
 * document rather than filling a slot inside it. Neither can assume the
 * stylesheet has loaded, the fonts have arrived, or the next-intl provider is
 * alive - in the second case the provider is very often exactly what failed.
 *
 * So everything here is inline and self-contained, and the copy that uses it is
 * hardcoded in both languages rather than translated. That is a real cost -
 * these two pages will drift from the design tokens if the palette is ever
 * retuned - and it is why they share one component instead of two near-copies:
 * one file to bring back into line, not two.
 */

/** Approximations of `--background`, `--foreground`, `--muted-foreground`,
 *  `--border` and `--primary` as sRGB hex, since `oklch()` var lookups are the
 *  very thing that is unavailable here. */
const COLORS = {
  background: "#fbfaf8",
  foreground: "#3a3733",
  muted: "#6b6459",
  faint: "#8a7f6d",
  border: "#e5e0d8",
  primary: "#3d3a7a",
} as const;

/**
 * Tamil first in every stack. The default locale is Tamil, and a fallback page
 * that cannot say which locale it is in should still render the congregation's
 * own script rather than dropping it to a tofu box.
 */
const SANS = '"Noto Sans Tamil", ui-sans-serif, system-ui, sans-serif';
const SERIF = '"Noto Serif Tamil", Georgia, ui-serif, serif';

export const fallbackStyles = {
  eyebrow: {
    margin: 0,
    fontFamily: SANS,
    fontSize: "0.6875rem",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: COLORS.faint,
  },
  title: {
    margin: "0.85rem 0 0",
    fontFamily: SERIF,
    fontSize: "1.75rem",
    fontWeight: 600,
    /* Tamil hangs vowel signs above and below the band; 1.35 is the leading the
       script needs, and it costs Latin nothing at this size. */
    lineHeight: 1.35,
    color: COLORS.foreground,
  },
  body: {
    margin: "0.85rem 0 0",
    fontFamily: SANS,
    fontSize: "0.9375rem",
    lineHeight: 1.7,
    color: COLORS.muted,
  },
  /** The same sentence again in the other language, set quieter. */
  bodyAlt: {
    margin: "0.5rem 0 0",
    fontFamily: SANS,
    fontSize: "0.875rem",
    lineHeight: 1.7,
    color: COLORS.faint,
  },
  actions: {
    marginTop: "1.9rem",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "0.75rem",
  },
  primaryAction: {
    display: "inline-block",
    padding: "0.7rem 1.5rem",
    borderRadius: "9999px",
    border: 0,
    background: COLORS.primary,
    color: "#fff",
    fontFamily: SANS,
    fontSize: "0.875rem",
    textDecoration: "none",
    cursor: "pointer",
  },
  secondaryAction: {
    display: "inline-block",
    padding: "0.7rem 1.5rem",
    borderRadius: "9999px",
    border: `1px solid ${COLORS.border}`,
    background: "transparent",
    color: COLORS.foreground,
    fontFamily: SANS,
    fontSize: "0.875rem",
    textDecoration: "none",
    cursor: "pointer",
  },
  reference: {
    margin: "1.9rem 0 0",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.75rem",
    color: COLORS.faint,
  },
} satisfies Record<string, CSSProperties>;

export function ChromelessFallback({
  lang = "ta",
  children,
}: {
  /** Only meaningful when the failure itself tells us the locale. Defaults to
   *  the site's own default rather than guessing at English. */
  lang?: string;
  children: ReactNode;
}) {
  return (
    <html lang={lang}>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "1.5rem",
          background: COLORS.background,
          color: COLORS.foreground,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <p style={fallbackStyles.eyebrow}>
            CSI St. Mark&apos;s Church, Madipakkam
          </p>
          {children}
        </div>
      </body>
    </html>
  );
}
