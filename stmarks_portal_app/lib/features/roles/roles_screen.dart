import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/admin.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/app_surface.dart';

const Map<String, String> _kRoleDescriptions = {
  'super-admin': 'Full control of the portal, including backups and audit history.',
  'admin': 'Manages all content, media and users, without backup or restore access.',
  'editor': 'Creates, edits and publishes content and media.',
  'viewer': 'Read-only access across content, media, audit and contact messages.',
};

/// The full permission catalogue with the friendly labels used on the web
/// app's `/roles` page — mirrors `ALL_PERMISSIONS` in
/// `frontend/src/app/(admin)/roles/page.tsx`. Listing every permission (not
/// just the ones a role holds) is what lets a reader see what a role is
/// denied, not only what it's granted.
const List<(String permission, String label)> _kAllPermissions = [
  ('content.read', 'Read content'),
  ('content.write', 'Create & edit content'),
  ('content.publish', 'Publish / archive / pin'),
  ('content.delete', 'Delete content'),
  ('media.read', 'Browse media'),
  ('media.write', 'Upload media'),
  ('media.delete', 'Delete media'),
  ('contact.read', 'Read contact inbox'),
  ('users.read', 'View users'),
  ('users.write', 'Manage users'),
  ('audit.read', 'View audit logs'),
  ('audit.delete', 'Clear audit history'),
  ('settings.write', 'Change settings'),
  ('backup.read', 'Download a backup'),
  ('backup.restore', 'Restore from a backup'),
];

/// Static, read-only reference of what each role can do — mirrors the web
/// app's `/roles` page. No API calls, no editing.
class RolesScreen extends ConsumerWidget {
  const RolesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, appPageTop(context), 20, kFloatingDockHeight + 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Roles & permissions', style: theme.textTheme.headlineMedium),
          const SizedBox(height: 4),
          Text(
            'Four roles, from read-only to full control. The server enforces this table on every '
            'request — assigning a role on the Users page is all it takes.',
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 20),
          LayoutBuilder(
            builder: (context, constraints) {
              final columns = constraints.maxWidth > 760 ? 2 : 1;
              return Wrap(
                spacing: 16,
                runSpacing: 16,
                children: kUserRoles.map((role) {
                  final width = columns == 1
                      ? constraints.maxWidth
                      : (constraints.maxWidth - 16) / 2;
                  return SizedBox(width: width, child: _RoleCard(role: role));
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({required this.role});

  final String role;

  String _roleTitle(String role) => role
      .split('-')
      .map((w) => w.isEmpty ? w : w[0].toUpperCase() + w.substring(1))
      .join(' ');

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final granted = kRolePermissions[role] ?? const [];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: ShapeDecoration(
        color: theme.colorScheme.surface,
        shape: appSquircle(24, side: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.7))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(_roleTitle(role), style: theme.textTheme.titleLarge),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(role, style: theme.textTheme.labelSmall),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            _kRoleDescriptions[role] ?? '',
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 16),
          // Every permission is listed — not just the ones this role holds —
          // so it's just as clear what a role is denied as what it's granted.
          for (final (permission, label) in _kAllPermissions)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Icon(
                    granted.contains(permission) ? LucideIcons.check : LucideIcons.minus,
                    size: 16,
                    color: granted.contains(permission)
                        ? theme.colorScheme.primary
                        : theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      label,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: granted.contains(permission)
                            ? theme.colorScheme.onSurface
                            : theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.6),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
