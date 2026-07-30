"use client";

import { LogOutIcon, MenuIcon, XIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import {
  MOBILE_TABS,
  NAV_SECTIONS,
  currentNavLabel,
  isActive,
} from "@/config/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Mobile navigation, built on native app conventions: a compact app bar up
 * top, a fixed tab bar at the bottom for the four things people open the
 * portal to do, and everything else behind a "More" sheet.
 *
 * Hidden from `lg` up, where the floating sidebar takes over.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Navigating from inside the sheet should close it.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const onPrimaryTab = MOBILE_TABS.some((tab) => isActive(pathname, tab.href));

  return (
    <>
      {/*
       * App bar — deliberately has no controls. The top-right corner is the
       * hardest place to reach one-handed on a tall phone, so navigation and
       * the account menu live in the dock at the bottom instead.
       */}
      <header className="pt-safe glass sticky top-0 z-30 border-b border-border/70 lg:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={32}
            priority
            className="h-8 w-auto shrink-0"
          />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight">
              {currentNavLabel(pathname)}
            </p>
            <p className="label text-[9px] tracking-[0.16em] text-accent-fg">
              St. Mark&apos;s Portal
            </p>
          </div>
        </div>
      </header>

      {/*
       * Floating dock, Apple-style: a centred pill that hugs its icons rather
       * than spanning the screen. `pointer-events-none` on the full-width
       * wrapper keeps the empty space either side of the pill clickable.
       */}
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <div className="mb-dock-gap glass pointer-events-auto mx-auto w-fit rounded-full px-1.5 ring-1 ring-border/70 [box-shadow:var(--shadow-float)]">
          <ul className="flex h-[3.25rem] items-stretch">
            {MOBILE_TABS.map((tab) => {
              const active = isActive(pathname, tab.href);
              return (
                <li key={tab.href}>
                  {/* No pill behind the icon — an iOS tab bar signals the
                      active item with tint alone, and the wrapper's padding
                      was what pushed the label away from the glyph. */}
                  <Link
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-full w-[3.4rem] flex-col items-center justify-center gap-1 rounded-full text-[9px] leading-none transition-colors",
                      active
                        ? "font-semibold text-primary"
                        : "font-medium text-muted-foreground active:text-foreground",
                    )}
                  >
                    <tab.icon className="size-[19px]" />
                    {tab.short ?? tab.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="More sections"
                className={cn(
                  "flex h-full w-[3.4rem] flex-col items-center justify-center gap-1 rounded-full text-[9px] leading-none transition-colors",
                  !onPrimaryTab
                    ? "font-semibold text-primary"
                    : "font-medium text-muted-foreground active:text-foreground",
                )}
              >
                <MenuIcon className="size-[19px]" />
                More
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* ----------------------------- More sheet --------------------------- */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent aria-describedby={undefined}>
          <div className="flex items-center justify-between px-5 pb-2 pt-1">
            <SheetTitle className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
              Everything
            </SheetTitle>
            <SheetClose
              aria-label="Close menu"
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors active:bg-muted"
            >
              <XIcon className="size-4" />
            </SheetClose>
          </div>
          <SheetDescription className="sr-only">
            All portal sections and your account
          </SheetDescription>

          <div className="space-y-5 px-4 pb-4">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="label px-2 pb-1.5 text-[9px] tracking-[0.2em] text-muted-foreground">
                  {section.label}
                </p>
                <ul className="grid grid-cols-2 gap-1.5">
                  {section.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-2xl px-3 py-3 text-[13px] transition-colors",
                            active
                              ? "bg-secondary font-medium text-secondary-foreground ring-1 ring-border"
                              : "bg-muted/70 text-foreground active:bg-border/70",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "size-4 shrink-0",
                              active ? "text-primary" : "text-muted-foreground",
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            <ThemeToggle className="w-full" />

            {user && (
              <div className="flex items-center gap-3 rounded-2xl bg-muted/80 px-3 py-3 ring-1 ring-border/70">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-500 text-xs font-semibold text-white">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[13px] font-medium">{user.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {user.role}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium text-destructive transition-colors active:bg-destructive/10"
                >
                  <LogOutIcon className="size-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
