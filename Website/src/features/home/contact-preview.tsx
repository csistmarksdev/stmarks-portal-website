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

      {/* A ruled directory rather than four floating boxes — gilded marks, the
          rows divided like a register. */}
      <Reveal>
        <ul className="grid overflow-hidden rounded-[var(--radius-sanctuary)] bg-[var(--surface)] shadow-sanctuary ring-1 ring-sand-200/70 sm:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <li
                key={item.key}
                className="flex items-start gap-4 border-t border-sand-200/70 px-6 py-6 first:border-t-0 sm:px-8 sm:even:border-l sm:[&:nth-child(2)]:border-t-0"
              >
                <span
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-700 ring-1 ring-accent-500/20"
                >
                  <Icon className="size-5" />
                </span>

                <div className="min-w-0">
                  <h3 className="label text-accent-700">{item.label}</h3>

                  {item.href ? (
                    <a
                      href={item.href}
                      {...(item.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="mt-2 block leading-relaxed text-[var(--foreground)] transition-colors hover:text-[var(--primary)]"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p className="mt-2 leading-relaxed text-[var(--foreground)]">
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
