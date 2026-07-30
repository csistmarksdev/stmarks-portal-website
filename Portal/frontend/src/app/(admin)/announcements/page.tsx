"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Announcement, WithStatus } from "@portal/shared";
import { PinIcon, PinOffIcon } from "lucide-react";
import { toast } from "sonner";

import { ResourceListPage } from "@/components/admin/resource-list-page";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();

  const togglePin = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      api.patch(`/admin/announcements/${id}/pin`, { pinned }),
    onSuccess: (_data, variables) => {
      toast.success(variables.pinned ? "Pinned" : "Unpinned");
      void queryClient.invalidateQueries({ queryKey: ["/admin/announcements"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <ResourceListPage<WithStatus<Announcement>>
      title="Announcements"
      eyebrow="Notices"
      description="Parish notices, in the order the congregation sees them — the pinned one leads, then newest first. Only one can be pinned at a time."
      apiPath="/admin/announcements"
      routeBase="/announcements"
      label="Announcement"
      searchPlaceholder="Search notices…"
      emptyTitle="No notices posted"
      emptyHint="Share what the congregation should know — pin the most important one to keep it on top."
      columns={[
        {
          key: "title",
          header: "Title",
          render: (item) => (
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.title.en}</span>
              {item.pinned && <PinIcon className="size-3.5 text-primary" />}
            </div>
          ),
        },
        {
          key: "publishedAt",
          header: "Published",
          render: (item) => formatDate(item.publishedAt),
        },
      ]}
      extraRowActions={(item) =>
        can("content.publish") ? (
          <Button
            variant="ghost"
            size="icon"
            title={item.pinned ? "Unpin" : "Pin (unpins others)"}
            onClick={() => togglePin.mutate({ id: item.id, pinned: !item.pinned })}
          >
            {item.pinned ? <PinOffIcon /> : <PinIcon />}
          </Button>
        ) : null
      }
    />
  );
}
