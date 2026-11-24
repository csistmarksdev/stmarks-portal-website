import {
  Fraunces,
  Inter,
  Noto_Sans_Tamil,
  Noto_Serif_Tamil,
} from "next/font/google";

/*
 * The site's four faces, defined once so every root layout — the site's own
 * and the maintenance notice's — sets type from the same files.
 */

export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK"],
});

export const notoTamil = Noto_Sans_Tamil({
  variable: "--font-noto-tamil",
  subsets: ["tamil"],
  display: "swap",
});

/**
 * Tamil's display face - the counterpart to Fraunces.
 *
 * Tamil was set in Noto Sans Tamil for *both* roles, so every Tamil heading was
 * a sans while the same heading in English was a serif. The two languages were
 * not reading as one design: an English reader met an editorial masthead and a
 * Tamil reader met a UI label at heading size.
 *
 * Noto Serif Tamil is the right pairing rather than merely a serif: it is drawn
 * on the same skeleton as Noto Sans Tamil, so the display and body faces relate
 * to each other exactly as Fraunces and Inter do on the Latin side - and it
 * carries a variable weight axis, which the `Heading` variants need, since they
 * step from 500 at display size to 600 at h3.
 */
export const notoSerifTamil = Noto_Serif_Tamil({
  variable: "--font-noto-serif-tamil",
  subsets: ["tamil"],
  display: "swap",
});

/** All four as CSS variables, for the `<html>` element of a root layout. */
export const fontVariables = `${inter.variable} ${fraunces.variable} ${notoTamil.variable} ${notoSerifTamil.variable}`;
