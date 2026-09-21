import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Heading, Prose } from "@/components/ui/typography";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/date";
import { localize, localizeAll } from "@/lib/localize";
import { getBlogPostBySlug, getBlogSlugs, getEventBySlug } from "@/services";

export async function generateStaticParams() {
  const slugs = await getBlogSlugs();

  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) return {};

  const title = localize(post.title, locale as Locale);
  const description = localize(post.excerpt, locale as Locale);

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: post.publishedAt,
      authors: [localize(post.author, locale as Locale)],
      images: post.coverImage ? [{ url: post.coverImage.url }] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  setRequestLocale(rawLocale);

  const locale = rawLocale as Locale;
  const post = await getBlogPostBySlug(slug);

  if (!post) notFound();

  const t = await getTranslations("blog");

  // Posts may report on an event; link back to it when they do.
  const relatedEvent = post.eventSlug
    ? await getEventBySlug(post.eventSlug)
    : null;

  return (
    <main id="main">
      <article>
        {/* Masthead */}
        <header className="bg-sand-950 pb-16 pt-[calc(var(--header-height)+4.5rem)] text-white sm:pb-20">
          <Container size="md">
            <Reveal>
              <Link
                href={ROUTES.blog}
                className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
              >
                <ArrowLeft aria-hidden className="size-4" />
                {t("backToBlog")}
              </Link>

              <Heading as="h1" level="h1" tone="onDark" className="mt-8">
                {localize(post.title, locale)}
              </Heading>

              <p className="numeric label mt-8 text-white/50">
                <time dateTime={post.publishedAt}>
                  {formatDate(post.publishedAt, locale)}
                </time>
                <span aria-hidden className="mx-2">
                  ·
                </span>
                {t("by", { author: localize(post.author, locale) })}
                {post.readingMinutes ? (
                  <>
                    <span aria-hidden className="mx-2">
                      ·
                    </span>
                    {t("readingTime", { minutes: post.readingMinutes })}
                  </>
                ) : null}
              </p>
            </Reveal>
          </Container>
        </header>

        {post.coverImage ? (
          <Container size="md" className="-mt-10 sm:-mt-14">
            <Reveal>
              <div className="relative aspect-[16/9] overflow-hidden rounded-card bg-sand-200 shadow-card ring-1 ring-[var(--border)]">
                <Image
                  src={post.coverImage.url}
                  alt={localize(post.coverImage.alt, locale)}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 800px"
                  className="object-cover"
                />
              </div>
            </Reveal>
          </Container>
        ) : null}

        <Section spacing="lg" containerSize="md">
          <Reveal>
            {/* Slightly larger measure than body copy - this is long-form. */}
            <Prose paragraphs={localizeAll(post.body, locale)} size="lg" lead />
          </Reveal>

          {relatedEvent ? (
            <Reveal className="mt-16">
              <span aria-hidden className="mb-6 block h-px w-16 rule-section" />
              <Link
                href={ROUTES.event(relatedEvent.slug)}
                className="group flex items-center justify-between gap-6"
              >
                <span>
                  <span className="label text-[var(--muted-foreground)]">
                    {t("relatedEvent")}
                  </span>
                  <span className="mt-2 block font-display text-xl font-semibold transition-colors group-hover:text-[var(--primary)]">
                    {localize(relatedEvent.title, locale)}
                  </span>
                </span>

                <ArrowUpRight
                  aria-hidden
                  className="size-5 shrink-0 text-sand-400 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--primary)]"
                />
              </Link>
            </Reveal>
          ) : null}
        </Section>
      </article>
    </main>
  );
}
