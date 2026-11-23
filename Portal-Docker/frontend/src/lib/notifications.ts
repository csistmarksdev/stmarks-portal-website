"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const notificationKeys = {
  unread: ["notifications", "unread"] as const,
  list: ["notifications", "list"] as const,
};

/** Unread notifications — drives the menu badge. Polled while the tab is open. */
export function useNotificationsUnread(): number {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => api.get<{ total: number }>("/admin/notifications/unread"),
    enabled: !!user,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  return data?.total ?? 0;
}
