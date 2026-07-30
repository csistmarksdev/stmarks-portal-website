import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { GalleryCard } from "@/components/cards/gallery-card";
import { EmptyState } from "@/components/common/empty-state";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { getGallery } from "@/services";

export async function RecentGallery() {
  const [t, albums] = await Promise.all([
    getTranslations("home.gallery"),
    getGallery(3),
  ]);

  const locale = (await getLocale()) as Locale;

  return (
    <Section spacing="lg" tone="muted">
      <SectionHeading
        index="04"
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Button asChild variant="secondary">
            <Link href={ROUTES.gallery}>
              {t("cta")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />

      {albums.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        /*
          Bento layout: the newest album takes a double-width, double-height
          tile with the rest stacked beside it. Row height is set on the grid
          and cards use `ratio="fill"` — an intrinsic aspect ratio would fight
          the row spans and leave uneven gaps.
        */
        <StaggerGroup className="grid auto-rows-[200px] gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[228px]">
          {albums.map((album, index) => (
            <StaggerItem
              key={album.id}
              className={cn(
                "h-full",
                index === 0 && "sm:col-span-2 lg:row-span-2",
              )}
            >
              <GalleryCard album={album} locale={locale} ratio="fill" />
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </Section>
  );
}
