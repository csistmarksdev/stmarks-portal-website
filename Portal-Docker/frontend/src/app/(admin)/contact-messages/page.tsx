"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ContactMessage, Paginated } from "@portal/shared";
import { MailOpenIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export default function ContactMessagesPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<ContactMessage | null>(null);
  const queryClient = useQueryClient();
  const { can } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["contact-messages", unreadOnly, page],
    queryFn: () =>
      api.get<Paginated<ContactMessage>>("/admin/contact-messages", {
        unread: unreadOnly || undefined,
        page,
        pageSize: 20,
      }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["contact-messages"] });

  const setRead = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      api.patch(`/admin/contact-messages/${id}/read`, { read }),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/contact-messages/${id}`),
    onSuccess: () => {
      toast.success("Message deleted");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const open = (message: ContactMessage) => {
    setViewing(message);
    if (!message.read) setRead.mutate({ id: message.id, read: true });
  };

  return (
    <div>
      <PageHeader
        eyebrow="From the website"
        title="Contact inbox"
        description="What visitors write through the website's contact form lands here. Opening a message marks it read."
      />
      <div className="mb-4">
        <Select
          className="w-44"
          value={unreadOnly ? "unread" : "all"}
          onChange={(event) => {
            setUnreadOnly(event.target.value === "unread");
            setPage(1);
          }}
        >
          <option value="all">All messages</option>
          <option value="unread">Unread only</option>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-3xl" />
      ) : data && data.items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong py-16 text-center text-sm text-muted-foreground">
          {unreadOnly
            ? "Nothing unread — every message has been seen."
            : "No one has written in yet. Messages sent from the website's contact page will arrive here."}
        </div>
      ) : (
        <Card>
          <div className="divide-y divide-border/70">
            {data?.items.map((message) => (
              <div
                key={message.id}
                className="group flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors first:rounded-t-3xl last:rounded-b-3xl hover:bg-hover-tint sm:items-center sm:gap-4 sm:px-5 sm:py-4"
                onClick={() => open(message)}
              >
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full sm:mt-0 ${
                    message.read ? "bg-transparent" : "bg-brand-600"
                  }`}
                  title={message.read ? "Read" : "Unread"}
                />
                {/* Sender and subject stack on a phone, sit side by side above sm. */}
                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
                  <div className="min-w-0 sm:w-44 sm:shrink-0">
                    <p className={`truncate text-sm ${message.read ? "" : "font-semibold"}`}>
                      {message.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {message.email}
                    </p>
                  </div>
                  <div className="mt-1 min-w-0 sm:mt-0 sm:flex-1">
                    <p className={`truncate text-sm ${message.read ? "" : "font-semibold"}`}>
                      {message.subject}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {message.message}
                    </p>
                  </div>
                </div>
                <span className="numeric hidden shrink-0 text-xs text-muted-foreground lg:block">
                  {formatDateTime(message.createdAt)}
                </span>
                <div
                  className="flex shrink-0 items-center gap-0.5 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="ghost" size="icon" title="Open" onClick={() => open(message)}>
                    <MailOpenIcon />
                  </Button>
                  {can("content.delete") && (
                    <ConfirmDialog
                      title="Delete this message?"
                      description="The message is removed permanently."
                      onConfirm={() => remove.mutateAsync(message.id)}
                      trigger={
                        <Button variant="ghost" size="icon" className="text-destructive" title="Delete">
                          <Trash2Icon />
                        </Button>
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {data && data.total > data.pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {data.total} messages — page {data.page} of {Math.ceil(data.total / data.pageSize)}
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

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewing?.subject}</DialogTitle>
            <DialogDescription>
              From {viewing?.name} · {viewing?.email}
              {viewing?.phone ? ` · ${viewing.phone}` : ""} ·{" "}
              {viewing ? formatDateTime(viewing.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-sm">{viewing?.message}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
