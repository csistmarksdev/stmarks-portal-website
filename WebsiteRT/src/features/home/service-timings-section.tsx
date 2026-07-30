import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { ServiceTimingsTable } from "@/components/common/service-timings-table";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getServiceTimings } from "@/services";

export async function ServiceTimingsSection() {
  const [t, timings] = await Promise.all([
    getTranslations("home.serviceTimings"),
    getServiceTimings(),
  ]);

  const locale = (await getLocale()) as Locale;

  return (
    <Section spacing="lg" tone="muted" id="service-timings">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Button asChild variant="secondary">
            <Link href={`${ROUTES.about}#service-timings`}>
              {t("cta")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />

      <Reveal delay={0.1}>
        <ServiceTimingsTable timings={timings} locale={locale} />
      </Reveal>
    </Section>
  );
}
