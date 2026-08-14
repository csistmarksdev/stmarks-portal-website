import type { Metadata } from "next";
import { Fraunces, Inter, Noto_Sans_Tamil } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { BackToTop } from "@/components/common/back-to-top";
import { ChristmasEffects } from "@/components/common/christmas-effects";
import { ChristmasOrnaments } from "@/components/common/christmas-ornaments";
import { EasterRays } from "@/components/common/easter-rays";
import { LiturgicalSeason } from "@/components/common/liturgical-season";
import { Snowfall } from "@/components/common/snowfall";
import { SplashScreen } from "@/components/common/splash-screen";
import { SiteFooter } from "@/layouts/site-footer";
import { SiteHeader } from "@/layouts/site-header";
import { HeroScrollProvider } from "@/providers/hero-scroll-provider";
import { LenisProvider } from "@/providers/lenis-provider";
import { SITE_CONFIG } from "@/constants/site";
import { routing, type Locale } from "@/i18n/routing";
import { getFellowshipSlugsForNav } from "@/services";

import "@/styles/globals.css";

/**
 * The season bootstrap — see the note at its use site in the body below.
 *
 * Kept as a module constant rather than an inline literal so it is one
 * greppable thing, and so the verification script can import it directly and
 * run it against the real `getSeason` rather than against a copy of it.
 */
export const SEASON_BOOTSTRAP =
  '(function(){var v=["christmas","lent","holy-week","good-friday","easter","csi-day","ordinary"],q=new URLSearchParams(location.search).get("season"),s;if(q&&v.indexOf(q)>-1){s=q}else{var d=new Date(),y=d.getFullYear(),o=function(Y,M,D){return Math.floor(Date.UTC(Y,M-1,D)/864e5)},a=y%19,b=Math.floor(y/100),c=y%100,D4=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-D4-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),E=o(y,Math.floor((h+l-7*m+114)/31),(h+l-7*m+114)%31+1),t=o(y,d.getMonth()+1,d.getDate());s=t===E-2?"good-friday":t>=E-7&&t<E?"holy-week":t>=E-46&&t<E-7?"lent":t>=E&&t<=E+49?"easter":t>=o(y,12,1)||t<=o(y,1,1)?"christmas":t===o(y,9,27)?"csi-day":"ordinary"}document.documentElement.dataset.season=s})()';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK"],
});

const notoTamil = Noto_Sans_Tamil({
  variable: "--font-noto-tamil",
  subsets: ["tamil"],
  display: "swap",
});

/** Prerender both locales at build time. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });

  const name = t("name");
  const description = t("description");

  return {
    metadataBase: new URL(SITE_CONFIG.url),
    title: {
      default: name,
      // Inner pages set only their own title; the church name is appended.
      template: `%s · ${t("shortName")}`,
    },
    description,
    alternates: {
      canonical: locale === routing.defaultLocale ? "/" : `/${locale}`,
      languages: {
        en: "/",
        ta: "/ta",
      },
    },
    openGraph: {
      type: "website",
      siteName: name,
      title: name,
      description,
      locale: SITE_CONFIG.locale[locale as Locale],
      images: [{ url: SITE_CONFIG.ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Required for static rendering of this segment.
  setRequestLocale(locale);

  /*
   * The same data `generateStaticParams` uses for the fellowship pages, so the
   * menu offers exactly the fellowships the site built. Shares their cache tag,
   * so it costs one request per revalidation rather than one per page — and the
   * `ForNav` variant degrades instead of throwing, because this runs in the root
   * layout where an error would take every page down with it.
   */
  const [t, fellowshipSlugs] = await Promise.all([
    getTranslations("common"),
    getFellowshipSlugsForNav(),
  ]);

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${fraunces.variable} ${notoTamil.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">
        {/*
          The season, before first paint.

          `LiturgicalSeason` below is the authority on this, but it sets the
          attribute from an effect — which cannot run until React has hydrated
          the whole tree, and on this page that tree includes the cinematic
          hero. The splash screen is up for as little as 1.9s, so the effect was
          landing just as it was leaving: every seasonal thing about the opening
          frame was correct and none of it was ever seen.

          This runs synchronously, in document order, before anything paints.
          It is the same arithmetic as `lib/liturgical-year.ts` — the Gregorian
          computus and the six boundary tests — inlined because an import cannot
          be made to run before hydration.

          **That duplication is real and it is checked.** `scripts/verify-season-script.mjs`
          asserts this script and the module agree on every single day from 2024
          to 2044 — 7,671 days — and it fails loudly if they ever drift. If you
          change `getSeason`, change this too and run that script.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: SEASON_BOOTSTRAP,
          }}
        />

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[var(--primary)] focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-white"
        >
          {t("skipToContent")}
        </a>

        <NextIntlClientProvider>
          {/*
            First inside the provider, and so early in the body: the crest is
            what the reader should be looking at while the rest of this arrives,
            which means the preload scanner should reach it before the header's
            own logos. Sits outside the scroll providers because it has nothing
            to do with scrolling — it owns the scroll lock itself, for as long
            as it is up.
          */}
          <SplashScreen />

          <HeroScrollProvider>
            <LenisProvider>
              <SiteHeader fellowshipSlugs={fellowshipSlugs} />
              {children}
              <SiteFooter />
              <BackToTop />

              {/*
                The church's year, which is the only calendar this site keeps.

                `LiturgicalSeason` computes the CSI season from the reader's own
                date and writes it to `<html data-season>`; the season blocks in
                `globals.css` do the rest — the light in a section, the colour of
                the cross heading it, the temperature of the paper. The snowfall
                reads the same season rather than counting months of its own, so
                the two can never disagree about what day it is.
              */}
              <LiturgicalSeason />
              <Snowfall />

              {/*
                Hung at the top of the document rather than the viewport, so
                they sit over the dark hero every page opens on and scroll away
                with it. Nothing at all outside Christmas.
              */}
              <ChristmasOrnaments />

              {/*
                The air of the room: bokeh far enough out of focus to have no
                edges, and a star that crosses about once every twenty seconds.
                Behind every piece of content, at a negative z-index.
              */}
              <ChristmasEffects />

              {/*
                Eastertide: shafts of light struck down across the hero every
                page opens on. Same placement logic as the garland above — the
                top of the document is always a dark photograph, which is the
                only ground a light shaft reads on.
              */}
              <EasterRays />
            </LenisProvider>
          </HeroScrollProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
