import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { PageMasthead } from "@/components/common/page-masthead";
import { Section } from "@/components/ui/section";
import { Text } from "@/components/ui/typography";
import { CHURCH_OFFICE, privacyNoticeReady } from "@/content/church-office";
import { routing, type Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import { pageMetadata } from "@/lib/seo";

/**
 * Privacy Notice (F-036). Text from the audit handoff (LEGAL-01, LEGAL-03),
 * with the facts only the church office can supply read from
 * `content/church-office.ts`. Until all of them are there, this page does not
 * exist (404) - see `privacyNoticeReady`.
 */

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!privacyNoticeReady()) return {};
  const t = await getTranslations({ locale, namespace: "privacy" });
  return pageMetadata({
    locale: locale as Locale,
    path: "/privacy",
    title: t("title"),
    description: t("intro"),
  });
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);
  if (!privacyNoticeReady()) notFound();

  const locale = rawLocale as Locale;
  const t = await getTranslations("privacy");
  const p = CHURCH_OFFICE.privacy;
  const email = p.grievanceEmail ?? "";

  return (
    <main id="main">
      <PageMasthead title={t("title")} subtitle={t("intro")} />
      <Section spacing="lg" containerSize="md">
        <div className="space-y-5">
          <Text>{t("collect")}</Text>
          <Text>{t("noSale")}</Text>
          <Text>{t("retention", { months: p.retentionMonths ?? 0 })}</Text>
          <Text>
            {t("rights")}{" "}
            <a href={`mailto:${email}`} className="link-underline text-[var(--primary)]">
              {email}
            </a>
            .
          </Text>
          <Text>{t("response")}</Text>
          <Text>{t("board")}</Text>
          <Text tone="muted">
            {t("officer", {
              officer: p.grievanceOfficer ? localize(p.grievanceOfficer, locale) : "",
            })}{" "}
            <a href={`mailto:${email}`} className="link-underline">
              {email}
            </a>
          </Text>
        </div>
      </Section>
    </main>
  );
}
