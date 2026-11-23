"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CHAT_MESSAGE_MAX,
  CHAT_RETENTION_DAYS,
  type ChatContact,
  type ChatConversation,
  type ChatMessage,
} from "@portal/shared";
import {
  ArrowLeftIcon,
  MessageCirclePlusIcon,
  MessagesSquareIcon,
  SearchIcon,
  SendHorizontalIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CHAT_POLL, chatKeys } from "@/lib/chat";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

function Avatar({ name, className }: { name?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full bg-accent-500 text-sm font-semibold text-white",
        !name && "bg-muted-foreground",
        className,
      )}
    >
      {(name ?? "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** "10:42 am" today, "Mon" this week, "12 Nov" before that. */
function shortStamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (sameDay(date, now)) {
    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (now.getTime() - date.getTime() < 6 * 86_400_000) {
    return date.toLocaleDateString("en-IN", { weekday: "short" });
  }
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (sameDay(date, now)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

/* -------------------------------------------------------------------------- */
/* New conversation                                                           */
/* -------------------------------------------------------------------------- */

function NewMessageDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (contact: ChatContact) => void;
}) {
  const [search, setSearch] = useState("");
  const { data: contacts, isLoading } = useQuery({
    queryKey: chatKeys.contacts,
    queryFn: () => api.get<ChatContact[]>("/admin/chat/contacts"),
    enabled: open,
  });
  const shown = (contacts ?? []).filter((contact) =>
    `${contact.name} ${contact.roleName}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setSearch("");
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>Choose who to write to.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            className="pl-10"
            placeholder="Search by name or role…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="-mx-2 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 px-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 rounded-2xl" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              {contacts?.length
                ? "No one matches that search."
                : "There are no other accounts yet."}
            </p>
          ) : (
            shown.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => onPick(contact)}
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <Avatar name={contact.name} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {contact.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {contact.roleName}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Conversation list                                                          */
/* -------------------------------------------------------------------------- */

function ConversationList({
  selectedId,
  onSelect,
  onNew,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: chatKeys.list,
    queryFn: () => api.get<ChatConversation[]>("/admin/chat/conversations"),
    refetchInterval: CHAT_POLL.list,
  });
  const shown = (data ?? []).filter((conversation) =>
    (conversation.with?.name ?? "Deleted account")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border/70 p-3">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            placeholder="Search conversations"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button
          size="icon"
          className="size-9 shrink-0"
          onClick={onNew}
          title="New message"
        >
          <MessageCirclePlusIcon />
        </Button>
      </div>

      <div className="scrollbar-ghost min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="px-4 py-12 text-center">
            <MessagesSquareIcon className="mx-auto mb-3 size-6 text-muted-foreground" />
            <p className="text-sm font-medium">No conversations yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Message anyone with a Portal account.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={onNew}
            >
              <MessageCirclePlusIcon /> New message
            </Button>
          </div>
        ) : shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No conversation matches that search.
          </p>
        ) : (
          shown.map((conversation) => {
            const active = conversation.id === selectedId;
            const fromMe = conversation.lastMessage?.senderId === user?.id;
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelect(conversation.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors",
                  active ? "bg-secondary ring-1 ring-border" : "hover:bg-muted",
                )}
              >
                <Avatar name={conversation.with?.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        conversation.unread > 0
                          ? "font-semibold"
                          : "font-medium",
                      )}
                    >
                      {conversation.with?.name ?? "Deleted account"}
                    </span>
                    {conversation.lastMessage && (
                      <span className="numeric shrink-0 text-[11px] text-muted-foreground">
                        {shortStamp(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-[13px]",
                        conversation.unread > 0
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {fromMe && "You: "}
                      {conversation.lastMessage?.body}
                    </span>
                    {conversation.unread > 0 && (
                      <span className="numeric grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                        {conversation.unread}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Thread                                                                     */
/* -------------------------------------------------------------------------- */

const PAGE = 50;

function Thread({
  conversationId,
  onBack,
}: {
  conversationId: string;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasEarlier, setHasEarlier] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);

  const { data: conversation } = useQuery({
    queryKey: chatKeys.conversation(conversationId),
    queryFn: () =>
      api.get<ChatConversation>(`/admin/chat/conversations/${conversationId}`),
    // Polled for "Seen": it carries when the other person last read.
    refetchInterval: CHAT_POLL.thread * 2,
  });

  const refreshLists = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: chatKeys.unread });
    void queryClient.invalidateQueries({ queryKey: chatKeys.list });
  }, [queryClient]);

  const markRead = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      await api.post(`/admin/chat/conversations/${conversationId}/read`);
      refreshLists();
    } catch {
      // Best effort — the next poll tries again.
    }
  }, [conversationId, refreshLists]);

  const scrollToBottom = (smooth = false) => {
    const element = scroller.current;
    if (element)
      element.scrollTo({
        top: element.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
  };

  /** Appends without duplicates — a poll and a send can return the same message. */
  const append = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((current) => {
      const seen = new Set(current.map((message) => message.id));
      const fresh = incoming.filter((message) => !seen.has(message.id));
      return fresh.length ? [...current, ...fresh] : current;
    });
  }, []);

  // First load of the conversation.
  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setLoaded(false);
    setDraft("");
    stickToBottom.current = true;
    api
      .get<ChatMessage[]>(
        `/admin/chat/conversations/${conversationId}/messages`,
        { limit: PAGE },
      )
      .then((page) => {
        if (cancelled) return;
        setMessages(page);
        setHasEarlier(page.length === PAGE);
        setLoaded(true);
        void markRead();
      })
      .catch((error: Error) => {
        if (!cancelled) toast.error(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, markRead]);

  // Poll for new messages after the newest one held.
  const newest = messages[messages.length - 1]?.createdAt;
  useEffect(() => {
    if (!loaded) return;
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const fresh = await api.get<ChatMessage[]>(
          `/admin/chat/conversations/${conversationId}/messages`,
          newest ? { after: newest, limit: 100 } : { limit: PAGE },
        );
        if (fresh.length > 0) {
          append(fresh);
          if (fresh.some((message) => message.senderId !== user?.id))
            void markRead();
        }
      } catch {
        // A missed poll is retried on the next tick.
      }
    }, CHAT_POLL.thread);
    return () => window.clearInterval(timer);
  }, [loaded, newest, conversationId, append, markRead, user?.id]);

  // Follow new messages down — unless the reader has scrolled up to look back.
  useEffect(() => {
    if (stickToBottom.current) scrollToBottom(loaded);
  }, [messages, loaded]);

  const loadEarlier = async () => {
    const oldest = messages[0]?.createdAt;
    if (!oldest) return;
    setLoadingEarlier(true);
    const element = scroller.current;
    const before = element ? element.scrollHeight - element.scrollTop : 0;
    try {
      const page = await api.get<ChatMessage[]>(
        `/admin/chat/conversations/${conversationId}/messages`,
        { before: oldest, limit: PAGE },
      );
      stickToBottom.current = false;
      setMessages((current) => [...page, ...current]);
      setHasEarlier(page.length === PAGE);
      // Keep the reader's place rather than jumping.
      requestAnimationFrame(() => {
        if (element) element.scrollTop = element.scrollHeight - before;
      });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoadingEarlier(false);
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const message = await api.post<ChatMessage>(
        `/admin/chat/conversations/${conversationId}/messages`,
        { body },
      );
      stickToBottom.current = true;
      append([message]);
      setDraft("");
      refreshLists();
      composer.current?.focus();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSending(false);
    }
  };

  // The composer grows with its text, up to a few lines.
  useEffect(() => {
    const element = composer.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [draft]);

  const other = conversation?.with ?? null;
  const gone = conversation !== undefined && other === null;
  const lastMine = [...messages]
    .reverse()
    .find((message) => message.senderId === user?.id);
  const seen =
    lastMine &&
    conversation?.theirLastReadAt &&
    new Date(conversation.theirLastReadAt) >= new Date(lastMine.createdAt) &&
    messages[messages.length - 1]?.id === lastMine.id;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/70 px-3 py-2.5 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onBack}
          aria-label="All conversations"
        >
          <ArrowLeftIcon />
        </Button>
        <Avatar name={other?.name} className="size-9" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">
            {conversation ? (other?.name ?? "Deleted account") : " "}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {other?.roleName ?? ""}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scroller}
        onScroll={(event) => {
          const element = event.currentTarget;
          stickToBottom.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            80;
        }}
        className="scrollbar-ghost min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5"
      >
        {!loaded ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
            <Skeleton className="h-10 w-3/5 rounded-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <Avatar
                name={other?.name}
                className="mx-auto mb-3 size-14 text-lg"
              />
              <p className="text-sm font-medium">
                {other?.name ?? "Deleted account"}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {gone
                  ? "This account no longer exists."
                  : "Say hello — this is the start of your conversation."}
              </p>
            </div>
          </div>
        ) : (
          <>
            {hasEarlier && (
              <div className="mb-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadEarlier()}
                  disabled={loadingEarlier}
                >
                  {loadingEarlier ? "Loading…" : "Load earlier messages"}
                </Button>
              </div>
            )}
            <ol className="space-y-1">
              {messages.map((message, index) => {
                const mine = message.senderId === user?.id;
                const previous = messages[index - 1];
                const newDay =
                  !previous ||
                  !sameDay(
                    new Date(previous.createdAt),
                    new Date(message.createdAt),
                  );
                // Consecutive messages from one person sit closer together.
                const grouped =
                  !newDay &&
                  previous?.senderId === message.senderId &&
                  new Date(message.createdAt).getTime() -
                    new Date(previous.createdAt).getTime() <
                    5 * 60_000;
                return (
                  <li key={message.id}>
                    {newDay && (
                      <p className="my-4 text-center">
                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                          {dayLabel(message.createdAt)}
                        </span>
                      </p>
                    )}
                    <div
                      className={cn(
                        "flex",
                        mine ? "justify-end" : "justify-start",
                        !grouped && "mt-3",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-3xl px-4 py-2 text-[14px] leading-relaxed sm:max-w-[70%]",
                          mine
                            ? "rounded-br-lg bg-primary text-primary-foreground"
                            : "rounded-bl-lg bg-muted text-foreground",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {message.body}
                        </p>
                        <p
                          className={cn(
                            "numeric mt-0.5 text-right text-[10px]",
                            mine
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground",
                          )}
                        >
                          {timeOf(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            {seen && (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">
                Seen
              </p>
            )}
          </>
        )}
      </div>

      {/* Composer */}
      <form
        className="border-t border-border/70 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        {gone ? (
          <p className="py-2 text-center text-[13px] text-muted-foreground">
            You can&apos;t reply — this account has been removed.
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={composer}
              rows={1}
              value={draft}
              maxLength={CHAT_MESSAGE_MAX}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends; Shift+Enter starts a new line. Not mid-way
                // through composing a Tamil character with an input method.
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder={other ? `Message ${other.name}` : "Write a message"}
              aria-label="Message"
              className="min-h-10 flex-1 resize-none rounded-2xl border border-input bg-card px-4 py-2.5 text-sm leading-5 shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="submit"
              size="icon"
              className="size-10 shrink-0 rounded-full"
              disabled={!draft.trim() || sending}
              aria-label="Send"
            >
              <SendHorizontalIcon />
            </Button>
          </div>
        )}
        <p className="mt-1.5 hidden text-[11px] text-muted-foreground sm:block">
          Enter to send · Shift+Enter for a new line · Messages are deleted
          after {CHAT_RETENTION_DAYS} days
        </p>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

function MessagesView() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("c");
  const [picking, setPicking] = useState(false);
  const queryClient = useQueryClient();

  const select = useCallback(
    (id: string | null) =>
      router.replace(id ? `/messages?c=${id}` : "/messages", { scroll: false }),
    [router],
  );

  const start = async (contact: ChatContact) => {
    try {
      const conversation = await api.post<ChatConversation>(
        "/admin/chat/conversations",
        {
          userId: contact.id,
        },
      );
      setPicking(false);
      void queryClient.invalidateQueries({ queryKey: chatKeys.list });
      select(conversation.id);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  /*
   * The panes fill the screen so the message box is always visible.
   * Desktop: the viewport less the page header and the layout's padding.
   * Phone, conversation open: the header is hidden (the thread's own header
   * names the person and has a back arrow), leaving the viewport less the app
   * bar (3.5rem), the top padding (1.5rem) and the room kept for the floating
   * dock (5.25rem) — otherwise the dock covered the message box.
   */
  const paneHeight = useMemo(
    () =>
      selected
        ? "h-[calc(100dvh-10.25rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] lg:h-[calc(100dvh-12rem)]"
        : "h-[calc(100dvh-20rem)] min-h-[24rem] lg:h-[calc(100dvh-12rem)]",
    [selected],
  );

  return (
    <div className="max-w-6xl">
      <div className={selected ? "hidden lg:block" : undefined}>
        <PageHeader
          eyebrow="Between accounts"
          title="Messages"
          description={`Private conversations with anyone who has a Portal account. Only the two of you can read them, and messages are deleted automatically after ${CHAT_RETENTION_DAYS} days.`}
          actions={
            <Button
              className="hidden lg:inline-flex"
              onClick={() => setPicking(true)}
            >
              <MessageCirclePlusIcon /> New message
            </Button>
          }
        />
      </div>

      <div
        className={cn(
          "grid overflow-hidden rounded-3xl bg-card ring-1 ring-border/70 [box-shadow:var(--shadow-card)] lg:grid-cols-[20rem_minmax(0,1fr)]",
          paneHeight,
        )}
      >
        {/* On a phone the list and the thread take turns. */}
        <div
          className={cn(
            "min-h-0 border-border/70 lg:border-r",
            selected ? "hidden lg:block" : "block",
          )}
        >
          <ConversationList
            selectedId={selected}
            onSelect={select}
            onNew={() => setPicking(true)}
          />
        </div>
        <div className={cn("min-h-0", selected ? "block" : "hidden lg:block")}>
          {selected ? (
            <Thread
              key={selected}
              conversationId={selected}
              onBack={() => select(null)}
            />
          ) : (
            <div className="grid h-full place-items-center p-8 text-center">
              <div>
                <MessagesSquareIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p className="font-[family-name:var(--font-display)] text-lg font-semibold">
                  Choose a conversation
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Or start a new one with anyone on the Portal.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setPicking(true)}
                >
                  <MessageCirclePlusIcon /> New message
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewMessageDialog
        open={picking}
        onOpenChange={setPicking}
        onPick={(contact) => void start(contact)}
      />
    </div>
  );
}

export default function MessagesPage() {
  // `useSearchParams` needs a Suspense boundary for the production build.
  return (
    <Suspense fallback={<Skeleton className="h-[28rem] w-full rounded-3xl" />}>
      <MessagesView />
    </Suspense>
  );
}
