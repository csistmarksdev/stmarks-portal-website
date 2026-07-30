"use client";

import { ResourceFormPage } from "@/components/admin/resource-form-page";
import { ANNOUNCEMENT_FIELDS } from "@/config/fields";

export default function NewAnnouncementPage() {
  return (
    <ResourceFormPage
      title="New announcement"
      apiPath="/admin/announcements"
      routeBase="/announcements"
      label="Announcement"
      fields={ANNOUNCEMENT_FIELDS}
      defaults={{ pinned: false }}
    />
  );
}
