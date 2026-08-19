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
import { PRESBYTER_ERAS } from "@/content/leadership";
import { routing, type Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import type { Leader } from "@/types/content";

import {
  getAssistantPastors,
  getCommittee,
  getCurrentPastors,
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
 * An arched portrait with the name and office beneath it - the same window
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
      <div className="window-arch relative aspect-[4/5] overflow-hidden bg-sand-200 shadow-card ring-1 ring-[var(--border)] transition-shadow duration-500 group-hover:shadow-card-hover">
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
            className="grid size-full place-items-center bg-brand-800"
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

        <span aria-hidden className="mx-auto mt-2.5 block h-px w-8 rule-section" />

        <p className="label mt-2.5 text-[var(--muted-foreground)]">
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

  /*
   * The roll of presbyters is not fetched: it is hardcoded in
   * `src/content/leadership.ts` alongside the rest of the write-once material,
   * so there is nothing to await for it.
   */
  const [t, tCommon, tCard, pastors, assistants, committee, staff] =
    await Promise.all([
      getTranslations("leadership"),
      getTranslations("common"),
      getTranslations("leadership.card"),
      getCurrentPastors(),
      getAssistantPastors(),
      getCommittee(),
      getStaff(),
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

      {/* The roll of presbyters */}
      <Section spacing="lg" id="presbyters">
        <SectionHeading
          index="05"
          title={t("presbyters.title")}
          subtitle={t("presbyters.subtitle")}
        />

        {/*
          A register, not a gallery. There are no portraits for these sixteen
          terms and there never will be for most of them, so the page sets them
          the way the church's own roll does - ruled rows of name against years.

          An ordered list rather than a table, and that is the responsive
          decision as much as the semantic one. The church's roll has four
          columns, and four columns on a 360px phone can only be solved by
          scrolling the table sideways inside its own frame, which is a poor
          thing to hand someone reading a list of their own clergy. A list row
          carries the same four facts and simply reflows: on a phone the years
          drop beneath the name, on a desktop they sit out to the right against
          the rule. Nothing is hidden at any width and nothing scrolls sideways.

          It is also what the data is. "Sl. No" is a list index - the roll
          restarts at 1 under each era - so an `ol` per era states that
          structurally instead of spending a column on it.
        */}
        <div className="mt-10 space-y-12 sm:mt-12 sm:space-y-14">
          {PRESBYTER_ERAS.map((era) => (
            <section key={era.id} aria-labelledby={`presbyters-${era.id}`}>
              <h3
                id={`presbyters-${era.id}`}
                className="font-display text-lg font-semibold sm:text-2xl"
              >
                {localize(era.title, locale)}
              </h3>

              <ol className="mt-4 border-b border-sand-300 sm:mt-5">
                {era.terms.map((term) => (
                  <li
                    key={`${era.id}-${term.no}`}
                    className="border-t border-[var(--border)] first:border-t-sand-300"
                  >
                    {/*
                      `flex-wrap` with `justify-between` is what does the
                      reflowing: while both halves fit they sit at opposite ends
                      of the rule, and when they stop fitting the years wrap to
                      their own line under the name rather than crushing it.
                    */}
                    <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 py-4 sm:py-5">
                      <div className="flex min-w-0 items-baseline gap-3 sm:gap-4">
                        {/*
                          The serial number as the church prints it. Hidden from
                          assistive tech because the `ol` already conveys the
                          position - announcing both would read "one, one".
                        */}
                        <span
                          aria-hidden
                          className="numeric w-5 shrink-0 text-sm text-[var(--muted-foreground)] sm:w-6 sm:text-base"
                        >
                          {term.no}
                        </span>

                        <p className="min-w-0 font-display text-base font-semibold sm:text-lg">
                          {term.name}
                          {term.note ? (
                            /* `block` on a phone so a long name and its
                               qualifier do not fight over one line. */
                            <span className="mt-0.5 block text-xs font-normal text-[var(--muted-foreground)] sm:mt-0 sm:ml-2 sm:inline">
                              ({localize(term.note, locale)})
                            </span>
                          ) : null}
                        </p>
                      </div>

                      {/*
                        `pl-8` on a phone lines the years up under the name
                        rather than under the serial number once they have
                        wrapped; `nowrap` keeps a term from breaking across
                        lines mid-dash.
                      */}
                      <p className="numeric whitespace-nowrap pl-8 text-sm font-semibold text-accent-700 sm:pl-0 sm:text-base">
                        {t("presbyters.term", { from: term.from, to: term.to })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </Section>

    </main>
  );
}
