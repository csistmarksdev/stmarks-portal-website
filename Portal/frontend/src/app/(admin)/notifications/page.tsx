"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  NOTIFICATION_RETENTION_DAYS,
  type NotificationKind,
  type PortalNotification,
} from "@portal/shared";
import {
  BellIcon,
  CheckCheckIcon,
  CircleCheckIcon,
  CircleXIcon,
  PenLineIcon,
  SendIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { notificationKeys } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const KIND: Record<NotificationKind, { icon: React.ElementType; label: string; tone: string }> = {
  submitted: { icon: SendIcon, label: "Sent for approval", tone: "bg-secondary text-primary" },
  "changes-submitted": { icon: PenLineIcon, label: "Changes for approval", tone: "bg-secondary text-primary" },
  approved: { icon: CircleCheckIcon, label: "Approved", tone: "bg-success-soft text-success" },
  rejected: { icon: CircleXIcon, label: "Rejected", tone: "bg-destructive/10 text-destructive" },
};

/** "just now", "5 min ago", "3 h ago", "yesterday", "12 Nov". */
function ago(iso: string): string {
  const then = new Date(iso);
  const minutes = Math.round((Date.now() - then.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return "yesterday";
  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: notificationKeys.list,
    queryFn: () => api.get<PortalNotification[]>("/admin/notifications", { limit: 100 }),
    refetchInterval: 30_000,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.list });
    void queryClient.invalidateQueries({ queryKey: notificationKeys.unread });
  };

  const readAll = useMutation({
    mutationFn: () => api.post("/admin/notifications/read-all"),
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });

  /** Opening a notification marks it read and goes to what it is about. */
  const open = async (note: PortalNotification) => {
    if (!note.read) {
      try {
        await api.post(`/admin/notifications/${note.id}/read`);
        refresh();
      } catch {
        // Still go there; it will be marked next time.
      }
    }
    router.push(note.link);
  };

  const notes = data ?? [];
  const unread = notes.filter((note) => !note.read).length;
  const groups = [
    { label: "Today", items: notes.filter((note) => isToday(note.createdAt)) },
    { label: "Earlier", items: notes.filter((note) => !isToday(note.createdAt)) },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="max-w-6xl">
      <PageHeader
        eyebrow="Approvals"
        title="Notifications"
        description={`What has been sent for approval, approved or rejected. Notifications are cleared automatically after ${NOTIFICATION_RETENTION_DAYS} days.`}
        actions={
          unread > 0 ? (
            <Button variant="outline" onClick={() => readAll.mutate()} disabled={readAll.isPending}>
              <CheckCheckIcon /> Mark all as read
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong px-6 py-16 text-center">
          <BellIcon className="mx-auto mb-3 size-6 text-muted-foreground" />
          <p className="font-[family-name:var(--font-display)] text-base font-semibold">
            Nothing yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            You&apos;ll hear here when something is sent for approval, or when your work is
            approved or rejected.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label} className="space-y-2">
              <h2 className="label text-muted-foreground">{group.label}</h2>
              <Card className="divide-y divide-border/70 overflow-hidden">
                {group.items.map((note) => {
                  const kind = KIND[note.kind];
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => void open(note)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-hover-tint sm:px-5",
                        !note.read && "bg-secondary/40",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full",
                          kind.tone,
                        )}
                        aria-hidden
                      >
                        <kind.icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-sm leading-snug",
                            note.read ? "text-foreground/80" : "font-medium text-foreground",
                          )}
                        >
                          {note.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {kind.label} · {ago(note.createdAt)}
                        </span>
                      </span>
                      {!note.read && (
                        <span
                          className="mt-2 size-2.5 shrink-0 rounded-full bg-primary"
                          aria-label="Unread"
                        />
                      )}
                    </button>
                  );
                })}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
