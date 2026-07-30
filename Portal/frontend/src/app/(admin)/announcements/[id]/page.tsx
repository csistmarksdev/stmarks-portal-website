"use client";

import { use } from "react";

import { ResourceFormPage } from "@/components/admin/resource-form-page";
import { ANNOUNCEMENT_FIELDS } from "@/config/fields";

export default function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ResourceFormPage
      title="Edit announcement"
      apiPath="/admin/announcements"
      routeBase="/announcements"
      label="Announcement"
      fields={ANNOUNCEMENT_FIELDS}
      id={id}
    />
  );
}
