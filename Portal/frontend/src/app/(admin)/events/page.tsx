"use client";

import type { ChurchEvent, WithStatus } from "@portal/shared";
import { StarIcon } from "lucide-react";

import { ResourceListPage } from "@/components/admin/resource-list-page";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export default function EventsPage() {
  return (
    <ResourceListPage<WithStatus<ChurchEvent>>
      title="Events"
      eyebrow="What's on"
      description="Services, festivals and gatherings. Published events appear on the website's events page; featured ones are highlighted on the home page."
      apiPath="/admin/events"
      routeBase="/events"
      label="Event"
      searchPlaceholder="Search by title or slug…"
      emptyTitle="No events on the calendar"
      emptyHint="Add the next service or gathering and publish it when the details are settled."
      columns={[
        {
          key: "title",
          header: "Title",
          render: (event) => (
            <div className="flex items-center gap-2">
              <span className="font-medium">{event.title.en}</span>
              {event.featured && <StarIcon className="size-3.5 fill-amber-400 text-amber-400" />}
            </div>
          ),
        },
        {
          key: "startDate",
          header: "Starts",
          render: (event) => formatDateTime(event.startDate),
        },
        {
          /*
           * The venue is on every event card the website renders, and it was
           * the one detail this list did not show — so checking where something
           * was happening meant opening each event in turn.
           *
           * `location` is required on the event, so there is normally something
           * to print; the fallback covers records written before the field was
           * required rather than implying the venue is optional.
           */
          key: "location",
          header: "Venue",
          render: (event) =>
            event.location?.en ? (
              <span className="line-clamp-1">{event.location.en}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
        {
          key: "fellowship",
          header: "Fellowship",
          render: (event) =>
            event.fellowshipSlug ? (
              <Badge variant="secondary">{event.fellowshipSlug}</Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
      ]}
    />
  );
}
