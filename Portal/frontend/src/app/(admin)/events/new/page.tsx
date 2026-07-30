"use client";

import { ResourceFormPage } from "@/components/admin/resource-form-page";
import { EVENT_FIELDS } from "@/config/fields";

export default function NewEventPage() {
  return (
    <ResourceFormPage
      title="New event"
      apiPath="/admin/events"
      routeBase="/events"
      label="Event"
      fields={EVENT_FIELDS}
      defaults={{ featured: false, description: [] }}
    />
  );
}
