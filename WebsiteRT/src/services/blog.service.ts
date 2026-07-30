import { BLOG_POSTS } from "@/data/blog.mock";
import type { BlogPost, FellowshipSlug } from "@/types/content";

import { apiGet, apiGetOrNull } from "./http";

const newestFirst = (a: BlogPost, b: BlogPost) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

const TAGS = ["blog"];

export function getBlogPosts(limit?: number): Promise<BlogPost[]> {
  return apiGet<BlogPost[]>("/blog", {
    params: { limit },
    tags: TAGS,
    fallback: () => {
      const posts = [...BLOG_POSTS].sort(newestFirst);
      return limit ? posts.slice(0, limit) : posts;
    },
  });
}

export function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  return apiGetOrNull<BlogPost>(`/blog/${slug}`, {
    tags: TAGS,
    fallback: () => BLOG_POSTS.find((post) => post.slug === slug) ?? null,
  });
}

/** Posts written about a particular event. */
export function getBlogPostsByEvent(eventSlug: string): Promise<BlogPost[]> {
  return apiGet<BlogPost[]>("/blog", {
    params: { event: eventSlug },
    tags: TAGS,
    fallback: () =>
      BLOG_POSTS.filter((post) => post.eventSlug === eventSlug).sort(newestFirst),
  });
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
  });
}

/** Slugs for `generateStaticParams`. */
export function getBlogSlugs(): Promise<string[]> {
  return apiGet<string[]>("/blog/slugs", {
    tags: TAGS,
    fallback: () => BLOG_POSTS.map((post) => post.slug),
  });
}
