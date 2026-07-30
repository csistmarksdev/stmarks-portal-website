"use client";

import { use } from "react";

import { ResourceFormPage } from "@/components/admin/resource-form-page";
import { EVENT_FIELDS } from "@/config/fields";

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ResourceFormPage
      title="Edit event"
      apiPath="/admin/events"
      routeBase="/events"
      label="Event"
      fields={EVENT_FIELDS}
      id={id}
    />
  );
}
