import { getLocale, getTranslations } from "next-intl/server";

import { DownloadCard } from "@/components/cards/download-card";
import { EmptyState } from "@/components/common/empty-state";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Section, SectionHeading } from "@/components/ui/section";
import type { Locale } from "@/i18n/routing";
import { getDownloadsGrouped } from "@/services";
import type { DownloadCategory } from "@/types/content";

const CATEGORIES: DownloadCategory[] = ["bulletin", "form", "document"];

/**
 * Bulletins, forms and documents to take away.
 *
 * Was `/downloads`, and keeps a block per category - `#bulletin`, `#form`,
 * `#document`.
 */
export async function DownloadsSection() {
  const locale = (await getLocale()) as Locale;

  const [t, grouped] = await Promise.all([
    getTranslations("downloads"),
    getDownloadsGrouped(),
  ]);

  return (
    <div id="downloads">
      {CATEGORIES.map((category, index) => {
        const files = grouped[category];

        return (
          <Section
            key={category}
            spacing="lg"
            tone={index % 2 === 1 ? "muted" : "default"}
            id={category}
          >
            <SectionHeading title={t(`categories.${category}`)} />

            {files.length === 0 ? (
              <EmptyState message={t("empty")} />
            ) : (
              <StaggerGroup className="grid gap-5 lg:grid-cols-2 lg:gap-6">
                {files.map((file) => (
                  <StaggerItem key={file.id}>
                    <DownloadCard file={file} locale={locale} />
                  </StaggerItem>
                ))}
              </StaggerGroup>
            )}
          </Section>
        );
      })}
    </div>
  );
}
