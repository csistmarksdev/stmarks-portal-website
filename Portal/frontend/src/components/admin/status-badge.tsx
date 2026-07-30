import type { PublishStatus } from "@portal/shared";

import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<PublishStatus, "success" | "warning" | "muted"> = {
  published: "success",
  draft: "warning",
  archived: "muted",
};

export function StatusBadge({ status }: { status: PublishStatus }) {
  return <Badge variant={VARIANTS[status]}>{status}</Badge>;
}
