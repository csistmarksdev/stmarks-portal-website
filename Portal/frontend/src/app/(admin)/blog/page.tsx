"use client";

import type { BlogPost, WithStatus } from "@portal/shared";

import { ResourceListPage } from "@/components/admin/resource-list-page";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function BlogPage() {
  return (
    <ResourceListPage<WithStatus<BlogPost>>
      title="Blog"
      eyebrow="Stories & reports"
      description="Reports on events, reflections and testimonies from church life. Reading time is worked out automatically from the text."
      apiPath="/admin/blog"
      routeBase="/blog"
      label="Post"
      searchPlaceholder="Search by title…"
      emptyTitle="No stories written yet"
      emptyHint="After the next event, write up how it went — posts can link back to the event they report on."
      banner={(post) => post.coverImage}
      bannerNoun="cover"
      columns={[
        {
          key: "title",
          header: "Title",
          render: (post) => <span className="font-medium">{post.title.en}</span>,
        },
        {
          key: "publishedAt",
          header: "Published",
          render: (post) => formatDate(post.publishedAt),
        },
        {
          key: "author",
          header: "Author",
          render: (post) => post.author.en,
        },
        {
          key: "event",
          header: "Event",
          render: (post) =>
            post.eventSlug ? (
              <Badge variant="secondary">{post.eventSlug}</Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
      ]}
    />
  );
}
