import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { EventCard } from "@/components/cards/event-card";
import { EmptyState } from "@/components/common/empty-state";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getUpcomingEvents } from "@/services";

export async function UpcomingEvents() {
  const [t, events] = await Promise.all([
    getTranslations("home.events"),
    getUpcomingEvents(3),
  ]);

  const locale = (await getLocale()) as Locale;

  return (
    <Section spacing="lg" tone="muted">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Button asChild variant="secondary">
            <Link href={ROUTES.events}>
              {t("cta")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />

      {events.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <StaggerGroup className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <StaggerItem key={event.id} className="h-full">
              <EventCard event={event} locale={locale} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </Section>
  );
}
