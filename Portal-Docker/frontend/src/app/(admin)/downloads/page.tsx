"use client";

import type { DownloadFile, WithStatus } from "@portal/shared";

import { ResourceListPage } from "@/components/admin/resource-list-page";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function DownloadsPage() {
  return (
    <ResourceListPage<WithStatus<DownloadFile>>
      title="Downloads"
      eyebrow="Papers & forms"
      description="Sunday bulletins, application forms and church documents. File size and format come from the upload itself."
      apiPath="/admin/downloads"
      routeBase="/downloads"
      label="Download"
      searchPlaceholder="Search files…"
      emptyTitle="Nothing to hand out yet"
      emptyHint="Upload this week's bulletin or a form to the media library, then list it here for the congregation."
      columns={[
        {
          key: "title",
          header: "Title",
          render: (file) => <span className="font-medium">{file.title.en}</span>,
        },
        {
          key: "category",
          header: "Category",
          render: (file) => <Badge variant="secondary">{file.category}</Badge>,
        },
        {
          key: "format",
          header: "File",
          render: (file) => `${file.format} · ${file.size}`,
        },
        {
          key: "publishedAt",
          header: "Published",
          render: (file) => formatDate(file.publishedAt),
        },
      ]}
    />
  );
}
