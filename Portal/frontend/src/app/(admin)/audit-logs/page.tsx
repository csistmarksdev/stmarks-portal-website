"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuditLogEntry, Paginated } from "@portal/shared";
import { useState } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

const ACTIONS = [
  "login",
  "logout",
  "create",
  "update",
  "delete",
  "publish",
  "unpublish",
  "archive",
  "pin",
  "upload",
] as const;

const ACTION_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary" | "default"> = {
  create: "success",
  publish: "success",
  update: "secondary",
  pin: "secondary",
  upload: "secondary",
  unpublish: "warning",
  archive: "warning",
  delete: "destructive",
  login: "default",
  logout: "default",
};

/**
 * Retention windows offered when clearing. Expressed as "keep the recent past"
 * rather than "delete these rows": the useful operation is trimming years of
 * history, and targeted deletion is what an audit trail exists to prevent.
 */
const RETENTION = [
  { days: 365, label: "older than a year" },
  { days: 180, label: "older than 6 months" },
  { days: 90, label: "older than 90 days" },
  { days: 30, label: "older than 30 days" },
  { days: 0, label: "everything" },
] as const;

export default function AuditLogsPage() {
  const [action, setAction] = useState("");
  const [resource, setResource] = useState("");
  const [page, setPage] = useState(1);
  const [retention, setRetention] = useState(365);
  const queryClient = useQueryClient();
  const { can } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", action, resource, page],
    queryFn: () =>
      api.get<Paginated<AuditLogEntry>>("/admin/audit-logs", {
        action: action || undefined,
        resource: resource || undefined,
        page,
        pageSize: 25,
      }),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Record keeping"
        title="Audit logs"
        description="A running record of who did what — sign-ins, edits, publishes, uploads. Entries cannot be edited, and clearing them is itself recorded."
      />
      <div className="mb-4 flex gap-2">
        <Select className="min-w-0 flex-1 sm:w-40 sm:flex-none" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All actions</option>
          {ACTIONS.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </Select>
        <Select className="min-w-0 flex-1 sm:w-48 sm:flex-none" value={resource} onChange={(e) => { setResource(e.target.value); setPage(1); }}>
          <option value="">All resources</option>
          {["auth", "events", "blog", "gallery", "announcements", "downloads", "fellowships", "church", "media", "users", "contact"].map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </Select>

        {/* Only a super-admin holds `audit.delete`, so this is absent for
            everyone else rather than present and failing on click. */}
        {can("audit.delete") && (
          <div className="ml-auto flex gap-2">
            <Select
              className="w-44"
              value={String(retention)}
              onChange={(e) => setRetention(Number(e.target.value))}
              aria-label="How much history to clear"
            >
              {RETENTION.map(({ days, label }) => (
                <option key={days} value={days}>
                  Clear {label}
                </option>
              ))}
            </Select>
            <ConfirmDialog
              trigger={<Button variant="destructive">Clear</Button>}
              title="Clear audit history?"
              description={
                retention === 0
                  ? "This deletes the entire audit history — every sign-in, edit and publish ever recorded. It cannot be undone. The fact that you cleared it will itself be recorded."
                  : `This permanently deletes audit entries older than ${retention} days. It cannot be undone. The fact that you cleared them will itself be recorded.`
              }
              confirmLabel="Clear history"
              onConfirm={async () => {
                try {
                  const { deleted } = await api.delete<{ deleted: number }>(
                    `/admin/audit-logs?olderThanDays=${retention}`,
                  );
                  await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
                  setPage(1);
                  toast.success(
                    deleted === 0
                      ? "Nothing matched — no entries were that old"
                      : `Cleared ${deleted} entr${deleted === 1 ? "y" : "ies"}`,
                  );
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Could not clear the log",
                  );
                }
              }}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-3xl" />
      ) : data && data.items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong py-16 text-center text-sm text-muted-foreground">
          {action || resource
            ? "Nothing recorded under those filters."
            : "Nothing recorded yet — activity will appear as people work."}
        </div>
      ) : (
        <>
          <Card>
            <div className="divide-y divide-border/70">
              {data?.items.map((entry) => (
                <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5">
                  <Badge
                    variant={ACTION_VARIANT[entry.action] ?? "secondary"}
                    className="w-20 shrink-0 justify-center"
                  >
                    {entry.action}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{entry.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.userName ?? "System"} · {entry.resource}
                    </p>
                  </div>
                  <span className="numeric hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
          {data && data.total > data.pageSize && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {data.total} entries — page {data.page} of {Math.ceil(data.total / data.pageSize)}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={!data.hasMore} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
