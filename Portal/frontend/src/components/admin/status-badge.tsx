import type { PublishStatus } from "@portal/shared";

import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<PublishStatus, "success" | "warning" | "muted"> = {
  published: "success",
  draft: "warning",
  archived: "muted",
};

/**
 * The record's workflow status — and, for a published record, whether it is
 * actually on the website right now (F-049): a future `publishAt` means it is
 * still waiting, a past `expiresAt` means it has come down.
 */
export function StatusBadge({
  status,
  publishAt,
  expiresAt,
}: {
  status: PublishStatus;
  publishAt?: string;
  expiresAt?: string;
}) {
  const now = Date.now();
  if (status === "published" && expiresAt && new Date(expiresAt).getTime() <= now) {
    return (
      <Badge variant="muted" title={`Expired ${new Date(expiresAt).toLocaleString()}`}>
        expired
      </Badge>
    );
  }
  if (status === "published" && publishAt && new Date(publishAt).getTime() > now) {
    return (
      <Badge variant="secondary" title={`Goes live ${new Date(publishAt).toLocaleString()}`}>
        scheduled
      </Badge>
    );
  }
  return <Badge variant={VARIANTS[status]}>{status}</Badge>;
}
