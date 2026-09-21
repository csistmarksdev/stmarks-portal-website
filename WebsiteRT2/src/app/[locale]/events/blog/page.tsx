import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { BlogCard } from "@/components/cards/blog-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageMasthead } from "@/components/common/page-masthead";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getBlogPosts } from "@/services";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog.meta" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

/**
 * Every post the parish has published.
 *
 * The counterpart to the blog chapter on the home page, which carries only the
 * six most recent. The individual posts have always been pages of their own -
 * long-form writing is the one thing a single document genuinely cannot
 * absorb - and this is the index that gathers them.
 */
export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);

  const locale = rawLocale as Locale;

  const [t, tNav, tCommon, posts] = await Promise.all([
    getTranslations("blog"),
    getTranslations("nav"),
    getTranslations("common"),
    getBlogPosts(),
  ]);

  return (
    <main id="main">
      <PageMasthead
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
      />

      <Section spacing="lg">
        {posts.length === 0 ? (
          <EmptyState message={t("empty")} />
        ) : (
          <StaggerGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {posts.map((post) => (
              <StaggerItem key={post.id}>
                <BlogCard post={post} locale={locale} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}

        <div className="mt-14 flex justify-center">
          <Button asChild variant="secondary">
            <Link href={ROUTES.blog}>
              <ArrowLeft aria-hidden />
              {tCommon("backTo", { page: tNav("eventsItems.blog") })}
            </Link>
          </Button>
        </div>
      </Section>
    </main>
  );
}
