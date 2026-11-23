"use client";

import { ClockIcon, InfoIcon } from "lucide-react";
import type { ReactNode } from "react";

import { FormActions, FormFooterActions } from "@/components/admin/form-actions";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

/** Shared chrome for the church singleton editors. */
export function SingletonShell({
  title,
  description,
  loading,
  saving,
  onSave,
  pending,
  onReject,
  children,
}: {
  title: string;
  description?: string;
  loading: boolean;
  saving: boolean;
  onSave: () => void;
  /** A change waiting for approval, if any (see `useSingleton`). */
  pending?: { submittedBy: { name: string }; submittedAt: string } | null;
  onReject?: () => unknown;
  children: ReactNode;
}) {
  /*
   * Approval rule (church requests 22 & 23 Nov 2026): an admin's save goes
   * live at once; anyone else who can write content submits their change, and
   * the website keeps the current version until an admin approves or rejects
   * it. Roles that cannot write content do not reach these pages at all.
   */
  const { can } = useAuth();
  const canPublish = can("content.publish");
  const canWrite = can("content.write");
  // Same actions as every other editing page: Back, Reject / Approve when a
  // change is waiting, and Save — in the header, or at the foot on phones.
  const actionProps = {
    backHref: "/church",
    savedStatus: pending ? ("pending" as const) : undefined,
    onSave,
    // Approving is saving: the admin's save publishes what is in the form.
    onApprove: onSave,
    onReject,
    saveLabel: canPublish ? "Save changes" : pending ? "Update submission" : "Submit for approval",
    busy: saving,
    disabled: !canWrite,
  };
  const submittedOn = pending
    ? new Date(pending.submittedAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="max-w-6xl">
      <PageHeader
        eyebrow="Church content"
        title={title}
        description={description}
        actions={<FormActions {...actionProps} />}
      />
      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-6">
            {pending && canPublish ? (
              <div className="flex items-start gap-2.5 rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground ring-1 ring-border">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <p>
                  <span className="font-medium">
                    {pending.submittedBy.name} submitted a change on {submittedOn}.
                  </span>{" "}
                  It is shown below; the website still has the current version. Make any
                  corrections, then <span className="font-medium">Approve &amp; publish</span> — or{" "}
                  <span className="font-medium">Reject</span> to discard it.
                </p>
              </div>
            ) : pending ? (
              <div className="flex items-start gap-2.5 rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground ring-1 ring-border">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <p>
                  <span className="font-medium">Waiting for approval.</span> Your change from{" "}
                  {submittedOn} is shown below. The website keeps the current version until an
                  admin approves it; you can still update it.
                </p>
              </div>
            ) : !canPublish ? (
              <div className="flex items-start gap-2.5 rounded-2xl bg-accent-fg/10 px-4 py-3 text-sm text-accent-fg ring-1 ring-accent-fg/20">
                <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>
                  Your changes are sent to an admin for approval. The website keeps the
                  current version until they approve it.
                </p>
              </div>
            ) : null}
            {children}
            <FormFooterActions {...actionProps} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
