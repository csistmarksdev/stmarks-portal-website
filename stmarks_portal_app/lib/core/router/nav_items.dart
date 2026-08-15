import 'package:flutter/material.dart';

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
    items: [NavItem(path: '/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: Icons.dashboard_rounded)],
  ),
  NavSection(
    label: 'Content',
    items: [
      NavItem(path: '/events', label: 'Events', icon: Icons.calendar_month_rounded, permission: 'content.read'),
      NavItem(path: '/blog', label: 'Blog', icon: Icons.article_rounded, permission: 'content.read'),
      NavItem(path: '/gallery', label: 'Gallery', icon: Icons.photo_library_rounded, permission: 'content.read'),
      NavItem(
        path: '/announcements',
        label: 'Announcements',
        shortLabel: 'Notices',
        icon: Icons.campaign_rounded,
        permission: 'content.read',
      ),
      NavItem(path: '/downloads', label: 'Downloads', icon: Icons.download_rounded, permission: 'content.read'),
    ],
  ),
  NavSection(
    label: 'Church',
    items: [
      NavItem(path: '/church', label: 'Church content', icon: Icons.church_rounded, permission: 'content.read'),
      NavItem(path: '/fellowships', label: 'Fellowships', icon: Icons.groups_rounded, permission: 'content.read'),
    ],
  ),
  NavSection(
    label: 'System',
    items: [
      NavItem(
        path: '/media',
        label: 'Media library',
        shortLabel: 'Media',
        icon: Icons.image_rounded,
        permission: 'media.read',
      ),
      NavItem(
        path: '/contact-messages',
        label: 'Contact inbox',
        shortLabel: 'Inbox',
        icon: Icons.inbox_rounded,
        permission: 'contact.read',
      ),
      NavItem(path: '/users', label: 'Users', icon: Icons.people_alt_rounded, permission: 'users.read'),
      NavItem(path: '/roles', label: 'Roles & permissions', icon: Icons.shield_rounded),
      NavItem(path: '/audit-logs', label: 'Audit logs', icon: Icons.history_rounded, permission: 'audit.read'),
      NavItem(
        path: '/backup',
        label: 'Backup & restore',
        shortLabel: 'Backup',
        icon: Icons.archive_rounded,
        permission: 'backup.read',
      ),
      NavItem(path: '/settings', label: 'Settings', icon: Icons.settings_rounded),
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
