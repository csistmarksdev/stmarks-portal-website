import { BLOG_POSTS } from "@/data/blog.mock";
import type { BlogPost, FellowshipSlug } from "@/types/content";

import { isPlaceholderSlug, isPublishable } from "./guards";
import { apiGet, apiGetOrNull } from "./http";

/** F-003: seed posts never render. */
const clean = (posts: BlogPost[]) => posts.filter(isPublishable);

const newestFirst = (a: BlogPost, b: BlogPost) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

const TAGS = ["blog"];

export function getBlogPosts(limit?: number): Promise<BlogPost[]> {
  return apiGet<BlogPost[]>("/blog", {
    params: { limit: limit ? limit + 3 : undefined },
    tags: TAGS,
    fallback: () => [...BLOG_POSTS].sort(newestFirst),
  }).then((posts) => {
    const kept = clean(posts);
    return limit ? kept.slice(0, limit) : kept;
  });
}

export function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  return apiGetOrNull<BlogPost>(`/blog/${slug}`, {
    tags: TAGS,
    fallback: () => BLOG_POSTS.find((post) => post.slug === slug) ?? null,
  }).then((post) => (post && isPublishable(post) ? post : null));
}

/** Posts written about a particular event. */
export function getBlogPostsByEvent(eventSlug: string): Promise<BlogPost[]> {
  return apiGet<BlogPost[]>("/blog", {
    params: { event: eventSlug },
    tags: TAGS,
    fallback: () =>
      BLOG_POSTS.filter((post) => post.eventSlug === eventSlug).sort(newestFirst),
  }).then(clean);
}

export function getBlogPostsByFellowship(
  fellowshipSlug: FellowshipSlug,
): Promise<BlogPost[]> {
  return apiGet<BlogPost[]>("/blog", {
    params: { fellowship: fellowshipSlug },
    tags: TAGS,
    fallback: () =>
      BLOG_POSTS.filter((post) => post.fellowshipSlug === fellowshipSlug).sort(
        newestFirst,
      ),
  }).then(clean);
}

/** Slugs for `generateStaticParams`. */
export function getBlogSlugs(): Promise<string[]> {
  return apiGet<string[]>("/blog/slugs", {
    tags: TAGS,
    fallback: () => BLOG_POSTS.map((post) => post.slug),
  }).then((slugs) => slugs.filter((slug) => !isPlaceholderSlug(slug)));
}
