"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ContactMessage, Paginated } from "@portal/shared";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
  MailIcon,
  MailOpenIcon,
  PhoneIcon,
  ReplyIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounced } from "@/hooks/use-debounced";
import { useMediaQuery } from "@/hooks/use-media-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 20;

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The time column every mail client uses: a clock time for today, a date for
 * this year, a full date beyond it.
 *
 * The point is scanability, not completeness — the column is narrow and the
 * exact instant is a click away in the reading pane. A full `27 Jul 2026,
 * 9:49 pm` on every row is three times the width for information nobody reads
 * on the twentieth message down.
 */
function inboxTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** First letters of the first and last word — "JEROPHIN D R" → "JR". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * A stable colour per sender, so the same person is the same swatch every time.
 *
 * Hue only — saturation and lightness are fixed at a mid value that keeps white
 * text legible on it in either theme, which a random full-range colour would
 * not.
 */
function avatarHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full text-xs font-semibold text-white",
        className ?? "size-9",
      )}
      style={{ backgroundColor: `hsl(${avatarHue(name)} 42% 45%)` }}
    >
      {initials(name)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ContactMessagesPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /*
   * Below `xl` there is no room for two panes, so the same selection opens a
   * dialog instead. Which of the two appears is decided here rather than with
   * `xl:hidden` on the dialog: its overlay is portalled to the end of `<body>`,
   * so a CSS-hidden dialog still dims and blurs the whole page behind a panel
   * nobody can see. One selection, two presentations, only ever one mounted.
   */
  const wide = useMediaQuery("(min-width: 80rem)");

  const queryClient = useQueryClient();
  const { can } = useAuth();
  const debouncedSearch = useDebounced(search);

  const { data, isLoading } = useQuery({
    queryKey: ["contact-messages", unreadOnly, debouncedSearch, page],
    queryFn: () =>
      api.get<Paginated<ContactMessage>>("/admin/contact-messages", {
        unread: unreadOnly || undefined,
        search: debouncedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  /*
   * The unread badge, as its own one-item request rather than counted from the
   * page above — which would say "3 unread" while sitting on page two of a
   * filtered list, and be wrong on both counts.
   */
  const { data: unreadCount } = useQuery({
    queryKey: ["contact-messages", "unread-count"],
    queryFn: () =>
      api
        .get<Paginated<ContactMessage>>("/admin/contact-messages", {
          unread: true,
          pageSize: 1,
        })
        .then((result) => result.total),
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
      setSelectedId(null);
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const messages = data?.items ?? [];
  const selected = messages.find((message) => message.id === selectedId) ?? null;

  /*
   * A selection that is no longer on screen — the message was deleted, the
   * filter changed, the page turned — is dropped rather than left pointing at
   * nothing, which would strand the reading pane on its empty state with a row
   * still looking selected.
   */
  useEffect(() => {
    if (selectedId && !messages.some((message) => message.id === selectedId)) {
      setSelectedId(null);
    }
  }, [messages, selectedId]);

  function openMessage(message: ContactMessage) {
    setSelectedId(message.id);
    if (!message.read) setRead.mutate({ id: message.id, read: true });
  }

  const filtering = Boolean(search || unreadOnly);

  return (
    /*
     * From `xl`, the page stops being a document and becomes a mail client:
     * fixed to the viewport, with the list and the reading pane each scrolling
     * inside themselves. Reading a long message must not carry the list of
     * messages off the top of the screen, and vice versa.
     *
     * `100dvh - 4rem` is the viewport less `<main>`'s own `lg:py-8`, the one
     * measurement this needs. Everything below is flex, so the header and
     * toolbar take what they take and the panes absorb the rest — no guessing
     * at their heights, and nothing to keep in sync when the copy changes.
     */
    <div className="xl:flex xl:h-[calc(100dvh-4rem)] xl:flex-col">
      <PageHeader
        eyebrow="From the website"
        title="Contact inbox"
        description="What visitors write through the website's contact form lands here. Opening a message marks it read."
      />

      {/* ------------------------------- Toolbar ------------------------------ */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-muted p-0.5">
          <FilterTab
            active={!unreadOnly}
            onClick={() => {
              setUnreadOnly(false);
              setPage(1);
            }}
          >
            All
          </FilterTab>
          <FilterTab
            active={unreadOnly}
            onClick={() => {
              setUnreadOnly(true);
              setPage(1);
            }}
          >
            Unread
            {unreadCount !== undefined && unreadCount > 0 && (
              <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </FilterTab>
        </div>

        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sender, subject or message…"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* --------------------------- List + reading pane ---------------------- */}
      {/* `min-h-0` on every level — a flex or grid child defaults to a floor of
          its content height, which would push each pane to its natural size and
          hand the scrolling back to the page. */}
      <div className="grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="min-w-0 xl:flex xl:min-h-0 xl:flex-col">
          {isLoading ? (
            <Skeleton className="h-96 w-full rounded-3xl" />
          ) : messages.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border-strong py-16 text-center">
              <InboxIcon className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                {search
                  ? "No message matches that search."
                  : unreadOnly
                    ? "Nothing unread — every message has been seen."
                    : "No one has written in yet. Messages sent from the website's contact page will arrive here."}
              </p>
              {filtering && (
                <button
                  type="button"
                  className="mt-1 text-sm font-medium text-primary hover:underline"
                  onClick={() => {
                    setSearch("");
                    setUnreadOnly(false);
                    setPage(1);
                  }}
                >
                  Show every message
                </button>
              )}
            </div>
          ) : (
            <Card className="scrollbar-ghost overflow-hidden xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
              <ul className="divide-y divide-border/70">
                {messages.map((message) => (
                  <li key={message.id}>
                    <MessageRow
                      message={message}
                      selected={message.id === selectedId}
                      onOpen={() => openMessage(message)}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {data && data.total > PAGE_SIZE && (
            <div className="mt-3 flex items-center justify-between text-[13px] xl:shrink-0">
              <span className="text-muted-foreground">
                {data.total} message{data.total === 1 ? "" : "s"} — page {data.page} of{" "}
                {Math.ceil(data.total / PAGE_SIZE)}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  title="Previous page"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeftIcon />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  title="Next page"
                  disabled={!data.hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* The reading pane only exists where there is room for it; below xl
            the dialog at the foot of this file does the same job. */}
        <div className="hidden min-h-0 xl:block">
          {selected ? (
            <MessageView
              message={selected}
              canDelete={can("content.delete")}
              onMarkUnread={() => {
                setRead.mutate({ id: selected.id, read: false });
                setSelectedId(null);
              }}
              onDelete={async () => {
                await remove.mutateAsync(selected.id);
              }}
            />
          ) : (
            <Card className="grid h-full min-h-96 place-items-center p-8 text-center">
              <div>
                <MailOpenIcon className="mx-auto size-7 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Choose a message on the left to read it.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Dialog
        open={!wide && selected !== null}
        onOpenChange={(next) => {
          if (!next) setSelectedId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.subject}</DialogTitle>
            <DialogDescription>
              {selected?.name} · {formatDateTime(selected?.createdAt)}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                <a href={`mailto:${selected.email}`} className="hover:text-primary">
                  {selected.email}
                </a>
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="hover:text-primary">
                    {selected.phone}
                  </a>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm">{selected.message}</p>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={replyHref(selected)}>
                    <ReplyIcon /> Reply
                  </a>
                </Button>
                {can("content.delete") && (
                  <ConfirmDialog
                    title="Delete this message?"
                    description="The message is removed permanently."
                    onConfirm={() => remove.mutateAsync(selected.id)}
                    trigger={
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2Icon /> Delete
                      </Button>
                    }
                  />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                     */
/* -------------------------------------------------------------------------- */

/** `mailto:` with the subject already threaded, the way a reply should arrive. */
function replyHref(message: ContactMessage): string {
  const subject = /^re:/i.test(message.subject)
    ? message.subject
    : `Re: ${message.subject}`;
  return `mailto:${message.email}?subject=${encodeURIComponent(subject)}`;
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function MessageRow({
  message,
  selected,
  onOpen,
}: {
  message: ContactMessage;
  selected: boolean;
  onOpen: () => void;
}) {
  const unread = !message.read;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-hover-tint",
        selected && "bg-hover-tint",
      )}
    >
      <Avatar name={message.name} />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              unread ? "font-semibold text-foreground" : "text-foreground/90",
            )}
          >
            {message.name}
          </span>
          <span className="numeric shrink-0 text-[11px] text-muted-foreground">
            {inboxTime(message.createdAt)}
          </span>
        </span>

        <span
          className={cn(
            "mt-0.5 block truncate text-[13px]",
            unread ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {message.subject}
        </span>

        {/* The snippet, as every mail client shows it — enough of the body to
            tell two enquiries apart without opening either. */}
        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
          {message.message}
        </span>
      </span>

      {/* The unread marker sits last so the three text lines share one left
          edge; an indicator in the flow would indent read and unread rows
          differently and make the list look ragged. */}
      <span
        aria-label={unread ? "Unread" : undefined}
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          unread ? "bg-brand-600" : "bg-transparent",
        )}
      />
    </button>
  );
}

function MessageView({
  message,
  canDelete,
  onMarkUnread,
  onDelete,
}: {
  message: ContactMessage;
  canDelete: boolean;
  onMarkUnread: () => void;
  onDelete: () => Promise<void>;
}) {
  return (
    <Card className="flex h-full min-h-96 flex-col overflow-hidden">
      {/* Sender and actions stay put; only the message itself scrolls, so who
          wrote in and how to answer them never leave the screen. */}
      <div className="shrink-0 border-b border-border/70 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-foreground">
          {message.subject}
        </h2>

        <div className="mt-4 flex items-start gap-3">
          <Avatar name={message.name} className="size-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{message.name}</p>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
              <a
                href={`mailto:${message.email}`}
                className="inline-flex items-center gap-1.5 hover:text-primary"
              >
                <MailIcon className="size-3.5" />
                {message.email}
              </a>
              {message.phone && (
                <a
                  href={`tel:${message.phone}`}
                  className="inline-flex items-center gap-1.5 hover:text-primary"
                >
                  <PhoneIcon className="size-3.5" />
                  {message.phone}
                </a>
              )}
            </div>
          </div>
          <span className="numeric shrink-0 text-[13px] text-muted-foreground">
            {formatDateTime(message.createdAt)}
          </span>
        </div>
      </div>

      <div className="scrollbar-ghost min-h-0 flex-1 overflow-y-auto p-5">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.message}</p>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/70 px-3 py-2.5">
        <Button variant="outline" size="sm" asChild>
          {/*
           * A `mailto:` link, not a compose box. The Portal has no outbound
           * mail — no SMTP credentials, no sending domain — and a reply typed
           * here would have to go somewhere. Handing the address to whatever
           * the church already uses replies from their real account, with a
           * copy in their own sent folder.
           */}
          <a href={replyHref(message)}>
            <ReplyIcon /> Reply
          </a>
        </Button>

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={onMarkUnread} title="Mark unread">
            <MailIcon /> Mark unread
          </Button>
          {canDelete && (
            <ConfirmDialog
              title="Delete this message?"
              description="The message is removed permanently."
              onConfirm={onDelete}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  title="Delete"
                >
                  <Trash2Icon />
                </Button>
              }
            />
          )}
        </div>
      </div>
    </Card>
  );
}
