import { BLOG_POSTS } from "@/data/blog.mock";
import type { BlogPost, FellowshipSlug } from "@/types/content";

import { mockResponse } from "./http";

const newestFirst = (a: BlogPost, b: BlogPost) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

export function getBlogPosts(limit?: number): Promise<BlogPost[]> {
  const posts = [...BLOG_POSTS].sort(newestFirst);
  return mockResponse(limit ? posts.slice(0, limit) : posts);
}

export function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  return mockResponse(BLOG_POSTS.find((post) => post.slug === slug) ?? null);
}

/** Posts written about a particular event. */
export function getBlogPostsByEvent(eventSlug: string): Promise<BlogPost[]> {
  return mockResponse(
    BLOG_POSTS.filter((post) => post.eventSlug === eventSlug).sort(newestFirst),
  );
}

export function getBlogPostsByFellowship(
  fellowshipSlug: FellowshipSlug,
): Promise<BlogPost[]> {
  return mockResponse(
    BLOG_POSTS.filter((post) => post.fellowshipSlug === fellowshipSlug).sort(
      newestFirst,
    ),
  );
}

/** Slugs for `generateStaticParams`. */
export function getBlogSlugs(): Promise<string[]> {
  return mockResponse(BLOG_POSTS.map((post) => post.slug));
}
