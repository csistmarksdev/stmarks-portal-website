"use client";

import { ResourceFormPage } from "@/components/admin/resource-form-page";
import { ALBUM_FIELDS } from "@/config/fields";

export default function NewAlbumPage() {
  return (
    <ResourceFormPage
      title="New album"
      apiPath="/admin/gallery"
      routeBase="/gallery"
      label="Album"
      fields={ALBUM_FIELDS}
      defaults={{ shared: false }}
    />
  );
}
