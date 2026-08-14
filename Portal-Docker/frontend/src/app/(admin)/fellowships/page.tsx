"use client";

import type { Fellowship, WithStatus } from "@portal/shared";

import { ResourceListPage } from "@/components/admin/resource-list-page";
import { Badge } from "@/components/ui/badge";

export default function FellowshipsPage() {
  return (
    <ResourceListPage<WithStatus<Fellowship>>
      title="Fellowships"
      eyebrow="Church life"
      description="The eight ministries of the church, from Sunday School to the choir. Each one has its own page on the website — the web addresses are fixed."
      apiPath="/admin/fellowships"
      routeBase="/fellowships"
      label="Fellowship"
      searchPlaceholder="Search fellowships…"
      emptyTitle="No fellowships set up"
      emptyHint="Run the seed, or create each of the eight fellowships by hand — the website expects all of them."
      banner={(fellowship) => fellowship.banner}
      bannerNoun="banner"
      columns={[
        {
          key: "name",
          header: "Name",
          render: (fellowship) => (
            <span className="font-medium">{fellowship.name.en}</span>
          ),
        },
        {
          key: "slug",
          header: "Slug",
          render: (fellowship) => <Badge variant="secondary">{fellowship.slug}</Badge>,
        },
        {
          key: "committee",
          header: "Committee",
          render: (fellowship) => `${fellowship.committee?.length ?? 0} members`,
        },
        {
          key: "order",
          header: "Order",
          render: (fellowship) => fellowship.order,
          className: "w-20",
        },
      ]}
    />
  );
}
