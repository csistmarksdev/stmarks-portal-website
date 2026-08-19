import type { Metadata } from "next";
import { Clock, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHero } from "@/components/common/page-hero";
import { ServiceTimingsTable } from "@/components/common/service-timings-table";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Section, SectionHeading } from "@/components/ui/section";
import { Heading } from "@/components/ui/typography";
import { ContactForm } from "@/features/contact/contact-form";
import { HERO_SLIDES } from "@/content/hero-slides";
import { routing, type Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import { getChurchProfile, getServiceTimings } from "@/services";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact.meta" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);

  const locale = rawLocale as Locale;

  const [t, tSite, profile, timings] = await Promise.all([
    getTranslations("contact"),
    getTranslations("site"),
    getChurchProfile(),
    getServiceTimings(),
  ]);

  const address = profile.address;
  const churchName = tSite("name");

  const fullAddress = [
    localize(address.lines, locale),
    `${localize(address.city, locale)} ${address.postalCode}`,
    `${localize(address.state, locale)}, ${localize(address.country, locale)}`,
  ];

  return (
    <main id="main">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        images={HERO_SLIDES.contact}
      />

      {/* Details + form */}
      <Section spacing="lg">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          {/* Details */}
          <div className="lg:col-span-5">
            <Reveal>
              <Heading as="h2" level="h3">
                {t("details.title")}
              </Heading>

              <dl className="mt-8 space-y-7">
                <div className="flex gap-4">
                  <span
                    aria-hidden
                    className="mt-0.5 shrink-0 text-accent-700"
                  >
                    <MapPin strokeWidth={1.5} className="size-5" />
                  </span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                      {t("details.address")}
                    </dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-[var(--foreground)]">
                      <address className="not-italic">
                        {fullAddress.map((line) => (
                          <span key={line} className="block">
                            {line}
                          </span>
                        ))}
                      </address>
                    </dd>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span
                    aria-hidden
                    className="mt-0.5 shrink-0 text-accent-700"
                  >
                    <Phone strokeWidth={1.5} className="size-5" />
                  </span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                      {t("details.phone")}
                    </dt>
                    <dd className="mt-1.5 space-y-1 text-sm">
                      {profile.phone.map((phone) => (
                        <a
                          key={phone}
                          href={`tel:${phone.replace(/\s/g, "")}`}
                          className="block text-[var(--foreground)] transition-colors hover:text-[var(--primary)]"
                        >
                          {phone}
                        </a>
                      ))}
                    </dd>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span
                    aria-hidden
                    className="mt-0.5 shrink-0 text-accent-700"
                  >
                    <Mail strokeWidth={1.5} className="size-5" />
                  </span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                      {t("details.email")}
                    </dt>
                    <dd className="mt-1.5 space-y-1 text-sm">
                      {profile.email.map((email) => (
                        <a
                          key={email}
                          href={`mailto:${email}`}
                          className="block break-all text-[var(--foreground)] transition-colors hover:text-[var(--primary)]"
                        >
                          {email}
                        </a>
                      ))}
                    </dd>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span
                    aria-hidden
                    className="mt-0.5 shrink-0 text-accent-700"
                  >
                    <Clock strokeWidth={1.5} className="size-5" />
                  </span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                      {t("details.office")}
                    </dt>
                    <dd className="mt-1.5 text-sm text-[var(--foreground)]">
                      {localize(profile.officeHours, locale)}
                    </dd>
                  </div>
                </div>
              </dl>
            </Reveal>
          </div>

          {/* Form */}
          <div className="lg:col-span-7">
            <Reveal direction="left">
              <Card variant="solid" padded="lg">
                <Heading as="h2" level="h3">
                  {t("form.title")}
                </Heading>

                <div className="mt-8">
                  <ContactForm />
                </div>
              </Card>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* Map */}
      <Section spacing="lg" tone="muted">
        <SectionHeading
          title={t("map.title")}
          action={
            <a
              href={address.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] transition-colors hover:text-brand-800"
            >
              {t("map.openInMaps")}
              <ExternalLink aria-hidden className="size-4" />
            </a>
          }
        />

        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <iframe
              src={address.embedUrl}
              title={t("map.label", { name: churchName })}
              width="100%"
              height="480"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block h-[380px] w-full border-0 sm:h-[480px]"
            />
          </div>
        </Reveal>
      </Section>

      {/* Service timings */}
      <Section spacing="lg">
        {/*
          Its own key, not `details.title`. That one heads the contact card
          above - address, phone, email, office hours - and this section is a
          table of service times; they were sharing a string and so could not be
          named accurately at the same time.
        */}
        <SectionHeading title={t("timings.title")} />
        <Reveal>
          <ServiceTimingsTable timings={timings} locale={locale} />
        </Reveal>
      </Section>
    </main>
  );
}
