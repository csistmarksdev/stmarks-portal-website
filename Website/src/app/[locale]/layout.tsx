import type { Metadata } from "next";
import { Fraunces, Inter, Noto_Sans_Tamil } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { BackToTop } from "@/components/common/back-to-top";
import { SiteFooter } from "@/layouts/site-footer";
import { SiteHeader } from "@/layouts/site-header";
import { HeroScrollProvider } from "@/providers/hero-scroll-provider";
import { LenisProvider } from "@/providers/lenis-provider";
import { SITE_CONFIG } from "@/constants/site";
import { routing, type Locale } from "@/i18n/routing";

import "@/styles/globals.css";

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

  const t = await getTranslations("common");

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${fraunces.variable} ${notoTamil.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[var(--primary)] focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-white"
        >
          {t("skipToContent")}
        </a>

        <NextIntlClientProvider>
          <HeroScrollProvider>
            <LenisProvider>
              <SiteHeader />
              {children}
              <SiteFooter />
              <BackToTop />
            </LenisProvider>
          </HeroScrollProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
