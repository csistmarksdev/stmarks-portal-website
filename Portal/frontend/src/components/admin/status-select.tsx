"use client";

import { PUBLISH_STATUSES, type PublishStatus } from "@portal/shared";
import { InfoIcon } from "lucide-react";
import { useEffect } from "react";

import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";

/**
 * The approval rule in the editor UI (church request, 22 Nov 2026).
 *
 * Only an admin or super admin (`content.publish`) can publish. Everyone else
 * saves drafts and submits them for approval ("pending"); a published or
 * archived record is read-only for them. The backend enforces the same rule
 * (`backend/src/common/utils/approval.ts`); this only keeps the UI honest so
 * nobody is offered a choice the server will refuse.
 */

const SUBMITTER_STATUSES: readonly PublishStatus[] = ["draft", "pending"];

const LABELS: Record<PublishStatus, string> = {
  draft: "Draft — not on the website",
  pending: "Awaiting approval — an admin will review and publish it",
  published: "Published — live on the website",
  archived: "Archived — hidden, kept on file",
};

/**
 * How the approval rule applies to editing a record in `status`.
 *
 * Nobody is locked out any more (church request, 23 Nov 2026): someone who
 * cannot publish may edit a live record too, and `holds` says their save is
 * held as a change for an admin to approve rather than applied.
 */
export function useApprovalLock(status: PublishStatus | undefined, isEdit: boolean) {
  const { can } = useAuth();
  const canPublish = can("content.publish");
  const holds = isEdit && !canPublish && (status === "published" || status === "archived");
  return { canPublish, holds, locked: false };
}

export function StatusSelect({
  value,
  onChange,
  isNew,
  className,
}: {
  value: PublishStatus;
  onChange: (next: PublishStatus) => void;
  isNew: boolean;
  className?: string;
}) {
  const { can } = useAuth();
  const canPublish = can("content.publish");
  const options = canPublish ? PUBLISH_STATUSES : SUBMITTER_STATUSES;

  // A record type that defaults to "published" (fellowships) starts as a draft
  // for someone who cannot publish.
  useEffect(() => {
    if (isNew && !canPublish && !SUBMITTER_STATUSES.includes(value)) onChange("draft");
  }, [isNew, canPublish, value, onChange]);

  return (
    <Select
      className={className}
      value={value}
      disabled={!canPublish && !SUBMITTER_STATUSES.includes(value)}
      onChange={(event) => onChange(event.target.value as PublishStatus)}
    >
      {/* A locked record still shows its real status. */}
      {(options.includes(value) ? options : [...options, value]).map((status) => (
        <option key={status} value={status}>
          {!canPublish && status === "pending" ? "Submit for approval — an admin will review and publish it" : LABELS[status]}
        </option>
      ))}
    </Select>
  );
}

/** Shown on a form an editor cannot save because the record is live. */
export function ApprovalLockNotice({ status }: { status: PublishStatus }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl bg-accent-fg/10 px-4 py-3 text-sm text-accent-fg ring-1 ring-accent-fg/20">
      <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        This item is {status}. Only an admin or super admin can change it. Ask
        one to make the edit, or to move it back to draft.
      </p>
    </div>
  );
}
