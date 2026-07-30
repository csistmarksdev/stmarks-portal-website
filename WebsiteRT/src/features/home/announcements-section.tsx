import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { AnnouncementCard } from "@/components/cards/announcement-card";
import { EmptyState } from "@/components/common/empty-state";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAnnouncements } from "@/services";

export async function AnnouncementsSection() {
  const [t, announcements] = await Promise.all([
    getTranslations("home.announcements"),
    getAnnouncements(4),
  ]);

  const locale = (await getLocale()) as Locale;

  const [pinned, ...rest] = announcements;

  return (
    <Section spacing="lg" tone="muted">
      <SectionHeading
        index="02"
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Button asChild variant="secondary">
            <Link href={ROUTES.announcements}>
              {t("cta")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />

      {announcements.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <AnnouncementCard
              announcement={pinned}
              locale={locale}
              variant="featured"
              className="h-full"
            />
          </div>

          <StaggerGroup className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
            {rest.map((announcement) => (
              <StaggerItem key={announcement.id}>
                <AnnouncementCard
                  announcement={announcement}
                  locale={locale}
                />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      )}
    </Section>
  );
}
