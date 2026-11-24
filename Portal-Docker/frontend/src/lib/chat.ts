"use client";

import { useQuery } from "@tanstack/react-query";
import type { ChatUnreadSummary } from "@portal/shared";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/*
 * Messages arrive by polling rather than a live socket: a request every few
 * seconds works through every proxy and on every phone, needs nothing new on
 * the server, and at this congregation's scale the cost is negligible. The
 * intervals are short where someone is actively reading and long elsewhere.
 */
export const CHAT_POLL = {
  /** The open conversation. */
  thread: 3_000,
  /** The conversation list on the Messages page. */
  list: 5_000,
  /** The unread badge everywhere else. */
  badge: 15_000,
} as const;

export const chatKeys = {
  unread: ["chat", "unread"] as const,
  list: ["chat", "conversations"] as const,
  contacts: ["chat", "contacts"] as const,
  conversation: (id: string) => ["chat", "conversation", id] as const,
  messages: (id: string) => ["chat", "messages", id] as const,
};

/** Unread messages for the signed-in user - drives the menu badge. */
export function useChatUnread(): number {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: chatKeys.unread,
    queryFn: () => api.get<ChatUnreadSummary>("/admin/chat/unread"),
    enabled: !!user,
    refetchInterval: CHAT_POLL.badge,
    // A badge that only updates when the tab is focused is still correct the
    // moment someone looks; no need to poll a hidden tab.
    refetchIntervalInBackground: false,
  });
  return data?.total ?? 0;
}
