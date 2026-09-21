import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";

import { PullQuote } from "@/components/common/editorial";
import { Parallax } from "@/components/motion/parallax";
import { Reveal } from "@/components/motion/reveal";
import { Section } from "@/components/ui/section";
import { Eyebrow, Heading, Prose, Text } from "@/components/ui/typography";
import type { Locale } from "@/i18n/routing";
import { localize, localizeAll } from "@/lib/localize";
import { getPastorMessage } from "@/services";

export async function PastorMessageSection() {
  const [t, message] = await Promise.all([
    getTranslations("home.pastorMessage"),
    getPastorMessage(),
  ]);

  const locale = (await getLocale()) as Locale;

  const authorName = localize(message.authorName, locale);
  const authorRole = localize(message.authorRole, locale);

  return (
    <Section spacing="lg" tone="brand" className="overflow-hidden">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <Reveal>
            <div className="flex items-center gap-3">
              <span aria-hidden className="h-px w-6 shrink-0 bg-white/40" />
              <Eyebrow tone="onDark">{t("eyebrow")}</Eyebrow>
            </div>
            <Heading as="h2" level="h1" tone="onDark" className="mt-5">
              {t("title")}
            </Heading>
          </Reveal>

          <Reveal delay={0.1} className="mt-8">
            <PullQuote tone="onDark">{localize(message.excerpt, locale)}</PullQuote>
          </Reveal>

          <Reveal delay={0.18} className="mt-8">
            <Prose
              paragraphs={localizeAll(message.body, locale)}
              tone="onDark"
              size="base"
            />
          </Reveal>

          {/* Signed off like a letter: a gilded rule, then the presbyter's
              portrait medallion and name. */}
          <Reveal delay={0.24} className="mt-10">
            <span
              aria-hidden
              className="mb-7 block h-px w-16 rule-section rule-section-dark"
            />

            <div className="flex items-center gap-4">
              {message.authorImage ? (
                <span className="relative size-14 shrink-0 overflow-hidden rounded-full ring-2 ring-accent-400/40">
                  <Image
                    src={message.authorImage.url}
                    alt={localize(message.authorImage.alt, locale)}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </span>
              ) : (
                <span
                  aria-hidden
                  className="grid size-14 shrink-0 place-items-center rounded-full bg-white/10 font-display text-lg font-semibold text-accent-200 ring-2 ring-accent-400/40"
                >
                  {authorName.replace(/^Rev\.\s*/i, "").charAt(0)}
                </span>
              )}

              <div>
                <p className="font-display text-lg font-semibold text-white">
                  {authorName}
                </p>
                <Text size="sm" tone="onDark">
                  {authorRole}
                </Text>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Decorative panel */}
        <div className="hidden lg:col-span-5 lg:block">
          <Parallax strength={40}>
            <div
              aria-hidden
              className="lancet-arch relative aspect-[3/4] overflow-hidden ring-1 ring-white/10"
            >
              <Image
                src="/frames/ezgif-frame-135.jpg"
                alt=""
                fill
                sizes="40vw"
                className="object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/30 to-transparent" />
              {/* Gilded hairline just inside the arch, like a ruled margin. */}
              <span
                aria-hidden
                className="lancet-arch pointer-events-none absolute inset-3 ring-1 ring-accent-400/20"
              />
            </div>
          </Parallax>
        </div>
      </div>
    </Section>
  );
}
