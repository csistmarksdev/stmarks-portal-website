"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  MOBILE_TABS,
  isActive,
} from "@/config/navigation";
import { useChatUnread } from "@/lib/chat";
import { useNotificationsUnread } from "@/lib/notifications";
import { cn } from "@/lib/utils";

/**
 * Mobile navigation, built on native app conventions: a floating tab bar at
 * the bottom for the five things people open the portal to do, and
 * everything else on the More page (`/more`). No app bar up top - each page's own
 * header names it, and the screen height is better spent on the page.
 *
 * Hidden from `lg` up, where the floating sidebar takes over.
 */
export function MobileNav() {
  const pathname = usePathname();
  const chatUnread = useChatUnread();
  const notificationsUnread = useNotificationsUnread();
  // Unread counts shown on the dock: Messages has its own tab; notifications
  // live behind More.
  const tabBadges: Record<string, number> = { "/messages": chatUnread };

  const onPrimaryTab = MOBILE_TABS.some((tab) => isActive(pathname, tab.href));
  const onMore = isActive(pathname, "/more");

  return (
    <>
      {/*
       * Floating dock, Apple-style: a centred pill that hugs its icons rather
       * than spanning the screen. `pointer-events-none` on the full-width
       * wrapper keeps the empty space either side of the pill clickable.
       */}
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <div className="mb-dock-gap dock-glass pointer-events-auto mx-auto w-fit rounded-full px-1.5 ring-1 ring-border/70">
          <ul className="flex h-[3.25rem] items-stretch">
            {MOBILE_TABS.map((tab) => {
              const active = isActive(pathname, tab.href);
              return (
                <li key={tab.href}>
                  {/* No pill behind the icon - an iOS tab bar signals the
                      active item with tint alone, and the wrapper's padding
                      was what pushed the label away from the glyph. */}
                  <Link
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-full w-[3.3rem] flex-col items-center justify-center gap-1 rounded-full text-[10px] leading-none transition-colors",
                      active
                        ? "font-semibold text-primary"
                        : "font-medium text-muted-foreground active:text-foreground",
                    )}
                  >
                    <span className="relative">
                      <tab.icon className="size-[19px]" />
                      {(tabBadges[tab.href] ?? 0) > 0 && (
                        <span
                          aria-label={`${tabBadges[tab.href]} unread`}
                          className="numeric absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-none text-primary-foreground ring-2 ring-card"
                        >
                          {tabBadges[tab.href] > 9 ? "9+" : tabBadges[tab.href]}
                        </span>
                      )}
                    </span>
                    {tab.short ?? tab.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/more"
                aria-label="More sections"
                aria-current={onMore ? "page" : undefined}
                className={cn(
                  "flex h-full w-[3.3rem] flex-col items-center justify-center gap-1 rounded-full text-[10px] leading-none transition-colors",
                  onMore || !onPrimaryTab
                    ? "font-semibold text-primary"
                    : "font-medium text-muted-foreground active:text-foreground",
                )}
              >
                <span className="relative">
                  <MenuIcon className="size-[19px]" />
                  {/* Notifications live behind More on a phone; flag
                      anything new there. */}
                  {notificationsUnread > 0 && (
                    <span
                      aria-label={`${notificationsUnread} unread`}
                      className="absolute -right-1.5 -top-1 size-2.5 rounded-full bg-primary ring-2 ring-card"
                    />
                  )}
                </span>
                More
              </Link>
            </li>
          </ul>
        </div>
      </nav>

    </>
  );
}
