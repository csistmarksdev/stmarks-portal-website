"use client";

import { ChevronsUpDownIcon, LogOutIcon, UserIcon } from "lucide-react";
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
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { NAV_SECTIONS, isActive } from "@/config/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Floating navigation rail — a light rounded card over the parchment ground,
 * matching the Website's solid card surface (gradient wash + hairline ring +
 * layered warm shadow).
 */
export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-4 left-4 z-40 hidden w-60 flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-card to-card-wash ring-1 ring-border/70 [box-shadow:var(--shadow-card-hover)] lg:flex">
      <div className="flex items-center gap-3 border-b border-border/70 px-5 pb-4 pt-5">
        <Image
          src="/logo.png"
          alt=""
          width={36}
          height={40}
          priority
          className="h-10 w-auto shrink-0"
        />
        <div className="leading-tight">
          <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-foreground">
            St. Mark&apos;s Portal
          </p>
          <p className="label mt-0.5 text-[9px] tracking-[0.18em] text-accent-fg">
            CSI Madipakkam
          </p>
        </div>
      </div>

      <nav className="scrollbar-ghost flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="label px-2.5 pb-1.5 text-[9px] tracking-[0.2em] text-muted-foreground">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-colors duration-300 ease-[var(--ease-out-expo)]",
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
                      {item.label}
                      {active && (
                        <span className="absolute right-2.5 size-1.5 rounded-full bg-accent-500" />
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
        <div className="space-y-2 border-t border-border/70 p-3">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-2xl bg-muted/80 px-3 py-2.5 text-left ring-1 ring-border/70 transition-colors duration-300 hover:bg-muted hover:ring-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-500 text-xs font-semibold text-white shadow-sm">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-xs font-medium text-foreground">
                    {user.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {user.role}
                  </span>
                </span>
                <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
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
