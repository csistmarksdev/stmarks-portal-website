import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/admin.dart';
import '../../core/providers/providers.dart';
import '../../core/router/nav_items.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/brand_mark.dart';
import '../../widgets/theme_toggle.dart';
import '../auth/auth_controller.dart';

/// Responsive shell mirroring the web Portal's layout: a floating rounded
/// sidebar on wide screens (`(admin)/layout.tsx`), and on narrow screens a
/// glassmorphic app bar plus a floating pill bottom-tab dock with a "More"
/// sheet for everything else.
class AdminShell extends ConsumerWidget {
  const AdminShell({super.key, required this.child, required this.location});

  final Widget child;
  final String location;

  static const _wideBreakpoint = 1024.0;
  static const _midBreakpoint = 720.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        if (width >= _wideBreakpoint) {
          return _WideShell(location: location, auth: auth, child: child);
        }
        if (width >= _midBreakpoint) {
          return _RailShell(location: location, auth: auth, child: child);
        }
        return _MobileShell(location: location, auth: auth, child: child);
      },
    );
  }
}

bool _canSee(AuthState auth, NavItem item) {
  if (item.permission == null) return true;
  final role = auth.user?.role;
  if (role == null) return false;
  return kRolePermissions[role]?.contains(item.permission) ?? false;
}

List<NavSection> _visibleSections(AuthState auth) {
  return navSections
      .map((s) => NavSection(label: s.label, items: s.items.where((i) => _canSee(auth, i)).toList()))
      .where((s) => s.items.isNotEmpty)
      .toList();
}

// ---------------------------------------------------------------------------
// Wide desktop shell — floating sidebar
// ---------------------------------------------------------------------------

class _WideShell extends StatelessWidget {
  const _WideShell({required this.location, required this.auth, required this.child});

  final String location;
  final AuthState auth;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Positioned(
            top: 16,
            bottom: 16,
            left: 16,
            width: 240,
            child: _Sidebar(location: location, auth: auth),
          ),
          Positioned.fill(
            left: 272,
            child: SafeArea(left: false, child: child),
          ),
        ],
      ),
    );
  }
}

class _Sidebar extends StatelessWidget {
  const _Sidebar({required this.location, required this.auth});

  final String location;
  final AuthState auth;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sections = _visibleSections(auth);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadii.card),
        border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.7)),
        boxShadow: cardShadow(context),
      ),
      child: Column(
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(14, 20, 14, 14),
            child: BrandLockup(markSize: 34),
          ),
          const Divider(height: 1),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
              children: [
                for (final section in sections) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(10, 14, 10, 6),
                    child: Text(section.label.toUpperCase(), style: theme.textTheme.labelMedium),
                  ),
                  for (final item in section.items) _SidebarTile(item: item, active: navIsActive(location, item.path)),
                ],
              ],
            ),
          ),
          const Divider(height: 1),
          _UserFooter(auth: auth),
        ],
      ),
    );
  }
}

class _SidebarTile extends StatelessWidget {
  const _SidebarTile({required this.item, required this.active});

  final NavItem item;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Material(
        color: active ? theme.colorScheme.primaryContainer : Colors.transparent,
        borderRadius: BorderRadius.circular(AppRadii.md),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadii.md),
          onTap: () => context.go(item.path),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            child: Row(
              children: [
                Icon(
                  item.icon,
                  size: 19,
                  color: active ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    item.label,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: active ? theme.colorScheme.onPrimaryContainer : theme.colorScheme.onSurface,
                      fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _UserFooter extends ConsumerWidget {
  const _UserFooter({required this.auth});

  final AuthState auth;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = auth.user;
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const ThemeToggle(),
          const SizedBox(height: 8),
          PopupMenuButton<String>(
            offset: const Offset(0, -110),
            position: PopupMenuPosition.under,
            onSelected: (value) {
              if (value == 'account') {
                context.go('/settings');
              } else if (value == 'logout') {
                _confirmLogout(context, ref);
              }
            },
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'account', child: Row(children: [Icon(Icons.person_outline_rounded, size: 18), SizedBox(width: 10), Text('Account')])),
              PopupMenuDivider(),
              PopupMenuItem(
                value: 'logout',
                child: Row(children: [Icon(Icons.logout_rounded, size: 18, color: Colors.red), SizedBox(width: 10), Text('Sign out', style: TextStyle(color: Colors.red))]),
              ),
            ],
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(AppRadii.card),
                border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.7)),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: theme.colorScheme.tertiary,
                    child: Text(
                      (user?.name.isNotEmpty ?? false) ? user!.name[0].toUpperCase() : '?',
                      style: TextStyle(color: theme.colorScheme.onTertiary, fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user?.name ?? '', style: theme.textTheme.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                        Text(
                          user?.role ?? '',
                          style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 0, fontSize: 10.5),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.unfold_more_rounded, size: 15, color: theme.colorScheme.onSurfaceVariant),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Sign out?'),
      content: const Text("You'll need to sign in again to keep managing the portal."),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Sign out')),
      ],
    ),
  );
  if (confirmed == true) {
    await ref.read(authControllerProvider.notifier).logout();
    if (context.mounted) context.go('/login');
  }
}

// ---------------------------------------------------------------------------
// Mid-width shell — collapsed icon rail
// ---------------------------------------------------------------------------

class _RailShell extends ConsumerWidget {
  const _RailShell({required this.location, required this.auth, required this.child});

  final String location;
  final AuthState auth;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sections = _visibleSections(auth);
    final items = sections.expand((s) => s.items).toList();
    final selectedIndex = items.indexWhere((i) => navIsActive(location, i.path)).clamp(0, items.length - 1);

    return Scaffold(
      body: Row(
        children: [
          SingleChildScrollView(
            child: IntrinsicHeight(
              child: NavigationRail(
                selectedIndex: selectedIndex < 0 ? 0 : selectedIndex,
                onDestinationSelected: (i) => context.go(items[i].path),
                labelType: NavigationRailLabelType.none,
                leading: const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: BrandMark(size: 32)),
                trailing: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        tooltip: 'Settings',
                        icon: const Icon(Icons.settings_outlined),
                        onPressed: () => context.go('/settings'),
                      ),
                      IconButton(
                        tooltip: 'Sign out',
                        icon: const Icon(Icons.logout_rounded),
                        onPressed: () => _confirmLogout(context, ref),
                      ),
                    ],
                  ),
                ),
                destinations: [
                  for (final item in items)
                    NavigationRailDestination(icon: Icon(item.icon), label: Text(item.short)),
                ],
              ),
            ),
          ),
          const VerticalDivider(width: 1),
          Expanded(child: SafeArea(child: child)),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Mobile shell — glass app bar + floating pill dock
// ---------------------------------------------------------------------------

class _MobileShell extends ConsumerWidget {
  const _MobileShell({required this.location, required this.auth, required this.child});

  final String location;
  final AuthState auth;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Scaffold(
      extendBody: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: ClipRRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
            child: Container(
              color: theme.colorScheme.surface.withValues(alpha: 0.72),
              padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top),
              child: SizedBox(
                height: kToolbarHeight,
                child: Row(
                  children: [
                    const SizedBox(width: 16),
                    const BrandMark(size: 30),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            currentNavLabel(location),
                            style: theme.textTheme.titleMedium,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            "StMarksChurch",
                            style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.tertiary, fontSize: 9.5, letterSpacing: 1.2),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 180),
        switchInCurve: Curves.easeOut,
        switchOutCurve: Curves.easeIn,
        transitionBuilder: (child, animation) {
          return FadeTransition(
            opacity: animation,
            child: child,
          );
        },
        child: KeyedSubtree(
          key: ValueKey(location),
          child: child,
        ),
      ),
      bottomNavigationBar: _BottomDock(location: location, auth: auth),
    );
  }
}

class _BottomDock extends ConsumerWidget {
  const _BottomDock({required this.location, required this.auth});

  final String location;
  final AuthState auth;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final tabs = mobileTabs.where((i) => _canSee(auth, i)).toList();

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          top: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.5)),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: theme.brightness == Brightness.dark ? 0.3 : 0.08),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 56,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              for (final item in tabs) _DockTile(item: item, active: navIsActive(location, item.path)),
              _DockTile(
                item: const NavItem(path: '__more', label: 'More', icon: Icons.grid_view_rounded),
                active: false,
                onTap: () => _showMoreSheet(context, ref, auth, location),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DockTile extends StatelessWidget {
  const _DockTile({required this.item, required this.active, this.onTap});

  final NavItem item;
  final bool active;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = active ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadii.pill),
        onTap: onTap ?? () => context.go(item.path),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(item.icon, size: 20, color: color),
            const SizedBox(height: 1),
            Text(
              item.short,
              style: theme.textTheme.labelSmall?.copyWith(
                color: color,
                letterSpacing: 0,
                fontSize: 10,
                fontWeight: active ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

void _showMoreSheet(BuildContext context, WidgetRef ref, AuthState auth, String location) {
  final sections = _visibleSections(auth);
  final user = auth.user;
  showModalBottomSheet(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (ctx) {
      final theme = Theme.of(ctx);
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
                  child: Text('Everything', style: theme.textTheme.headlineSmall),
                ),
                for (final section in sections) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(4, 12, 4, 8),
                    child: Text(section.label.toUpperCase(), style: theme.textTheme.labelMedium),
                  ),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 6,
                    crossAxisSpacing: 6,
                    childAspectRatio: 3.4,
                    children: [
                      for (final item in section.items)
                        _MoreSheetTile(
                          item: item,
                          active: navIsActive(location, item.path),
                          onTap: () {
                            Navigator.pop(ctx);
                            GoRouter.of(context).go(item.path);
                          },
                        ),
                    ],
                  ),
                ],
                const SizedBox(height: 18),
                const ThemeToggle(),
                if (user != null) ...[
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.7),
                      borderRadius: BorderRadius.circular(AppRadii.card),
                      border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.7)),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: theme.colorScheme.tertiary,
                          child: Text(
                            user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                            style: TextStyle(color: theme.colorScheme.onTertiary, fontWeight: FontWeight.w700),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(user.name, style: theme.textTheme.bodyMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
                              Text(user.role, style: theme.textTheme.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                            ],
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () {
                            Navigator.pop(ctx);
                            _confirmLogout(context, ref);
                          },
                          icon: const Icon(Icons.logout_rounded, size: 16, color: Colors.red),
                          label: const Text('Sign out', style: TextStyle(color: Colors.red)),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    },
  );
}

class _MoreSheetTile extends StatelessWidget {
  const _MoreSheetTile({required this.item, required this.active, required this.onTap});

  final NavItem item;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: active ? theme.colorScheme.primaryContainer : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.6),
      borderRadius: BorderRadius.circular(AppRadii.md),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadii.md),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              Icon(item.icon, size: 17, color: active ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant),
              const SizedBox(width: 9),
              Expanded(
                child: Text(
                  item.label,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                    color: active ? theme.colorScheme.onPrimaryContainer : theme.colorScheme.onSurface,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
