"use client";

import type { GalleryAlbum, WithStatus } from "@portal/shared";

import { ResourceListPage } from "@/components/admin/resource-list-page";
import { formatDate } from "@/lib/utils";

export default function GalleryPage() {
  return (
    <ResourceListPage<WithStatus<GalleryAlbum>>
      title="Gallery"
      eyebrow="Photo archive"
      description="Albums from services, festivals and fellowship gatherings. Open an album to add, remove or reorder its photos."
      apiPath="/admin/gallery"
      routeBase="/gallery"
      label="Album"
      searchPlaceholder="Search albums…"
      emptyTitle="The archive is empty"
      emptyHint="Create an album for a recent occasion, pick a cover, then fill it with photos from the media library."
      columns={[
        {
          key: "title",
          header: "Album",
          render: (album) => <span className="font-medium">{album.title.en}</span>,
        },
        {
          key: "date",
          header: "Event date",
          render: (album) => formatDate(album.date),
        },
        {
          key: "photos",
          header: "Photos",
          render: (album) => album.photos?.length ?? 0,
          className: "w-24",
        },
      ]}
    />
  );
}
