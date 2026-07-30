import { Phone } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LeaderCard } from "@/components/cards/leader-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHero } from "@/components/common/page-hero";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Section, SectionHeading } from "@/components/ui/section";
import { HERO_SLIDES } from "@/content/hero-slides";
import { routing, type Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import type { Leader } from "@/types/content";

import {
  getAssistantPastors,
  getCommittee,
  getCurrentPastors,
  getFormerPastors,
  getStaff,
} from "@/services";

/** Two-letter initials fallback shown until a committee member has a portrait. */
function initials(name: string): string {
  return name
    .replace(/^(Rev\.|Mr\.|Mrs\.|Ms\.|Dr\.)\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * An arched portrait with the name and office beneath it — the same window
 * language as the clergy above, ready to carry a real portrait and showing a
 * gilded monogram until it does.
 *
 * Shared by the committee and the staff so the two read as one register of
 * people rather than two differently-built grids.
 */
function PortraitTile({
  leader,
  locale,
  phoneLabel,
}: {
  leader: Leader;
  locale: Locale;
  /** Pre-resolved `leadership.card.phoneLabel`, taking `{name}`. */
  phoneLabel: (name: string) => string;
}) {
  const name = localize(leader.name, locale);

  return (
    <figure className="group text-center">
      <div className="window-arch relative aspect-[4/5] overflow-hidden bg-sand-200 shadow-sanctuary ring-1 ring-sand-200 transition-shadow duration-500 group-hover:shadow-sanctuary-hover">
        {leader.image ? (
          <Image
            src={leader.image.url}
            alt={localize(leader.image.alt, locale)}
            fill
            sizes="(max-width: 640px) 60vw, 15rem"
            className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
          />
        ) : (
          <div
            aria-hidden
            className="grid size-full place-items-center bg-gradient-to-br from-brand-700 via-brand-800 to-sand-950"
          >
            <span className="font-display text-4xl font-semibold text-white/85">
              {initials(name)}
            </span>
          </div>
        )}

        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-sand-950/25 to-transparent"
        />
      </div>

      <figcaption className="mt-5">
        <h3 className="font-display text-lg font-semibold leading-snug transition-colors duration-300 group-hover:text-[var(--primary)]">
          {name}
        </h3>

        <span aria-hidden className="mx-auto mt-2.5 block h-px w-8 rule-gild" />

        <p className="label mt-2.5 text-accent-700">
          {localize(leader.designation, locale)}
        </p>

        {leader.phone ? (
          <a
            href={`tel:${leader.phone.replace(/\s/g, "")}`}
            aria-label={phoneLabel(name)}
            className="numeric mt-3 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] underline-offset-4 transition-colors hover:text-[var(--primary)] hover:underline"
          >
            <Phone aria-hidden className="size-3.5 shrink-0 text-accent-600" />
            {leader.phone}
          </a>
        ) : null}
      </figcaption>
    </figure>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "leadership.meta" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function LeadershipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);

  const locale = rawLocale as Locale;

  const [t, tCommon, tCard, pastors, assistants, committee, staff, formerPastors] =
    await Promise.all([
      getTranslations("leadership"),
      getTranslations("common"),
      getTranslations("leadership.card"),
      getCurrentPastors(),
      getAssistantPastors(),
      getCommittee(),
      getStaff(),
      getFormerPastors(),
    ]);

  const phoneLabel = (name: string) => tCard("phoneLabel", { name });

  return (
    <main id="main">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        images={HERO_SLIDES.leadership}
      />

      {/* Current pastors */}
      <Section spacing="lg" id="current-pastors">
        <SectionHeading
          index="01"
          title={t("currentPastors.title")}
          subtitle={t("currentPastors.subtitle")}
        />

        {pastors.length === 0 ? (
          <EmptyState message={tCommon("noResults")} />
        ) : (
          <StaggerGroup className="grid gap-8">
            {pastors.map((leader) => (
              <StaggerItem key={leader.id}>
                <LeaderCard
                  leader={leader}
                  locale={locale}
                  variant="feature"
                  mediaSide="left"
                />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>

      {/* Assistant pastors */}
      <Section spacing="lg" tone="muted" id="assistant-pastors">
        <SectionHeading
          index="02"
          title={t("assistantPastors.title")}
          subtitle={t("assistantPastors.subtitle")}
        />

        {assistants.length === 0 ? (
          <EmptyState message={tCommon("noResults")} />
        ) : (
          // Portrait mirrored against the pastors above, so the two sections
          // do not stack into one column of faces down the same edge.
          <StaggerGroup className="grid gap-8">
            {assistants.map((leader) => (
              <StaggerItem key={leader.id}>
                <LeaderCard
                  leader={leader}
                  locale={locale}
                  variant="feature"
                  mediaSide="right"
                />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>

      {/* Church committee */}
      <Section spacing="lg" id="committee">
        <SectionHeading
          index="03"
          title={t("committee.title")}
          subtitle={t("committee.subtitle")}
          className="mb-10 sm:mb-12"
        />

        {committee.length === 0 ? (
          <EmptyState message={tCommon("noResults")} />
        ) : (
          // Centred so any count sits balanced: the office bearers lead, the
          // elected members follow in the order the church keeps them.
          <StaggerGroup
            className="flex flex-wrap justify-center gap-x-8 gap-y-12"
            amount={0.1}
          >
            {committee.map((leader) => (
              <StaggerItem key={leader.id} className="w-full max-w-[15rem]">
                <PortraitTile
                  leader={leader}
                  locale={locale}
                  phoneLabel={phoneLabel}
                />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>

      {/* Church staff */}
      {staff.length > 0 ? (
        <Section spacing="lg" tone="muted" id="staff">
          <SectionHeading
            index="04"
            title={t("staff.title")}
            subtitle={t("staff.subtitle")}
            className="mb-10 sm:mb-12"
          />

          <StaggerGroup
            className="flex flex-wrap justify-center gap-x-8 gap-y-12"
            amount={0.1}
          >
            {staff.map((leader) => (
              <StaggerItem key={leader.id} className="w-full max-w-[15rem]">
                <PortraitTile
                  leader={leader}
                  locale={locale}
                  phoneLabel={phoneLabel}
                />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Section>
      ) : null}

      {/* Former pastors */}
      <Section spacing="lg" id="former-pastors">
        <SectionHeading
          index="05"
          title={t("formerPastors.title")}
          subtitle={t("formerPastors.subtitle")}
        />

        {formerPastors.length === 0 ? (
          <EmptyState message={tCommon("noResults")} />
        ) : (
          // A roll of succession: names against years, ruled like a register.
          <StaggerGroup className="border-b border-sand-300">
            {formerPastors.map((leader) => (
              <StaggerItem key={leader.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 border-t border-sand-300 py-5">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-semibold">
                      {localize(leader.name, locale)}
                    </h3>
                    <p className="label mt-1.5 text-[var(--muted-foreground)]">
                      {localize(leader.designation, locale)}
                    </p>
                  </div>

                  <p className="numeric font-display text-lg font-semibold text-accent-700">
                    {t("formerPastors.tenure", {
                      from: leader.tenureFrom ?? "",
                      to: leader.tenureTo ?? t("formerPastors.present"),
                    })}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>
    </main>
  );
}
