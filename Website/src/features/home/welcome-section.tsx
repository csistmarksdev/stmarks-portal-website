import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import { getVisionMission } from "@/services";

export async function WelcomeSection() {
  const [t, tCommon, vision] = await Promise.all([
    getTranslations("home.welcome"),
    getTranslations("common"),
    getVisionMission(),
  ]);

  const locale = (await getLocale()) as Locale;

  return (
    <Section spacing="lg" tone="default">
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
        <div className="lg:col-span-6">
          <Reveal>
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <Heading as="h2" level="h1" className="mt-5">
              {t("title")}
            </Heading>
          </Reveal>

          <Reveal delay={0.1}>
            <Text size="lg" tone="muted" className="mt-6">
              {t("body")}
            </Text>
          </Reveal>

          <Reveal delay={0.18} className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={ROUTES.about}>
                {t("cta")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>

            <Button asChild size="lg" variant="secondary">
              <Link href={ROUTES.contact}>{t("secondaryCta")}</Link>
            </Button>
          </Reveal>
        </div>

        {/* Values grid */}
        <div className="lg:col-span-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {vision.values.map((value, index) => (
              <Reveal
                key={value.id}
                delay={0.08 * index}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-shadow duration-500 hover:shadow-lg hover:shadow-sand-900/5"
              >
                <span
                  aria-hidden
                  className="grid size-10 place-items-center rounded-full bg-accent-50 font-display text-sm font-semibold text-accent-700"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <h3 className="mt-4 font-display text-lg font-semibold">
                  {localize(value.title, locale)}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {localize(value.description, locale)}
                </p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3} className="mt-6">
            <Link
              href={ROUTES.about}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] transition-colors hover:text-brand-800"
            >
              {tCommon("learnMore")}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
