import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { FellowshipCard } from "@/components/cards/fellowship-card";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getFellowships } from "@/services";

export async function FellowshipCards() {
  const [t, fellowships] = await Promise.all([
    getTranslations("home.fellowships"),
    getFellowships(),
  ]);

  const locale = (await getLocale()) as Locale;

  return (
    <Section spacing="lg">
      <SectionHeading
        index="03"
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Button asChild variant="secondary">
            <Link href={ROUTES.fellowships}>
              {t("cta")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />

      <StaggerGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {fellowships.slice(0, 4).map((fellowship) => (
          <StaggerItem key={fellowship.id} className="h-full">
            <FellowshipCard fellowship={fellowship} locale={locale} />
          </StaggerItem>
        ))}
      </StaggerGroup>
    </Section>
  );
}
