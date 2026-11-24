"use client";

import type { ContentRevision, PublishStatus } from "@portal/shared";
import { ArrowLeftIcon, CheckIcon, ClockIcon, Undo2Icon } from "lucide-react";
import Link from "next/link";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

/**
 * The editing page's actions, in its header beside Back: Save, and for an
 * approver looking at a submission, Approve. They used to sit at the foot of
 * the details column, out of sight on a long record.
 *
 * Approve and Reject appear only when the record as saved is awaiting
 * approval and the signed-in user can publish (`content.publish` - admins and
 * super admins). Approve publishes it; Reject sends it back to its writer as a
 * draft - off the website, editable, ready to resubmit.
 */
export function FormActions({
  backHref,
  savedStatus,
  onSave,
  onApprove,
  onReject,
  saveLabel,
  busy,
  disabled,
}: {
  backHref: string;
  /** The record's status on the server - not the one being edited. */
  savedStatus?: PublishStatus;
  onSave: () => void;
  onApprove?: () => void;
  onReject?: () => unknown;
  saveLabel: string;
  busy: boolean;
  disabled?: boolean;
}) {
  const { can } = useAuth();
  const canApprove = !!onApprove && savedStatus === "pending" && can("content.publish");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" className="hidden lg:inline-flex" asChild>
        <Link href={backHref}>
          <ArrowLeftIcon /> Back
        </Link>
      </Button>
      {/* Phones and tablets get these once, at the foot of the form
          (FormFooterActions) - not twice. */}
      {canApprove && onReject && (
        <RejectButton
          onReject={onReject}
          disabled={busy || disabled}
          className="hidden text-destructive hover:text-destructive lg:inline-flex"
        />
      )}
      {canApprove && (
        <Button
          variant="outline"
          className="hidden border-success/40 text-success hover:bg-success-soft hover:text-success lg:inline-flex"
          onClick={onApprove}
          disabled={busy || disabled}
          title="Save any changes and publish it on the website"
        >
          <CheckIcon /> Approve &amp; publish
        </Button>
      )}
      <Button className="hidden lg:inline-flex" onClick={onSave} disabled={busy || disabled}>
        {busy ? "Saving…" : saveLabel}
      </Button>
    </div>
  );
}

function RejectButton({
  onReject,
  disabled,
  className,
}: {
  onReject: () => unknown;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <ConfirmDialog
      title="Reject this submission?"
      description="It goes back to its writer as a draft, and nothing appears on the website. They can make changes and submit it for approval again. Any corrections you made here are kept."
      confirmLabel="Reject"
      onConfirm={async () => {
        await onReject();
      }}
      trigger={
        <Button
          variant="outline"
          className={className ?? "text-destructive hover:text-destructive"}
          disabled={disabled}
          title="Send it back to its writer as a draft"
        >
          <Undo2Icon /> Reject
        </Button>
      }
    />
  );
}

/**
 * Shown to an approver opening a submission, so it is plain why the Approve
 * button is there and what it does.
 */
export function AwaitingApprovalNotice() {
  const { can } = useAuth();
  if (!can("content.publish")) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground ring-1 ring-border">
      <ClockIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <p>
        <span className="font-medium">Waiting for your approval.</span> Read it through, make
        any corrections, then choose <span className="font-medium">Approve &amp; publish</span> to
        put it on the website, or <span className="font-medium">Reject</span> to send it back
        to its writer as a draft.
      </p>
    </div>
  );
}

/**
 * The same actions at the foot of the form on phones and tablets, where the
 * header is far away once the writer has scrolled to the end.
 */
export function FormFooterActions({
  backHref,
  savedStatus,
  onSave,
  onApprove,
  onReject,
  saveLabel,
  busy,
  disabled,
}: Parameters<typeof FormActions>[0]) {
  const { can } = useAuth();
  const canApprove = !!onApprove && savedStatus === "pending" && can("content.publish");
  return (
    <div className="-mx-6 grid grid-cols-2 gap-2 border-t border-border/70 px-6 pt-5 lg:hidden">
      <Button variant="outline" className="w-full" asChild>
        <Link href={backHref}>Cancel</Link>
      </Button>
      <Button className="w-full" onClick={onSave} disabled={busy || disabled}>
        {busy ? "Saving…" : saveLabel}
      </Button>
      {canApprove && onReject && (
        <RejectButton
          onReject={onReject}
          disabled={busy || disabled}
          className="w-full text-destructive hover:text-destructive"
        />
      )}
      {canApprove && (
        <Button
          variant="outline"
          className={onReject ? "w-full border-success/40 text-success" : "col-span-2 w-full border-success/40 text-success"}
          onClick={onApprove}
          disabled={busy || disabled}
        >
          <CheckIcon /> Approve
        </Button>
      )}
    </div>
  );
}

/**
 * Reject / Approve on phones and tablets for a page whose foot is not
 * FormFooterActions (the blog's step bar) - so an approver on a phone is
 * never left without them once the header buttons are hidden.
 */
export function MobileApprovalActions({
  savedStatus,
  onApprove,
  onReject,
  busy,
  disabled,
}: {
  savedStatus?: PublishStatus;
  onApprove: () => void;
  onReject: () => unknown;
  busy: boolean;
  disabled?: boolean;
}) {
  const { can } = useAuth();
  if (savedStatus !== "pending" || !can("content.publish")) return null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 lg:hidden">
      <RejectButton
        onReject={onReject}
        disabled={busy || disabled}
        className="w-full text-destructive hover:text-destructive"
      />
      <Button
        variant="outline"
        className="w-full border-success/40 text-success"
        onClick={onApprove}
        disabled={busy || disabled}
      >
        <CheckIcon /> Approve
      </Button>
    </div>
  );
}

/** When, in a friendly form: "23 Nov, 8:40 pm". */
function whenShort(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * The one notice an editing page needs about approval, whichever case applies:
 *
 * - an approver opening a live item with changes waiting (who, when, what to do);
 * - the writer of those changes coming back to them;
 * - a writer about to edit a live item, told their save will go for approval;
 * - an approver opening a new item submitted for approval.
 */
export function ApprovalNotice({
  status,
  revision,
  isEdit,
}: {
  status?: PublishStatus;
  revision?: ContentRevision | null;
  isEdit: boolean;
}) {
  const { can } = useAuth();
  const canPublish = can("content.publish");
  const live = status === "published" || status === "archived";

  let body: React.ReactNode = null;
  if (revision && canPublish) {
    body = (
      <>
        <span className="font-medium">
          {revision.submittedBy.name} submitted changes on {whenShort(revision.submittedAt)}.
        </span>{" "}
        They are shown below; the website still shows the current version. Make any
        corrections, then choose <span className="font-medium">Approve &amp; publish</span>, or{" "}
        <span className="font-medium">Reject</span> to discard them.
      </>
    );
  } else if (revision) {
    body = (
      <>
        <span className="font-medium">Your changes are waiting for approval.</span> Sent on{" "}
        {whenShort(revision.submittedAt)} and shown below. The website keeps the current version
        until an admin approves them; you can still update them.
      </>
    );
  } else if (isEdit && live && !canPublish) {
    body = (
      <>
        <span className="font-medium">This is on the website.</span> Your changes will be sent to
        an admin for approval; the website keeps the current version until they approve them.
      </>
    );
  } else if (status === "pending" && canPublish) {
    return <AwaitingApprovalNotice />;
  }
  if (!body) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground ring-1 ring-border">
      <ClockIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <p>{body}</p>
    </div>
  );
}

/**
 * Save-button wording under the approval rule: an approver saves; anyone else
 * creates drafts, and their changes to a live item are submitted.
 */
export function saveLabelFor({
  isEdit,
  holds,
  hasRevision,
  canPublish,
  createLabel,
  editLabel = "Save changes",
}: {
  isEdit: boolean;
  holds: boolean;
  hasRevision: boolean;
  canPublish: boolean;
  createLabel: string;
  editLabel?: string;
}) {
  if (!isEdit) return createLabel;
  if (!canPublish && hasRevision) return "Update submission";
  if (holds) return "Submit for approval";
  return editLabel;
}
