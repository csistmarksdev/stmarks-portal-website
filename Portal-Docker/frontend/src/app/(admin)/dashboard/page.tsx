"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  AuditLogEntry,
  ChurchEvent,
  DashboardStats,
  Paginated,
  WeeklyVerse,
} from "@portal/shared";
import {
  ArrowRightIcon,
  BellPlusIcon,
  BookOpenTextIcon,
  CalendarIcon,
  CalendarPlusIcon,
  CircleCheckIcon,
  ImagesIcon,
  InboxIcon,
  NewspaperIcon,
  PenLineIcon,
  PinOffIcon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";

/**
 * Plain greeting, no commentary.
 *
 * The small hours used to get "Working late" — a remark about the reader
 * rather than a greeting, and one that lands as a nudge when someone is
 * finishing the notices at midnight. Before five is still the same evening to
 * anyone awake in it, so it reads as evening.
 */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const TODAY = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

function timeAgo(iso: string): string {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(
    new Date(iso),
  );
}

/**
 * Folds a run of identical consecutive summaries into one row with a count.
 *
 * Saving a blog post three times while editing writes three audit lines, and
 * the feed rendered them as three identical rows — half the visible history
 * spent saying the same thing once per keystroke-session. Only *consecutive*
 * matches collapse, so the feed stays a chronology rather than becoming a
 * tally: the same edit made again after lunch is genuinely a separate event.
 *
 * The newest entry of a run keeps its timestamp, which is the one that answers
 * "when was this last touched".
 */
function collapseRuns(
  entries: AuditLogEntry[],
): Array<AuditLogEntry & { repeats: number }> {
  const out: Array<AuditLogEntry & { repeats: number }> = [];
  for (const entry of entries) {
    const previous = out[out.length - 1];
    if (
      previous &&
      previous.summary === entry.summary &&
      previous.userId === entry.userId
    ) {
      previous.repeats += 1;
      continue;
    }
    out.push({ ...entry, repeats: 1 });
  }
  return out;
}

export default function DashboardPage() {
  const { user, can } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<DashboardStats>("/admin/dashboard/stats"),
  });

  const { data: activity } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: () =>
      api.get<Paginated<AuditLogEntry>>("/admin/audit-logs", { pageSize: 7 }),
    enabled: can("audit.read"),
  });

  const { data: verse } = useQuery({
    queryKey: ["church", "weekly-verse"],
    queryFn: () => api.get<WeeklyVerse>("/admin/church/weekly-verse"),
  });

  /*
   * The next few services and gatherings.
   *
   * Read from the *public* endpoint on purpose: `status=upcoming` — "not yet
   * over, soonest first" — only exists there, and it serves published records
   * only, which is exactly the question being asked. This card is "what the
   * congregation will see next", not "what is in the database".
   */
  const { data: upcoming } = useQuery({
    queryKey: ["dashboard-upcoming"],
    queryFn: () => api.get<ChurchEvent[]>("/events", { status: "upcoming", limit: 4 }),
  });

  const eventDrafts = stats ? stats.events.total - stats.events.published : 0;
  const blogDrafts = stats ? stats.blog.total - stats.blog.published : 0;

  const attention: Array<{ href: string; icon: React.ElementType; text: string }> = [];
  if (stats) {
    if (stats.contact.unread > 0) {
      attention.push({
        href: "/contact-messages",
        icon: InboxIcon,
        text:
          stats.contact.unread === 1
            ? "1 contact message is waiting for a reply"
            : `${stats.contact.unread} contact messages are waiting for a reply`,
      });
    }
    if (eventDrafts > 0) {
      attention.push({
        href: "/events",
        icon: PenLineIcon,
        text:
          eventDrafts === 1
            ? "1 event is written but not yet published"
            : `${eventDrafts} events are written but not yet published`,
      });
    }
    if (blogDrafts > 0) {
      attention.push({
        href: "/blog",
        icon: PenLineIcon,
        text:
          blogDrafts === 1
            ? "1 blog post is still a draft"
            : `${blogDrafts} blog posts are still drafts`,
      });
    }
    if (stats.announcements.pinned === 0 && stats.announcements.total > 0) {
      attention.push({
        href: "/announcements",
        icon: PinOffIcon,
        text: "No announcement is pinned — the website's notice band is empty",
      });
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* ------------------------------ Greeting ----------------------------- */}
      <div className="mb-5">
        <p className="label text-accent-fg">{TODAY}</p>
        <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting()}, {user?.name?.split(" ")[0] ?? "there"}.
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Here&apos;s what the congregation is seeing on the website today.
        </p>
      </div>

      {/*
       * ------------------------------- Figures ------------------------------
       *
       * This replaced a prose sentence ("the website is serving 9 blog
       * posts…") sitting above a plain list that said "Blog posts 10". Both
       * were right — one counted published records, the other every record —
       * and together they were a dashboard quietly contradicting itself.
       *
       * So every tile now reads the same way: the headline is what is *live on
       * the website*, and the line beneath it accounts for the difference. A
       * number and its caveat in the same place cannot drift apart.
       */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats ? (
          <>
            <StatTile
              href="/events"
              icon={CalendarIcon}
              value={stats.events.published}
              label={stats.events.published === 1 ? "event live" : "events live"}
              note={
                stats.events.upcoming > 0
                  ? `${stats.events.upcoming} still to come`
                  : "none still to come"
              }
              highlight={stats.events.upcoming > 0}
            />
            <StatTile
              href="/blog"
              icon={NewspaperIcon}
              value={stats.blog.published}
              label={stats.blog.published === 1 ? "post live" : "posts live"}
              note={blogDrafts > 0 ? `${blogDrafts} still in draft` : "nothing in draft"}
            />
            <StatTile
              href="/gallery"
              icon={ImagesIcon}
              value={stats.gallery.albums}
              label={stats.gallery.albums === 1 ? "album" : "albums"}
              note={`${stats.gallery.photos} photographs`}
            />
            <StatTile
              href="/contact-messages"
              icon={InboxIcon}
              value={stats.contact.unread}
              label="unread"
              note={`${stats.contact.total} received in total`}
              highlight={stats.contact.unread > 0}
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[5.75rem] rounded-3xl" />
          ))
        )}
      </div>

      {/*
       * One flex column on a phone, two columns from lg. `display: contents`
       * on the wrappers lets both groups' sections become items of the same
       * flex container on mobile, so `order-*` can interleave them — quick
       * actions belong near the top on a phone but in the rail on a desktop.
       */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-6">
        {/*
         * `lg:min-w-0` is load-bearing, not tidiness. A grid item defaults to
         * `min-width: auto`, which floors the `1fr` track at the item's
         * min-content width — and one `truncate`d line is `white-space: nowrap`,
         * so its min-content is the *whole* string however long it is. Without
         * this, a single long audit summary widens the column past the viewport,
         * pushes the 20rem rail off-screen and gives the whole page a horizontal
         * scrollbar. `min-width: 0` lets the track shrink below min-content,
         * which is what finally allows the truncation below to happen.
         */}
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          {/* -------------------------- Needs attention ------------------------ */}
          <section className="order-1">
            <h2 className="label mb-3 text-muted-foreground">Needs attention</h2>
            {!stats ? (
              <Skeleton className="h-24 w-full" />
            ) : attention.length === 0 ? (
              <Card>
                <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground sm:p-5">
                  <CircleCheckIcon className="size-4.5 shrink-0 text-success" />
                  All caught up — nothing is waiting on you today.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="divide-y divide-border/70 p-0">
                  {attention.map((item) => (
                    <Link
                      key={item.text}
                      href={item.href}
                      className="group flex items-center gap-3 px-4 py-3.5 text-sm transition-colors first:rounded-t-3xl last:rounded-b-3xl hover:bg-hover-tint sm:px-5"
                    >
                      <item.icon className="size-4 shrink-0 text-accent-fg" />
                      <span className="flex-1">{item.text}</span>
                      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </section>

          {/* ---------------------------- Coming up ---------------------------- */}
          <section className="order-3">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="label text-muted-foreground">Coming up</h2>
              <Link
                href="/events"
                className="text-xs font-medium text-primary hover:underline"
              >
                All events
              </Link>
            </div>
            {!upcoming ? (
              <Skeleton className="h-32 w-full rounded-3xl" />
            ) : upcoming.length === 0 ? (
              <Card>
                <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground sm:p-5">
                  <CalendarIcon className="size-4.5 shrink-0" />
                  <span>
                    Nothing on the calendar.{" "}
                    {can("content.write") && (
                      <Link href="/events/new" className="text-primary hover:underline">
                        Add the next service
                      </Link>
                    )}
                  </span>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="divide-y divide-border/70 p-0">
                  {upcoming.map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="group flex items-center gap-3.5 px-4 py-3 transition-colors first:rounded-t-3xl last:rounded-b-3xl hover:bg-hover-tint sm:px-5"
                    >
                      {/* A date block rather than a line of text — scanning
                          "when" down a column is the whole point of this card. */}
                      <DateBlock iso={event.startDate} />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {event.title.en}
                        </span>
                        {/*
                          Time first, venue second, and the venue is the half
                          that truncates — "6:00 pm" is short, fixed-width and
                          the thing being looked for, so it must never be the
                          part that gets cut.
                        */}
                        <span className="mt-0.5 flex items-baseline gap-1.5 text-[13px] text-muted-foreground">
                          <span className="numeric shrink-0">
                            {whenLabel(event.startDate)}
                          </span>
                          {event.location?.en && (
                            <>
                              <span aria-hidden className="shrink-0 opacity-50">
                                ·
                              </span>
                              <span className="truncate">{event.location.en}</span>
                            </>
                          )}
                        </span>
                      </span>

                      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </section>

          {/* -------------------------- Recent activity ------------------------ */}
          {can("audit.read") && (
            <section className="order-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="label text-muted-foreground">Recently in the portal</h2>
                <Link
                  href="/audit-logs"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Full log
                </Link>
              </div>
              {!activity ? (
                <Skeleton className="h-48 w-full" />
              ) : activity.items.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-sm text-muted-foreground sm:p-5">
                    Quiet so far — changes made in the portal will show up here.
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="divide-y divide-border/70 p-0">
                    {collapseRuns(activity.items).map((entry) => (
                      /* On a phone the summary gets the full width and the
                         timestamp drops beneath it — truncating to a ~30
                         character stub made the feed unreadable there. */
                      <div
                        key={entry.id}
                        className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-3 sm:px-5"
                      >
                        <span className="numeric order-2 shrink-0 text-[11px] text-muted-foreground sm:order-1 sm:w-14 sm:text-right">
                          {timeAgo(entry.createdAt)}
                        </span>
                        <p className="order-1 min-w-0 flex-1 text-sm sm:order-2 sm:truncate">
                          {entry.summary}
                          {entry.repeats > 1 && (
                            <span className="numeric ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                              ×{entry.repeats}
                            </span>
                          )}
                          {entry.userName && (
                            <span className="text-muted-foreground"> — {entry.userName}</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </section>
          )}
        </div>

        {/* ------------------------------ Rail -------------------------------- */}
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          {/* Verse of the week — same dark treatment as the Website section. */}
          <section className="order-5">
            <h2 className="label mb-3 text-muted-foreground">Verse of the week</h2>
            {/*
             * Deep magenta, the same treatment as the sign-in panel. The solid
             * `bg-` and the gradient are both set deliberately: the gradient
             * paints over the colour, so if either fails to resolve the card
             * is still dark and the white text stays legible.
             */}
            <div className="relative overflow-hidden rounded-3xl bg-brand-950 bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 p-5 text-white ring-1 ring-white/10 [box-shadow:var(--shadow-card)] sm:p-6">
              {verse ? (
                <blockquote className="relative">
                  <p className="font-[family-name:var(--font-display)] text-[15px] font-medium leading-relaxed text-white">
                    “{verse.text.en}”
                  </p>
                  <footer className="label mt-3 text-accent-300">
                    {verse.reference.en}
                  </footer>
                </blockquote>
              ) : (
                <div className="relative space-y-2">
                  <Skeleton className="h-4 w-full bg-white/10" />
                  <Skeleton className="h-4 w-3/4 bg-white/10" />
                </div>
              )}
              {can("content.write") && (
                <Link
                  href="/church/weekly-verse"
                  className="relative mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white/70 transition-colors hover:text-white"
                >
                  <BookOpenTextIcon className="size-3.5" /> Change the verse
                </Link>
              )}
            </div>
          </section>

          {/* Quick actions — second on a phone, since creating is why you
              reach for the portal on the move. */}
          {can("content.write") && (
            <section className="order-2">
              <h2 className="label mb-3 text-muted-foreground">Start something</h2>
              {/* A 2×2 grid gives full-width tap targets on a phone. */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                  <Link href="/events/new">
                    <CalendarPlusIcon /> New event
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                  <Link href="/announcements/new">
                    <BellPlusIcon /> Announcement
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                  <Link href="/blog/new">
                    <PenLineIcon /> Blog post
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                  <Link href="/media">
                    <UploadIcon /> Upload media
                  </Link>
                </Button>
              </div>
            </section>
          )}

          {/*
            The rest of the library, as plain rows.

            Only what the tiles above do not already carry — repeating events
            and blog here is what produced the two-numbers-for-one-thing problem
            in the first place. These are totals, and labelled as such.
          */}
          <section className="order-6">
            <h2 className="label mb-3 text-muted-foreground">Also in the library</h2>
            <Card>
              <CardContent className="p-2">
                {stats ? (
                  <dl className="text-sm">
                    {(
                      [
                        ["Announcements", stats.announcements.total, "/announcements"],
                        ["Downloads", stats.downloads.total, "/downloads"],
                        ["Fellowships", stats.fellowships.total, "/fellowships"],
                        ["Media files", stats.media.total, "/media"],
                      ] as const
                    ).map(([label, value, href]) => (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-hover-tint sm:py-2"
                      >
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="numeric font-medium">{value}</dd>
                      </Link>
                    ))}
                  </dl>
                ) : (
                  <div className="space-y-2 p-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One figure, its label, and the line that stops it being misread.
 *
 * `note` is not decoration. The headline is always "live on the website", so
 * without the second line a reader has no way to tell 9 published posts from
 * 10 written ones — which is exactly how the old dashboard managed to print
 * both numbers and look correct doing it.
 */
function StatTile({
  href,
  icon: Icon,
  value,
  label,
  note,
  highlight = false,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  value: number;
  label: string;
  note: string;
  /** Draws the eye when the number is something to act on, not just to know. */
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl bg-gradient-to-b from-card to-card-wash p-4 ring-1 ring-border/70 transition-card [box-shadow:var(--shadow-card)] hover:-translate-y-0.5 hover:ring-border-strong hover:[box-shadow:var(--shadow-card-hover)]"
    >
      <div className="flex items-center justify-between">
        <Icon
          className={cn(
            "size-4",
            highlight ? "text-accent-fg" : "text-muted-foreground",
          )}
        />
        <ArrowRightIcon className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="numeric mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold leading-none tracking-tight">
        {value}
      </p>
      <p className="mt-1 truncate text-[13px] font-medium text-foreground">{label}</p>
      <p
        className={cn(
          "truncate text-[11px]",
          highlight ? "text-accent-fg" : "text-muted-foreground",
        )}
      >
        {note}
      </p>
    </Link>
  );
}

/** Whole days from today — negative is past, 0 today, 1 tomorrow. */
function daysAway(iso: string): number {
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const then = midnight(new Date(iso)).getTime();
  const now = midnight(new Date()).getTime();
  return Math.round((then - now) / 86_400_000);
}

/**
 * When the event is, as someone would say it out loud.
 *
 * The clock time is the part that was missing and the part that matters — a
 * dashboard row saying only "9 Aug" does not tell anyone whether they are late
 * for it. "Today" and "Tomorrow" replace the date entirely rather than joining
 * it, because the block on the left already carries the date.
 */
function whenLabel(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const days = daysAway(iso);
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Tomorrow, ${time}`;
  if (days > 1 && days < 7) {
    return `${date.toLocaleDateString("en-IN", { weekday: "long" })}, ${time}`;
  }
  return time;
}

/**
 * Day-over-month block, the way a wall calendar reads.
 *
 * Semantic tokens, not `brand-50`/`brand-800`. Those are raw palette steps and
 * do not change between themes, so the block came out as a bright pink chip
 * sitting on a near-black card in dark mode — the one element on the page not
 * following the theme. `secondary` is defined per theme and is what the badges
 * elsewhere already use.
 */
function DateBlock({ iso }: { iso: string }) {
  const date = new Date(iso);
  const today = daysAway(iso) === 0;

  return (
    <span
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-xl leading-none ring-1",
        today
          ? // Today earns the flame — it is the only row anyone needs to act on.
            "bg-accent-fg/12 text-accent-fg ring-accent-fg/30"
          : "bg-secondary text-secondary-foreground ring-border/70",
      )}
      title={formatDate(iso)}
    >
      <span className="numeric text-base font-semibold">{date.getDate()}</span>
      <span className="label mt-0.5 text-[9px] tracking-[0.08em] opacity-75">
        {date.toLocaleDateString("en-IN", { month: "short" })}
      </span>
    </span>
  );
}
