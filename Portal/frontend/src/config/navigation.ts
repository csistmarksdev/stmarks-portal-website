import {
  BellIcon,
  BookOpenIcon,
  CalendarIcon,
  ChurchIcon,
  DownloadIcon,
  FileClockIcon,
  ImageIcon,
  ImagesIcon,
  InboxIcon,
  LayoutDashboardIcon,
  NewspaperIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  href: string;
  label: string;
  /** Shortened label for the mobile tab bar, where width is scarce. */
  short?: string;
  icon: ComponentType<{ className?: string }>;
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
      { href: "/church", label: "Church content", icon: ChurchIcon },
      { href: "/fellowships", label: "Fellowships", icon: BookOpenIcon },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/media", label: "Media library", short: "Media", icon: ImageIcon },
      { href: "/contact-messages", label: "Contact inbox", short: "Inbox", icon: InboxIcon },
      { href: "/users", label: "Users", icon: UsersIcon },
      { href: "/roles", label: "Roles & permissions", icon: ShieldIcon },
      { href: "/audit-logs", label: "Audit logs", icon: FileClockIcon },
      { href: "/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

/**
 * The four destinations that earn a spot in the mobile tab bar — the jobs a
 * volunteer actually opens their phone to do. Everything else lives behind
 * "More".
 */
export const MOBILE_TABS: NavItem[] = [
  "/dashboard",
  "/events",
  "/announcements",
  "/gallery",
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
