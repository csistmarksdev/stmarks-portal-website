import type { Metadata } from "next";
import { ArrowRight, Compass, Eye, ExternalLink } from "lucide-react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FeatureCard } from "@/components/cards/feature-card";
import { CtaBand } from "@/components/common/cta-band";
import { CrossMark } from "@/components/common/ornament";
import { PageHero } from "@/components/common/page-hero";
import { ServiceTimingsTable } from "@/components/common/service-timings-table";
import { Reveal } from "@/components/motion/reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { Heading, Prose, Text } from "@/components/ui/typography";
import { ROUTES } from "@/constants/site";
import { HERO_SLIDES } from "@/content/hero-slides";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { localize, localizeAll } from "@/lib/localize";
import {
  getChurchHistory,
  getDioceseInfo,
  getServiceTimings,
  getVisionMission,
} from "@/services";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about.meta" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);

  const locale = rawLocale as Locale;

  const [t, history, vision, diocese, timings] = await Promise.all([
    getTranslations("about"),
    getChurchHistory(),
    getVisionMission(),
    getDioceseInfo(),
    getServiceTimings(),
  ]);

  return (
    <main id="main">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        images={HERO_SLIDES.about}
      />

      {/* History */}
      <Section spacing="lg" id="history">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-16">
          <div className="lg:col-span-6">
            <Reveal>
              <div className="flex items-center gap-3">
                <CrossMark size="sm" tone="sacred" />
                <span className="label text-accent-700">
                  {t("history.eyebrow")}
                </span>
              </div>

              <Heading as="h2" level="h1" className="mt-5">
                {t("history.title")}
              </Heading>

              <span aria-hidden className="mt-6 block h-px w-24 rule-gild" />
            </Reveal>

            {/* The intro reads as a standfirst that flows straight into the
                body — no dead gap between the two. */}
            <Reveal delay={0.08}>
              <Text
                size="xl"
                className="mt-8 text-[var(--foreground)]"
              >
                {localize(history.intro, locale)}
              </Text>
            </Reveal>

            <Reveal delay={0.14}>
              <Prose
                paragraphs={localizeAll(history.body, locale)}
                lead
                className="mt-7"
              />
            </Reveal>
          </div>

          {history.image ? (
            <div className="lg:col-span-6">
              {/* Arched and held in place while the story scrolls past — a
                  window onto the sanctuary rather than a floating snapshot. */}
              <figure className="lg:sticky lg:top-28">
                <div className="lancet-arch relative aspect-[4/5] overflow-hidden bg-sand-200 shadow-sanctuary ring-1 ring-sand-200">
                  <Image
                    src={history.image.url}
                    alt={localize(history.image.alt, locale)}
                    fill
                    sizes="(max-width: 1024px) 100vw, 46vw"
                    className="ken-burns object-cover"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-sand-950/25 to-transparent"
                  />
                </div>
              </figure>
            </div>
          ) : null}
        </div>

        {/* Milestones timeline */}
        <div className="mt-20">
          <Reveal>
            <Heading as="h3" level="h3">
              {t("history.milestonesTitle")}
            </Heading>
          </Reveal>

          {/*
            A chronicle rather than a row of boxes: the years run down a single
            rail so the eye reads them in sequence. Equal-width cards flattened
            the chronology — every entry looked simultaneous.
          */}
          <div className="relative mt-12">
            {/* The rail, fading out at both ends rather than stopping dead. */}
            <span
              aria-hidden
              className="absolute inset-y-3 left-2 w-px bg-gradient-to-b from-transparent via-accent-500/45 to-transparent"
            />

            <StaggerGroup className="space-y-12 sm:space-y-14">
              {history.milestones.map((milestone) => (
                <StaggerItem key={milestone.id}>
                  <article className="group relative pl-11 sm:pl-16">
                    {/* Node. The ring is the page colour, so it punches a gap
                        in the rail instead of sitting on top of it. */}
                    <span
                      aria-hidden
                      className="absolute left-0 top-2 grid size-4 place-items-center"
                    >
                      <span className="size-2.5 rotate-45 bg-accent-500 ring-4 ring-[var(--background)] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-125" />
                    </span>

                    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                      <p className="numeric font-display text-3xl font-semibold leading-none tracking-tight text-accent-700 sm:text-4xl">
                        {milestone.year}
                      </p>

                      <h4 className="font-display text-lg font-semibold leading-snug transition-colors duration-300 group-hover:text-[var(--primary)] sm:text-xl">
                        {localize(milestone.title, locale)}
                      </h4>
                    </div>

                    <p className="mt-4 max-w-2xl leading-relaxed text-[var(--muted-foreground)]">
                      {localize(milestone.description, locale)}
                    </p>
                  </article>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </div>
      </Section>

      {/* Vision & Mission */}
      <Section spacing="lg" tone="muted" id="vision-mission">
        <SectionHeading
          index="02"
          eyebrow={t("visionMission.eyebrow")}
          title={t("visionMission.title")}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <FeatureCard
              icon={Eye}
              title={t("visionMission.visionTitle")}
              body={localize(vision.vision, locale)}
              accent="brand"
            />
          </Reveal>

          <Reveal delay={0.1}>
            <FeatureCard
              icon={Compass}
              title={t("visionMission.missionTitle")}
              body={localize(vision.mission, locale)}
              accent="gold"
            />
          </Reveal>
        </div>

        <div className="mt-20">
          <Reveal>
            <div className="flex items-center gap-3">
              <CrossMark size="sm" tone="sacred" />
              <Heading as="h3" level="h3">
                {t("visionMission.valuesTitle")}
              </Heading>
            </div>
          </Reveal>

          {/*
            A ledger of what the parish holds to, not a row of boxes. Each value
            opens with a gilded versal — the initial of the value itself, the
            way an illuminated page marks a passage — and the columns are ruled
            off from one another rather than boxed in.
          */}
          <StaggerGroup className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-sand-200/80">
            {vision.values.map((value) => {
              const title = localize(value.title, locale);

              return (
                <StaggerItem key={value.id} className="group lg:px-8 lg:first:pl-0">
                  <span
                    aria-hidden
                    className="block font-display text-5xl font-semibold leading-none text-accent-600/85 transition-colors duration-500 group-hover:text-accent-600"
                  >
                    {title.charAt(0)}
                  </span>

                  <h4 className="mt-5 font-display text-lg font-semibold text-[var(--foreground)]">
                    {title}
                  </h4>

                  <span aria-hidden className="mt-3 block h-px w-10 rule-gild" />

                  <p className="mt-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
                    {localize(value.description, locale)}
                  </p>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        </div>
      </Section>

      {/* CSI Diocese */}
      <Section spacing="lg" id="diocese">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* The diocesan crest, presented as heraldry rather than as a
              photograph: centred on a plain ground with room to breathe, at
              its own proportions. The manuscript-leaf plate used elsewhere on
              this page would crop a square emblem to landscape and pan across
              it, which is the one thing an emblem must never do. */}
          {diocese.image ? (
            <Reveal direction="right" className="lg:col-span-5 lg:order-1">
              <figure className="relative grid place-items-center overflow-hidden rounded-[var(--radius-sanctuary)] bg-sand-100 p-10 shadow-sanctuary ring-1 ring-sand-200 sm:p-14">
                <Image
                  src={diocese.image.url}
                  alt={localize(diocese.image.alt, locale)}
                  width={diocese.image.width}
                  height={diocese.image.height}
                  // An SVG gains nothing from the optimiser, which refuses it
                  // by default anyway.
                  unoptimized
                  className="h-auto w-full max-w-[15rem] object-contain sm:max-w-[17rem]"
                />
                {/* Gilded inner margin, set in from the edge like a ruled leaf. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-3 rounded-[calc(var(--radius-sanctuary)-0.5rem)] ring-1 ring-accent-500/20"
                />
              </figure>
            </Reveal>
          ) : null}

          <div className="lg:order-2 lg:col-span-7">
            <Reveal>
              <div className="flex items-center gap-3">
                <CrossMark size="sm" tone="sacred" />
                <span className="label text-accent-700">
                  {t("diocese.eyebrow")}
                </span>
              </div>

              <Heading as="h2" level="h1" className="mt-5">
                {localize(diocese.name, locale)}
              </Heading>

              <span aria-hidden className="mt-6 block h-px w-24 rule-gild" />
            </Reveal>

            <Reveal delay={0.1}>
              <Prose
                paragraphs={localizeAll(diocese.description, locale)}
                className="mt-8"
              />
            </Reveal>

            {/* The bishop has been in the content all along without ever
                reaching the page — the one fact a reader is most likely to
                want from a section about the diocese. */}
            <Reveal delay={0.14}>
              <div className="mt-8 border-t border-[var(--border)] pt-6">
                <p className="label text-[var(--muted-foreground)]">
                  {t("diocese.bishop")}
                </p>
                <p className="mt-1.5 font-display text-lg text-[var(--foreground)]">
                  {localize(diocese.bishop, locale)}
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.2} className="mt-9">
              <Button asChild variant="secondary">
                <a
                  href={diocese.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("diocese.visitSite")}
                  <ExternalLink aria-hidden />
                </a>
              </Button>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* Service timings */}
      <Section spacing="lg" tone="muted" id="service-timings">
        <SectionHeading
          index="04"
          eyebrow={t("serviceTimings.eyebrow")}
          title={t("serviceTimings.title")}
          className="mb-10 sm:mb-12"
        />

        <Reveal>
          <ServiceTimingsTable timings={timings} locale={locale} />
        </Reveal>
      </Section>

      {/* Contact */}
      <Section spacing="lg" id="contact" containerSize="lg">
        <CtaBand eyebrow={t("contact.eyebrow")} title={t("contact.title")}>
          <Button asChild size="lg" variant="onDark">
            <Link href={ROUTES.contact}>
              {t("contact.cta")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </CtaBand>
      </Section>
    </main>
  );
}
