import { FELLOWSHIP_SLUGS } from "@portal/shared";

import type { FieldDef } from "@/components/admin/resource-form-page";

export const fellowshipOptions = FELLOWSHIP_SLUGS.map((slug) => ({
  value: slug,
  label: slug
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" "),
}));

export const EVENT_FIELDS: FieldDef[] = [
  { kind: "localized", name: "title", label: "Title", required: true },
  { kind: "localized", name: "summary", label: "Summary", multiline: true, required: true },
  { kind: "paragraphs", name: "description", label: "Description" },
  { kind: "date", name: "startDate", label: "Starts", withTime: true, required: true },
  { kind: "date", name: "endDate", label: "Ends", withTime: true },
  { kind: "localized", name: "location", label: "Location", required: true },
  { kind: "image", name: "image", label: "Event image" },
  { kind: "select", name: "fellowshipSlug", label: "Hosted by fellowship", options: fellowshipOptions },
  { kind: "localized", name: "organiser", label: "Organiser" },
  {
    kind: "checkbox",
    name: "featured",
    label: "Featured event",
    help: "Featured events are highlighted on the website home page",
  },
];

/*
 * Blog posts have no entry here on purpose. Writing an article is not the same
 * activity as filling in a record, so they use the dedicated stepped editor in
 * `app/(admin)/blog/blog-form.tsx` rather than the generic form renderer.
 */

export const ANNOUNCEMENT_FIELDS: FieldDef[] = [
  { kind: "localized", name: "title", label: "Title", required: true },
  { kind: "localized", name: "body", label: "Body", multiline: true, required: true },
  { kind: "date", name: "publishedAt", label: "Published on", required: true },
  { kind: "checkbox", name: "pinned", label: "Pinned", help: "Only one announcement can be pinned — pinning this unpins the rest" },
  { kind: "select", name: "fellowshipSlug", label: "Fellowship", options: fellowshipOptions },
];

export const ALBUM_FIELDS: FieldDef[] = [
  { kind: "localized", name: "title", label: "Album title", required: true },
  { kind: "localized", name: "description", label: "Description", multiline: true },
  { kind: "date", name: "date", label: "Event date", required: true },
  { kind: "image", name: "cover", label: "Cover image", required: true },
  {
    kind: "select",
    name: "fellowshipSlug",
    label: "Fellowship",
    options: fellowshipOptions,
  },
  {
    kind: "checkbox",
    name: "shared",
    label: "Churchwide album",
    help: "Shows in every fellowship's gallery — for occasions like Christmas or the harvest festival. Leave the fellowship above unset.",
  },
];
