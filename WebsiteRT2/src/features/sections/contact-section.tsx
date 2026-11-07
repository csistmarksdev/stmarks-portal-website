import {
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { CrossMark } from "@/components/common/ornament";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Section, SectionHeading } from "@/components/ui/section";
import { Heading, Text } from "@/components/ui/typography";
import { SECTION_IDS } from "@/constants/site";
import { ContactForm } from "@/features/contact/contact-form";
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import { getChurchProfile } from "@/services";

/**
 * Contact - the closing chapter.
 *
 * Was `/contact`, and was the last page on the site that had not been folded
 * into the document. What stood here before was a *preview* of it: the
 * invitation, the four facts, and a button that sent the reader to another URL
 * to type a message. On a single-page site that button was the whole problem -
 * it is the only link in the navigation that used to leave the page, and it
 * left it to reach content that had every reason to be three hundred pixels
 * further down.
 *
 * So the page came here whole: the register on the left, the form beside it,
 * the map beneath. The "contact the church" button is gone rather than
 * relinked - a call to action pointing at the form directly below it is an
 * instruction to scroll, which the reader can already do.
 *
 * `contact.*` keys are reused verbatim from the page this replaced, so nothing
 * had to be re-translated; only the invitation at the head is the home page's
 * own `home.contact.*`, which is warmer than the page hero it now sits under.
 */
export async function ContactSection() {
  const [t, tContact, profile] = await Promise.all([
    getTranslations("home.contact"),
    getTranslations("contact"),
    getChurchProfile(),
  ]);

  const locale = (await getLocale()) as Locale;
  const address = profile.address;

  const items = [
    {
      key: "address",
      icon: MapPin,
      label: tContact("details.address"),
      value: `${localize(address.lines, locale)}, ${localize(address.city, locale)} ${address.postalCode}`,
      href: address.mapsUrl,
      external: true,
    },
    {
      key: "phone",
      icon: Phone,
      label: tContact("details.phone"),
      value: profile.phone[0],
      href: `tel:${profile.phone[0]?.replace(/\s/g, "")}`,
      external: false,
    },
    {
      key: "email",
      icon: Mail,
      label: tContact("details.email"),
      value: profile.email[0],
      href: `mailto:${profile.email[0]}`,
      external: false,
    },
    {
      key: "office",
      icon: Clock,
      label: tContact("details.office"),
      value: localize(profile.officeHours, locale),
      href: null,
      external: false,
    },
  ] as const;

  return (
    <div id={SECTION_IDS.contact}>
      <Section spacing="lg">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          {/* The invitation, and the register that answers it. */}
          <div className="lg:col-span-5">
            <Reveal>
              <div className="flex items-center gap-3.5">
                <CrossMark size="sm" tone="sacred" />
                <span className="label text-accent-700">{t("eyebrow")}</span>
              </div>

              <Heading
                as="h2"
                level="h2"
                className="mt-6 text-[clamp(1.875rem,2.6vw+1rem,2.75rem)] leading-[1.1] tracking-[-0.022em]"
              >
                {t("title")}
              </Heading>

              <span aria-hidden className="mt-7 block h-px w-24 rule-section" />

              <Text size="lg" tone="muted" className="mt-6 max-w-md">
                {t("subtitle")}
              </Text>
            </Reveal>

            {/*
              A register, not four boxes.

              Each entry used to carry its icon in a tinted circle inside a card
              in a two-by-two grid - the arrangement every template on the
              internet uses for its list of features, and one that makes four
              unrelated facts look like four equal options. They are not
              options. They are one address, read down: what it is on the left,
              what it says on the right, ruled off from each other the way a
              parish notice sets its back page.
            */}
            <Reveal delay={0.1}>
              <dl className="mt-10 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.key}
                      /*
                        The label column is fixed, so every answer starts on the
                        same line down the block - which is the whole point of a
                        register, and what a label sized to its own text
                        destroys. It collapses to stacked rows on a phone, where
                        a 9rem column would leave the addresses two words wide.
                      */
                      className="grid gap-2 py-6 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-5 sm:py-7"
                    >
                      <dt className="label flex items-center gap-2.5 text-[var(--muted-foreground)]">
                        <Icon
                          aria-hidden
                          strokeWidth={1.5}
                          className="size-4 shrink-0 text-accent-600"
                        />
                        {item.label}
                      </dt>

                      <dd className="min-w-0 leading-relaxed text-[var(--foreground)]">
                        {item.href ? (
                          <a
                            href={item.href}
                            {...(item.external
                              ? { target: "_blank", rel: "noopener noreferrer" }
                              : {})}
                            className="link-underline break-words transition-colors hover:text-[var(--primary)]"
                          >
                            {item.value}
                          </a>
                        ) : (
                          item.value
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </Reveal>

            {/* Directions is the one action that still leaves the page, because
                the place it goes to is a map application. */}
            <Reveal delay={0.16}>
              <div className="mt-9">
                <Button asChild size="lg" variant="secondary">
                  <a
                    href={address.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("directions")}
                    <ExternalLink aria-hidden />
                  </a>
                </Button>
              </div>
            </Reveal>
          </div>

          {/* The form that used to be a click away. */}
          <div className="lg:col-span-7">
            <Reveal direction="left">
              <Card variant="solid" padded="lg">
                <Heading as="h2" level="h3">
                  {tContact("form.title")}
                </Heading>

                <div className="mt-8">
                  <ContactForm />
                </div>
              </Card>
            </Reveal>
          </div>
        </div>
      </Section>

      <Section spacing="lg" tone="muted" id="find-us">
        <SectionHeading
          title={tContact("map.title")}
          action={
            <a
              href={address.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] transition-colors hover:text-brand-800"
            >
              {tContact("map.openInMaps")}
              <ExternalLink aria-hidden className="size-4" />
            </a>
          }
        />

        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <iframe
              src={address.embedUrl}
              title={tContact("map.label", { name: localize(profile.name, locale) })}
              width="100%"
              height="480"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block h-[380px] w-full border-0 sm:h-[480px]"
            />
          </div>
        </Reveal>
      </Section>
    </div>
  );
}
