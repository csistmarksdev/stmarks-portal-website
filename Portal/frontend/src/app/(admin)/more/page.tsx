"use client";

import { ChevronRightIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { navSectionsFor } from "@/config/navigation";
import { useAuth } from "@/lib/auth";
import { useChatUnread } from "@/lib/chat";
import { useNotificationsUnread } from "@/lib/notifications";

/**
 * "More" - every section of the Portal, on a phone.
 *
 * The tab bar holds the four things people open the Portal for; this page is
 * the rest, reached from the bar's More tab. A page rather than a pop-up
 * sheet: it has room for every section without scrolling inside a panel, the
 * back gesture returns to it, and it reads like a phone's own settings list.
 *
 * Laid out as grouped lists - your account, each section of the sidebar, the
 * theme, and signing out. On a large screen the sidebar shows all of this, so
 * nothing links here there.
 */
export default function MorePage() {
  const { user, logout } = useAuth();
  const chatUnread = useChatUnread();
  const notificationsUnread = useNotificationsUnread();
  const badges: Record<string, number> = {
    "/messages": chatUnread,
    "/notifications": notificationsUnread,
  };

  return (
    <div className="mx-auto max-w-xl">
      {/* The same header as every other page. */}
      <PageHeader
        eyebrow="Everything"
        title="More"
        description="Every section of the Portal, your account, and the theme."
      />

      <div className="space-y-7">
        {user && (
          <Link
            href="/settings"
            className="flex items-center gap-3.5 rounded-3xl bg-card p-4 ring-1 ring-border/70 transition-colors active:bg-muted"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-500 text-base font-semibold text-white shadow-sm">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[15px] font-semibold text-foreground">
                {user.name}
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                {user.roleName} · Account settings
              </span>
            </span>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        )}

        {navSectionsFor(user?.permissions).map((section) => (
          <section key={section.label}>
            <h2 className="label px-4 pb-2 text-[11px] tracking-[0.16em] text-muted-foreground">
              {section.label}
            </h2>
            <ul className="divide-y divide-border/60 overflow-hidden rounded-3xl bg-card ring-1 ring-border/70">
              {section.items.map((item) => {
                const count = badges[item.href] ?? 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex min-h-[3.25rem] items-center gap-3.5 px-4 py-3 transition-colors active:bg-muted"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted text-primary">
                        <item.icon className="size-[18px]" />
                      </span>
                      <span className="flex-1 truncate text-[15px] text-foreground">
                        {item.label}
                      </span>
                      {count > 0 && (
                        <span
                          aria-label={`${count} unread`}
                          className="numeric grid h-6 min-w-6 place-items-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground"
                        >
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <section>
          <h2 className="label px-4 pb-2 text-[11px] tracking-[0.16em] text-muted-foreground">
            Appearance
          </h2>
          <ThemeToggle className="w-full" />
        </section>

        {user && (
          <button
            type="button"
            onClick={() => void logout()}
            className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-3xl bg-card text-[15px] font-medium text-destructive ring-1 ring-border/70 transition-colors active:bg-destructive/10"
          >
            <LogOutIcon className="size-4" /> Sign out
          </button>
        )}
      </div>
    </div>
  );
}
