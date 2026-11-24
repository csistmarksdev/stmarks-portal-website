import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import { fontVariables } from "@/lib/fonts";

import "@/styles/globals.css";

/*
 * The maintenance notice's own root layout.
 *
 * Same fonts and the same stylesheet as the site, so it is unmistakably the
 * same place, but none of the site's chrome: no header, menu or footer,
 * because every link in them would lead back to this notice. Visitors only
 * ever reach it through `proxy.ts`, which rewrites every page here while the
 * Portal has maintenance switched on and says which language was asked for.
 */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#120f0d",
};

export default async function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  const locale = (await headers()).get("x-maintenance-locale") === "en" ? "en" : "ta";

  return (
    <html lang={locale} className={fontVariables}>
      <head>
        {/*
          Comes back by itself: once maintenance is switched off, the next
          reload is the site again. The notice is never cached (see proxy.ts),
          so the reload always asks afresh.
        */}
        <meta httpEquiv="refresh" content="30" />
      </head>
      <body className="min-h-dvh bg-sand-950 antialiased">{children}</body>
    </html>
  );
}
