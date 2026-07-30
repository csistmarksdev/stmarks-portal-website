"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  AuditLogEntry,
  DashboardStats,
  Paginated,
  WeeklyVerse,
} from "@portal/shared";
import {
  ArrowRightIcon,
  BellPlusIcon,
  BookOpenTextIcon,
  CalendarPlusIcon,
  CircleCheckIcon,
  InboxIcon,
  PenLineIcon,
  PinOffIcon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Working late";
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
    <div className="mx-auto max-w-5xl">
      {/* ------------------------------ Greeting ----------------------------- */}
      <div className="mb-6 sm:mb-8">
        <p className="label text-accent-fg">{TODAY}</p>
        <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting()}, {user?.name?.split(" ")[0] ?? "there"}.
        </h1>
        {stats && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The website is serving{" "}
            <Link href="/events" className="font-medium text-primary hover:underline">
              {stats.events.published} events
            </Link>
            {stats.events.upcoming > 0 && <> ({stats.events.upcoming} upcoming)</>},{" "}
            <Link href="/blog" className="font-medium text-primary hover:underline">
              {stats.blog.published} blog posts
            </Link>
            ,{" "}
            <Link href="/gallery" className="font-medium text-primary hover:underline">
              {stats.gallery.albums} albums
            </Link>{" "}
            with {stats.gallery.photos} photos, and{" "}
            <Link href="/downloads" className="font-medium text-primary hover:underline">
              {stats.downloads.total} downloads
            </Link>
            .
          </p>
        )}
      </div>

      {/*
       * One flex column on a phone, two columns from lg. `display: contents`
       * on the wrappers lets both groups' sections become items of the same
       * flex container on mobile, so `order-*` can interleave them — quick
       * actions belong near the top on a phone but in the rail on a desktop.
       */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-6">
        <div className="contents lg:flex lg:flex-col lg:gap-6">
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

          {/* -------------------------- Recent activity ------------------------ */}
          {can("audit.read") && (
            <section className="order-3">
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
                    {activity.items.map((entry) => (
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
          <section className="order-4">
            <h2 className="label mb-3 text-muted-foreground">Verse of the week</h2>
            {/*
             * Deep azure, the same treatment as the sign-in panel. The solid
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

          {/* Compact inventory — plain rows, not tiles. */}
          <section className="order-5">
            <h2 className="label mb-3 text-muted-foreground">On the website</h2>
            <Card>
              <CardContent className="p-2">
                {stats ? (
                  <dl className="text-sm">
                    {(
                      [
                        ["Events", stats.events.total, "/events"],
                        ["Blog posts", stats.blog.total, "/blog"],
                        ["Gallery albums", stats.gallery.albums, "/gallery"],
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
                    {Array.from({ length: 6 }).map((_, i) => (
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
