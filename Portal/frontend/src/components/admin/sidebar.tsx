"use client";

import {
  ChevronsUpDownIcon,
  LogOutIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  UserIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeCycleButton, ThemeToggle } from "@/components/admin/theme-toggle";
import { isActive, navSectionsFor } from "@/config/navigation";
import { useAuth } from "@/lib/auth";
import { useChatUnread } from "@/lib/chat";
import { useNotificationsUnread } from "@/lib/notifications";
import { useSidebarCollapsed } from "@/lib/sidebar-state";
import { cn } from "@/lib/utils";

/**
 * Floating navigation rail — a light rounded card over the parchment ground,
 * matching the Website's solid card surface (gradient wash + hairline ring +
 * layered warm shadow).
 *
 * Collapsible to an icon rail for more room to work; names then appear as
 * tooltips and unread counts as dots. The choice is remembered.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const chatUnread = useChatUnread();
  const notificationsUnread = useNotificationsUnread();
  const badges: Record<string, number> = {
    "/messages": chatUnread,
    "/notifications": notificationsUnread,
  };
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const toggle = (
    <button
      type="button"
      onClick={() => setCollapsed(!collapsed)}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {collapsed ? <PanelLeftOpenIcon className="size-4" /> : <PanelLeftCloseIcon className="size-4" />}
    </button>
  );

  return (
    <aside
      className={cn(
        "fixed inset-y-4 left-4 z-40 hidden flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-card to-card-wash ring-1 ring-border/70 [box-shadow:var(--shadow-card-hover)] transition-[width] duration-300 ease-[var(--ease-out-expo)] lg:flex",
        collapsed ? "w-[4.5rem]" : "w-60",
      )}
    >
      {/*
       * Crest, name, arms — the same arrangement the public site uses in its
       * header, so the CMS is recognisably the back of the same building.
       *
       * `unoptimized` on both: these are SVGs, and Next's image optimiser
       * refuses SVG unless `dangerouslyAllowSVG` is on. Without it the requests
       * 400 and the header comes up with two broken images.
       */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-2 border-b border-border/70 px-2 pb-3 pt-4">
          <Image
            src="/Logo1.svg"
            alt="St. Mark's Portal"
            width={940}
            height={940}
            priority
            unoptimized
            className="size-9 object-contain"
          />
          {toggle}
        </div>
      ) : (
      <div className="flex items-center gap-2.5 border-b border-border/70 py-4 pl-4 pr-3">
        {/* The parish crest and the diocesan arms, side by side; the name is
            left to the page itself. */}
        <Image
          src="/Logo1.svg"
          alt="St. Mark's Church, CSI Madipakkam"
          width={940}
          height={940}
          priority
          unoptimized
          className="size-9 shrink-0 object-contain"
        />
        <Image
          src="/Logo2.svg"
          alt=""
          aria-hidden
          width={523}
          height={860}
          priority
          unoptimized
          className="h-9 w-auto shrink-0 object-contain"
        />
        <span className="ml-auto">{toggle}</span>
      </div>
      )}

      {/* Tight enough that every item, Settings included, fits a 900px-tall
          laptop screen without scrolling the rail. */}
      <nav
        className={cn(
          "scrollbar-ghost flex-1 space-y-2 overflow-y-auto pb-3",
          collapsed ? "px-2 pt-3" : "px-3 pt-3",
        )}
      >
        {navSectionsFor(user?.permissions).map((section) => (
          <div key={section.label}>
            {collapsed ? (
              // Section names do not fit a rail; a hairline keeps the grouping.
              <hr className="mx-2 my-1.5 border-border/70 first:hidden" />
            ) : (
              <div className="flex h-6 items-center pl-2.5">
                <p className="label text-[10px] tracking-[0.18em] text-muted-foreground">
                  {section.label}
                </p>
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-xl text-[13px] transition-colors duration-300 ease-[var(--ease-out-expo)]",
                        collapsed ? "justify-center px-0 py-2" : "px-2.5 py-1",
                        active
                          ? "bg-secondary font-medium text-secondary-foreground ring-1 ring-border"
                          : "text-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          active
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground",
                        )}
                      />
                      {!collapsed && <span className="flex-1">{item.label}</span>}
                      {collapsed && (badges[item.href] ?? 0) > 0 && (
                        <span
                          className="absolute right-2.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-card"
                          aria-label={`${badges[item.href]} unread`}
                        />
                      )}
                      {!collapsed && (badges[item.href] ?? 0) > 0 && (
                        <span
                          className="numeric grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground"
                          aria-label={`${badges[item.href]} unread`}
                        >
                          {badges[item.href] > 99 ? "99+" : badges[item.href]}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {user && (
        <div
          className={cn(
            "space-y-2 border-t border-border/70",
            collapsed ? "flex flex-col items-center p-2" : "p-3",
          )}
        >
          {collapsed ? <ThemeCycleButton /> : <ThemeToggle />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={collapsed ? `${user.name} — ${user.roleName}` : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-2xl bg-muted/80 text-left ring-1 ring-border/70 transition-colors duration-300 hover:bg-muted hover:ring-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  collapsed ? "justify-center p-1" : "w-full px-3 py-2.5",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-500 text-xs font-semibold text-white shadow-sm">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-xs font-medium text-foreground">
                        {user.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {user.roleName}
                      </span>
                    </span>
                    <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52">
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <UserIcon /> Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onSelect={() => void logout()}
              >
                <LogOutIcon /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </aside>
  );
}
