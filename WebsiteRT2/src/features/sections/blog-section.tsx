import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { BlogCard } from "@/components/cards/blog-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHero } from "@/components/common/page-hero";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { ROUTES, SECTION_IDS, heroDirection } from "@/constants/site";
import { HERO_SLIDES } from "@/content/hero-slides";
import { FallingPages } from "@/features/sections/falling-pages";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBlogPosts } from "@/services";

/*
 * Six posts: two full rows of three at `lg`, three of two at `sm`. The rest
 * are at `/events/blog`.
 */
const CHAPTER_POSTS = 6;

/**
 * The parish blog, as an index of its most recent posts.
 *
 * The posts themselves are still pages - long-form writing is the one thing a
 * single document genuinely cannot absorb - and the full index is one too.
 */
export async function BlogSection() {
  const locale = (await getLocale()) as Locale;

  const [t, posts] = await Promise.all([
    getTranslations("blog"),
    getBlogPosts(CHAPTER_POSTS),
  ]);

  return (
    <div id="blog">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        images={HERO_SLIDES.blog}
        variant="section"
        direction={heroDirection(SECTION_IDS.blog)}
      />

      {/*
        The page, before the index of pages.

        The hero has just said "written from the life of the church", and the
        block below answers it the only way an index can - six cards, six
        titles, six reading times. That is the right way to *use* the chapter
        and the wrong way to open it: it hands the reader a list of writing
        without ever showing them any. So the chapter opens on the paper itself:
        the page holds still, and loose sheets fall slowly through the dark,
        turning over and catching the light as they pass.

        Two things stood here first and both failed the same way. A lectern with
        a Bible on it read as clipart, because a drawn object at this scale
        always will. A column of ruled lines with a band of light travelling
        down it read as a flatbed scanner, which is in fairness exactly what
        that is a picture of. A sheet of paper at a distance has no detail in it
        to get wrong, and falling is not a thing any machine does.

        The same pin the leadership, fellowship and events chapters open on,
        deliberately - and a fourth picture inside it. See the note at the head
        of `falling-pages.tsx`.

        `spacing="none"` and `contained={false}`: the stage *is* the section. It
        owns a screen and fills it edge to edge, so the section's padding would
        push it off the screen it is meant to fill, and the centred measure
        would cut the frame off short of both sides. `atmosphere={false}`
        because the stage brings its own light, which is the entire subject.
      */}
      <Section spacing="none" tone="dark" contained={false} atmosphere={false}>
        <FallingPages
          eyebrow={t("reading.eyebrow")}
          title={t("reading.title")}
          subtitle={t("reading.subtitle")}
          label={t("reading.label")}
        />
      </Section>

      <Section spacing="lg">
        <SectionHeading
          title={t("latest")}
          action={
            posts.length > 0 ? (
              <Button asChild variant="secondary">
                <Link href={ROUTES.blogArchive}>
                  {t("viewAll")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : undefined
          }
        />

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
      </Section>
    </div>
  );
}
