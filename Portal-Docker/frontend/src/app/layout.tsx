import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";

import { Providers } from "@/lib/providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: {
    default: "St. Mark's Portal",
    template: "%s — St. Mark's Portal",
  },
  description:
    "Admin CMS for CSI St. Mark's Church, Madipakkam — the single source of truth for the public website.",
  robots: { index: false, follow: false },
  // Lets iOS treat a home-screen shortcut as a standalone app.
  appleWebApp: { capable: true, title: "St. Mark's Portal", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // `cover` lets the app bar and tab bar reach the edges; the safe-area
  // utilities keep their content clear of the notch and home indicator.
  viewportFit: "cover",
  /*
   * The browser chrome, matched to the page ground so the address bar does not
   * sit as a grey band above a warm page. These are the *compiled* values of
   * `--color-sand-50` and the dark theme's `--background` — a meta tag cannot
   * read a CSS variable, so they are copied by hand and must be re-copied if
   * either token moves.
   */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0506" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Sets data-theme before first paint — see THEME_INIT_SCRIPT. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
