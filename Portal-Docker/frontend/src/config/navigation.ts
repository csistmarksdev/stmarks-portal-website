import {
  ArchiveIcon,
  BellDotIcon,
  BellIcon,
  BookOpenIcon,
  CalendarIcon,
  ChurchIcon,
  ConstructionIcon,
  DownloadIcon,
  FileClockIcon,
  ImageIcon,
  ImagesIcon,
  InboxIcon,
  LayoutDashboardIcon,
  MessageCircleIcon,
  NewspaperIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";
import type { Permission } from "@portal/shared";
import type { ComponentType } from "react";

export interface NavItem {
  href: string;
  label: string;
  /** Shortened label for the mobile tab bar, where width is scarce. */
  short?: string;
  icon: ComponentType<{ className?: string }>;
  /**
   * Shown to, and reachable by, users holding at least one of these. Omitted
   * means everyone signed in.
   */
  anyOf?: readonly Permission[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/** Single source of truth for the desktop rail and the mobile sheet. */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboardIcon },
      // Every account, whatever its role - talking to colleagues needs no permission.
      { href: "/messages", label: "Messages", short: "Chat", icon: MessageCircleIcon },
      // Approvals: submitted, approved, rejected - every account has its own.
      { href: "/notifications", label: "Notifications", short: "Alerts", icon: BellDotIcon },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/events", label: "Events", icon: CalendarIcon },
      { href: "/blog", label: "Blog", icon: NewspaperIcon },
      { href: "/gallery", label: "Gallery", icon: ImagesIcon },
      { href: "/announcements", label: "Announcements", short: "Notices", icon: BellIcon },
      { href: "/downloads", label: "Downloads", icon: DownloadIcon },
    ],
  },
  {
    label: "Church",
    items: [
      // Only for those who can edit (or submit edits to) these pages.
      { href: "/church", label: "Church content", icon: ChurchIcon, anyOf: ["content.write"] },
      { href: "/fellowships", label: "Fellowships", icon: BookOpenIcon },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/media", label: "Media library", short: "Media", icon: ImageIcon, anyOf: ["media.delete"] },
      { href: "/contact-messages", label: "Contact inbox", short: "Inbox", icon: InboxIcon, anyOf: ["contact.read"] },
      { href: "/users", label: "Users", icon: UsersIcon, anyOf: ["users.read", "users.write"] },
      { href: "/roles", label: "Roles & permissions", icon: ShieldIcon, anyOf: ["users.read", "roles.write"] },
      { href: "/audit-logs", label: "Audit logs", icon: FileClockIcon, anyOf: ["audit.read"] },
      { href: "/backup", label: "Backup & restore", short: "Backup", icon: ArchiveIcon, anyOf: ["backup.read", "backup.restore", "roles.write"] },
      // Super-admin only - it takes the whole public website offline.
      { href: "/maintenance", label: "Maintenance mode", short: "Maintenance", icon: ConstructionIcon, anyOf: ["site.maintenance"] },
      { href: "/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

/*
 * System pages are gated by permission, so a custom role sees exactly the
 * pages its permissions open. With the built-in roles that works out as
 * admin and super-admin only (church request, 23 Nov 2026). The backup page
 * is informational for admins - downloading and restoring stay super-admin.
 */

function allowed(item: NavItem, permissions: readonly Permission[]): boolean {
  return !item.anyOf || item.anyOf.some((permission) => permissions.includes(permission));
}

/** The nav as a user with these permissions sees it; empty sections dropped. */
export function navSectionsFor(permissions: readonly Permission[] = []): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => allowed(item, permissions)),
  })).filter((section) => section.items.length > 0);
}

/** False when `pathname` is under a page these permissions do not open. */
export function isPathAllowed(pathname: string, permissions: readonly Permission[] = []): boolean {
  return ALL_ITEMS.every((item) => !isActive(pathname, item.href) || allowed(item, permissions));
}

const ALL_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

/**
 * The five destinations that earn a spot in the mobile tab bar - the jobs a
 * volunteer actually opens their phone to do. Everything else lives behind
 * "More".
 */
export const MOBILE_TABS: NavItem[] = [
  "/dashboard",
  "/events",
  "/announcements",
  "/gallery",
  "/messages",
].map((href) => ALL_ITEMS.find((item) => item.href === href)!);

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Title for the current route, for the mobile app bar. */
export function currentNavLabel(pathname: string): string {
  // Longest match wins so /church/history beats /church.
  const match = [...ALL_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isActive(pathname, item.href));
  return match?.label ?? "Portal";
}
