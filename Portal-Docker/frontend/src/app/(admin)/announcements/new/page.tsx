"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { ResourceFormPage } from "@/components/admin/resource-form-page";
import { ANNOUNCEMENT_FIELDS } from "@/config/fields";

/**
 * Also the manifest's `share_target`: "Share → St. Mark's" from another app on
 * a phone opens this page with `?title=&text=&url=`, and what was shared
 * starts the English title and body. Nothing is saved until the writer does.
 */
function NewAnnouncement() {
  const params = useSearchParams();
  const sharedTitle = params.get("title")?.trim() ?? "";
  const sharedBody = [params.get("text"), params.get("url")]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n\n");

  return (
    <ResourceFormPage
      title="New announcement"
      apiPath="/admin/announcements"
      routeBase="/announcements"
      label="Announcement"
      fields={ANNOUNCEMENT_FIELDS}
      defaults={{
        pinned: false,
        ...(sharedTitle ? { title: { en: sharedTitle, ta: "" } } : {}),
        ...(sharedBody ? { body: { en: sharedBody, ta: "" } } : {}),
      }}
    />
  );
}

export default function NewAnnouncementPage() {
  return (
    <Suspense>
      <NewAnnouncement />
    </Suspense>
  );
}
