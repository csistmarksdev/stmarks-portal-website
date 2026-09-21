import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";

import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import { getLeadershipPreview } from "@/services";
import type { Leader } from "@/types/content";

/** Initials fallback when a leader has no portrait on file. */
function initials(name: string): string {
  return name
    .replace(/^(Rev\.|Mr\.|Mrs\.|Ms\.|Dr\.)\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export async function LeadershipPreview() {
  const [t, tCard, leaders] = await Promise.all([
    getTranslations("home.leadership"),
    getTranslations("leadership.card"),
    getLeadershipPreview(3),
  ]);

  const locale = (await getLocale()) as Locale;

  if (leaders.length === 0) return null;

  return (
    <Section spacing="lg">
      <SectionHeading
        align="center"
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      {/*
        Those who serve, shown as equals - one gallery of arched portraits at a
        single size, centred beneath the heading, not a hierarchy with one
        figure enlarged over the rest. The pastor's own word has its section
        further down the page; here the clergy stand together.
      */}
      <StaggerGroup
        className="flex flex-wrap justify-center gap-x-10 gap-y-12"
        amount={0.1}
      >
        {leaders.map((leader) => (
          <StaggerItem key={leader.id} className="w-full max-w-xs">
            <PortraitFigure leader={leader} locale={locale} tCard={tCard} />
          </StaggerItem>
        ))}
      </StaggerGroup>

      <div className="mt-16 flex justify-center">
        <Button asChild variant="secondary" size="lg">
          <Link href={ROUTES.leadership}>
            {t("cta")}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </Section>
  );
}

/**
 * One member of the clergy - an arched portrait over a centred caption ruled
 * with a gilded line. Every figure is identical in size and treatment, so the
 * gallery reads as a college of equals.
 */
function PortraitFigure({
  leader,
  locale,
  tCard,
}: {
  leader: Leader;
  locale: Locale;
  tCard: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const name = localize(leader.name, locale);

  return (
    <figure className="group mx-auto flex w-full max-w-xs flex-col items-center text-center">
      <div className="window-arch relative aspect-[4/5] w-full overflow-hidden bg-sand-200 shadow-card ring-1 ring-[var(--border)] transition-shadow duration-500 group-hover:shadow-card-hover">
        {leader.image ? (
          <Image
            src={leader.image.url}
            alt={localize(leader.image.alt, locale)}
            fill
            sizes="(max-width: 640px) 80vw, (max-width: 1024px) 45vw, 30vw"
            className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
          />
        ) : (
          <div
            aria-hidden
            className="grid size-full place-items-center bg-brand-800"
          >
            <span className="font-display text-6xl font-semibold text-white/85">
              {initials(name)}
            </span>
          </div>
        )}

        {/* A whisper of shade at the foot lifts the arch off the ground. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-sand-950/25 to-transparent"
        />
      </div>

      <figcaption className="mt-6">
        <h3 className="font-display text-xl font-semibold leading-snug transition-colors duration-300 group-hover:text-[var(--primary)]">
          {name}
        </h3>

        <span aria-hidden className="mx-auto mt-3 block h-px w-10 rule-section" />

        <p className="label mt-3 text-[var(--muted-foreground)]">
          {localize(leader.designation, locale)}
        </p>

        {leader.servingSince ? (
          <p className="numeric mt-1.5 text-xs text-[var(--muted-foreground)]">
            {tCard("since", { year: leader.servingSince })}
          </p>
        ) : null}
      </figcaption>
    </figure>
  );
}
