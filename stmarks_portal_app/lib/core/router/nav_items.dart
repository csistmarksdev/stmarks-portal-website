import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class NavItem {
  const NavItem({required this.path, required this.label, this.shortLabel, required this.icon, this.permission});

  final String path;
  final String label;
  final String? shortLabel;
  final IconData icon;
  final String? permission;

  String get short => shortLabel ?? label;
}

class NavSection {
  const NavSection({required this.label, required this.items});

  final String label;
  final List<NavItem> items;
}

/// Single source of truth for the desktop rail, the mobile "More" sheet and
/// the mobile bottom tab bar — mirrors `frontend/src/config/navigation.ts`.
const navSections = <NavSection>[
  NavSection(
    label: 'Overview',
    items: [NavItem(path: '/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LucideIcons.layoutDashboard)],
  ),
  NavSection(
    label: 'Content',
    items: [
      NavItem(path: '/events', label: 'Events', icon: LucideIcons.calendar, permission: 'content.read'),
      NavItem(path: '/blog', label: 'Blog', icon: LucideIcons.newspaper, permission: 'content.read'),
      NavItem(path: '/gallery', label: 'Gallery', icon: LucideIcons.images, permission: 'content.read'),
      NavItem(
        path: '/announcements',
        label: 'Announcements',
        shortLabel: 'Notices',
        icon: LucideIcons.bell,
        permission: 'content.read',
      ),
      NavItem(path: '/downloads', label: 'Downloads', icon: LucideIcons.download, permission: 'content.read'),
    ],
  ),
  NavSection(
    label: 'Church',
    items: [
      NavItem(path: '/church', label: 'Church content', icon: LucideIcons.church, permission: 'content.read'),
      NavItem(path: '/fellowships', label: 'Fellowships', icon: LucideIcons.bookOpen, permission: 'content.read'),
    ],
  ),
  NavSection(
    label: 'System',
    items: [
      NavItem(
        path: '/media',
        label: 'Media library',
        shortLabel: 'Media',
        icon: LucideIcons.image,
        permission: 'media.read',
      ),
      NavItem(
        path: '/contact-messages',
        label: 'Contact inbox',
        shortLabel: 'Inbox',
        icon: LucideIcons.inbox,
        permission: 'contact.read',
      ),
      NavItem(path: '/users', label: 'Users', icon: LucideIcons.users, permission: 'users.read'),
      NavItem(path: '/roles', label: 'Roles & permissions', icon: LucideIcons.shield),
      NavItem(path: '/audit-logs', label: 'Audit logs', icon: LucideIcons.fileClock, permission: 'audit.read'),
      NavItem(
        path: '/backup',
        label: 'Backup & restore',
        shortLabel: 'Backup',
        icon: LucideIcons.archive,
        permission: 'backup.read',
      ),
      NavItem(path: '/settings', label: 'Settings', icon: LucideIcons.settings),
    ],
  ),
];

final List<NavItem> allNavItems = navSections.expand((s) => s.items).toList();

const mobileTabPaths = ['/dashboard', '/events', '/announcements', '/gallery'];

List<NavItem> get mobileTabs =>
    mobileTabPaths.map((p) => allNavItems.firstWhere((i) => i.path == p)).toList();

bool navIsActive(String location, String href) => location == href || location.startsWith('$href/');

String currentNavLabel(String location) {
  final sorted = [...allNavItems]..sort((a, b) => b.path.length.compareTo(a.path.length));
  for (final item in sorted) {
    if (navIsActive(location, item.path)) return item.label;
  }
  return 'Portal';
}
