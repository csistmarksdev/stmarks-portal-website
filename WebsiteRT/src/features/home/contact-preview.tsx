import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import { getChurchProfile } from "@/services";

export async function ContactPreview() {
  const [t, tContact, profile] = await Promise.all([
    getTranslations("home.contact"),
    getTranslations("contact.details"),
    getChurchProfile(),
  ]);

  const locale = (await getLocale()) as Locale;
  const address = profile.address;

  const items = [
    {
      key: "address",
      icon: MapPin,
      label: tContact("address"),
      value: `${localize(address.lines, locale)}, ${localize(address.city, locale)} ${address.postalCode}`,
      href: address.mapsUrl,
      external: true,
    },
    {
      key: "phone",
      icon: Phone,
      label: tContact("phone"),
      value: profile.phone[0],
      href: `tel:${profile.phone[0]?.replace(/\s/g, "")}`,
      external: false,
    },
    {
      key: "email",
      icon: Mail,
      label: tContact("email"),
      value: profile.email[0],
      href: `mailto:${profile.email[0]}`,
      external: false,
    },
    {
      key: "office",
      icon: Clock,
      label: tContact("office"),
      value: localize(profile.officeHours, locale),
      href: null,
      external: false,
    },
  ] as const;

  return (
    <Section spacing="lg">
      <SectionHeading
        index="06"
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={ROUTES.contact}>
                {t("cta")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>

            <Button asChild variant="secondary">
              <a
                href={address.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("directions")}
              </a>
            </Button>
          </div>
        }
      />

      {/*
        A register, not four boxes.

        Each entry carried its icon inside a tinted circle — the treatment every
        template on the internet uses for its list of features, and four of them
        in a two-by-two grid is exactly that layout. The circles are gone: the
        glyph sits in the margin at the weight of a printer's mark, the label
        rides above the answer in small caps, and the rows are divided by the
        same hairline that rules the rest of the page. It reads like the back
        page of a parish notice, which is where a stranger looks for an address.
      */}
      <Reveal>
        <ul className="relative grid overflow-hidden rounded-card bg-[var(--surface)] shadow-card ring-1 ring-[var(--border)] sm:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <li
                key={item.key}
                className="group/entry flex items-start gap-4 border-t border-[var(--border)] px-6 py-7 first:border-t-0 sm:px-9 sm:py-8 sm:even:border-l sm:[&:nth-child(2)]:border-t-0"
              >
                <Icon
                  aria-hidden
                  strokeWidth={1.5}
                  className="mt-0.5 size-5 shrink-0 text-accent-700"
                />

                <div className="min-w-0">
                  <h3 className="label text-[var(--muted-foreground)]">
                    {item.label}
                  </h3>

                  {item.href ? (
                    <a
                      href={item.href}
                      {...(item.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="link-underline mt-2.5 inline-block leading-relaxed text-[var(--foreground)] transition-colors hover:text-[var(--primary)]"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p className="mt-2.5 leading-relaxed text-[var(--foreground)]">
                      {item.value}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Reveal>
    </Section>
  );
}
