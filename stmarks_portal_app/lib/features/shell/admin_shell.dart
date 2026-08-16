import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/admin.dart';
import '../../core/notifications/contact_watcher.dart';
import '../../core/notifications/notification_service.dart';
import '../../core/providers/providers.dart';
import '../../core/router/nav_items.dart';
import '../legal/legal_documents.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/app_surface.dart';
import '../../widgets/brand_mark.dart';
import '../../widgets/theme_toggle.dart';
import '../auth/auth_controller.dart';

/// Responsive shell mirroring the web Portal's layout: a floating rounded
/// sidebar on wide screens (`(admin)/layout.tsx`), and on narrow screens a
/// slim app bar plus a detached, glassy pill dock that floats clear of the
/// bottom edge with a "More" sheet for everything else.
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

String _initialOf(String? name) =>
    (name != null && name.trim().isNotEmpty) ? name.trim()[0].toUpperCase() : '?';

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
            width: 248,
            child: _Sidebar(location: location, auth: auth),
          ),
          Positioned.fill(left: 280, child: SafeArea(left: false, child: child)),
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

    return AppSurface(
      elevation: SurfaceElevation.floating,
      clipContents: true,
      child: Column(
        children: [
          const Padding(padding: EdgeInsets.fromLTRB(14, 20, 14, 16), child: BrandLockup(markSize: 34)),
          const Divider(height: 1),
          Expanded(
            child: Scrollbar(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
                children: [
                  for (final (index, section) in sections.indexed) ...[
                    Padding(
                      padding: EdgeInsets.fromLTRB(12, index == 0 ? 10 : 18, 12, 6),
                      child: Text(section.label.toUpperCase(), style: theme.textTheme.labelMedium),
                    ),
                    for (final item in section.items)
                      _SidebarTile(item: item, active: navIsActive(location, item.path)),
                  ],
                ],
              ),
            ),
          ),
          const Divider(height: 1),
          _UserFooter(auth: auth),
        ],
      ),
    );
  }
}

class _SidebarTile extends ConsumerWidget {
  const _SidebarTile({required this.item, required this.active});

  final NavItem item;
  final bool active;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final unread = item.path == '/contact-messages' ? ref.watch(unreadContactCountProvider) : 0;
    final color = active ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 1),
      child: Semantics(
        selected: active,
        child: Material(
          color: active ? theme.colorScheme.primaryContainer : Colors.transparent,
          shape: appSquircle(AppRadii.md),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            customBorder: appSquircle(AppRadii.md),
            onTap: () => context.go(item.path),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(8, 10, 12, 10),
              child: Row(
                children: [
                  // A 3px brand bar on the active row — the cue that survives
                  // being read at a glance, where a background tint alone
                  // doesn't.
                  AnimatedContainer(
                    duration: AppDurations.medium,
                    curve: appEaseOutExpo,
                    width: 3,
                    height: active ? 18 : 0,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary,
                      borderRadius: BorderRadius.circular(AppRadii.pill),
                    ),
                  ),
                  const SizedBox(width: 9),
                  Icon(item.icon, size: 19, color: color),
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
                  if (unread > 0) _UnreadBadge(count: unread),
                ],
              ),
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
          const SizedBox(height: 10),
          PopupMenuButton<String>(
            position: PopupMenuPosition.over,
            tooltip: 'Account',
            onSelected: (value) {
              if (value == 'account') {
                context.go('/settings');
              } else if (value == 'logout') {
                _confirmLogout(context, ref);
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'account',
                child: Row(
                  children: [
                    Icon(LucideIcons.user, size: 18),
                    SizedBox(width: 10),
                    Text('Account'),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(LucideIcons.logOut, size: 18, color: theme.colorScheme.error),
                    const SizedBox(width: 10),
                    Text('Sign out', style: TextStyle(color: theme.colorScheme.error)),
                  ],
                ),
              ),
            ],
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
              decoration: ShapeDecoration(
                color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.7),
                shape: appSquircle(
                  AppRadii.lg,
                  side: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.7)),
                ),
              ),
              child: Row(
                children: [
                  _Avatar(name: user?.name, radius: 15),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.name ?? '',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          user?.role ?? '',
                          style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 0.2, fontSize: 10.5),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Icon(LucideIcons.chevronsUpDown, size: 15, color: theme.colorScheme.onSurfaceVariant),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Initial-in-a-circle avatar, shared by the sidebar footer, the mobile app
/// bar and the More sheet so one person reads the same in all three.
class _Avatar extends StatelessWidget {
  const _Avatar({required this.name, this.radius = 16});

  final String? name;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: radius * 2,
      height: radius * 2,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFBF2A6D), Color(0xFFB03316)],
        ),
      ),
      child: Text(
        _initialOf(name),
        style: theme.textTheme.labelLarge?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w700,
          fontSize: radius * 0.85,
          height: 1,
        ),
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
        FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: Theme.of(ctx).colorScheme.error,
            foregroundColor: Theme.of(ctx).colorScheme.onError,
          ),
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('Sign out'),
        ),
      ],
    ),
  );
  if (confirmed == true) {
    ref.read(contactWatcherProvider).reset();
    await NotificationService.instance.cancelAll();
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
    final match = items.indexWhere((i) => navIsActive(location, i.path));

    return Scaffold(
      body: Row(
        children: [
          SingleChildScrollView(
            child: IntrinsicHeight(
              child: NavigationRail(
                selectedIndex: match < 0 ? null : match,
                onDestinationSelected: (i) => context.go(items[i].path),
                labelType: NavigationRailLabelType.none,
                leading: const Padding(padding: EdgeInsets.fromLTRB(0, 16, 0, 8), child: BrandMark(size: 32)),
                trailing: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        tooltip: 'Sign out',
                        icon: const Icon(LucideIcons.logOut),
                        onPressed: () => _confirmLogout(context, ref),
                      ),
                      const SizedBox(height: 4),
                    ],
                  ),
                ),
                destinations: [
                  for (final item in items)
                    NavigationRailDestination(
                      icon: Icon(item.icon),
                      label: Text(item.short),
                      padding: const EdgeInsets.symmetric(vertical: 2),
                    ),
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
// Mobile shell — slim app bar + detached floating dock
// ---------------------------------------------------------------------------

class _MobileShell extends ConsumerWidget {
  const _MobileShell({required this.location, required this.auth, required this.child});

  final String location;
  final AuthState auth;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mq = MediaQuery.of(context);
    // What the page must keep clear at the top: the status bar plus the
    // floating bar that now sits over the content rather than above it.
    final topInset = mq.padding.top + _MobileAppBar.barHeight;
    // With a keyboard up, the dock would be pushed to sit directly on top of
    // it — a row of navigation between the writer and the line they are
    // typing. Nobody navigates mid-sentence, so it stands down.
    final typing = mq.viewInsets.bottom > 0;

    // The two bar capsules and the dock each blur whatever is behind them.
    // Left alone that is three separate full-screen blur passes on every
    // scrolled frame; grouped, they sample the backdrop once and share it.
    return BackdropGroup(
      child: Scaffold(
        // Both bars float, so the page runs the full height of the screen and
        // passes underneath them at either end.
        extendBody: true,
        extendBodyBehindAppBar: true,
        appBar: _MobileAppBar(location: location, auth: auth),
        bottomNavigationBar: typing ? null : _FloatingDock(location: location, auth: auth),
        body: MediaQuery(
          // Publishing the bar height as the top padding is what lets every
          // page position its first row correctly without knowing the shell
          // exists — `appPageTop` just reads it back out.
          data: mq.copyWith(padding: mq.padding.copyWith(top: topInset)),
          child: Stack(
            children: [
              Positioned.fill(child: child),
              // Content dissolves into the background as it reaches either
              // edge, instead of being sliced off by a hard bar.
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: topInset,
                child: _EdgeFade(extent: topInset, solidUpTo: mq.padding.top, fromTop: true),
              ),
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                height: kFloatingDockHeight + mq.padding.bottom * 0.5,
                child: const _EdgeFade(fromTop: false),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A one-way dissolve between the page background and nothing, laid over the
/// scrolling content at the top and bottom edges. Purely decorative, so it
/// never takes a touch.
class _EdgeFade extends StatelessWidget {
  const _EdgeFade({required this.fromTop, this.extent = 0, this.solidUpTo = 0});

  final bool fromTop;

  /// Height of the fade, used to work out where the solid band ends.
  final double extent;

  /// How much of the top is held fully opaque — the status bar, so its icons
  /// stay legible over whatever scrolls past.
  final double solidUpTo;

  @override
  Widget build(BuildContext context) {
    final background = Theme.of(context).scaffoldBackgroundColor;
    final solidStop = (extent > 0 ? (solidUpTo / extent) : 0.0).clamp(0.0, 0.9);

    return RepaintBoundary(
      child: IgnorePointer(
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: fromTop ? Alignment.topCenter : Alignment.bottomCenter,
              end: fromTop ? Alignment.bottomCenter : Alignment.topCenter,
              colors: [
                background,
                background,
                background.withValues(alpha: 0.92),
                background.withValues(alpha: 0),
              ],
              stops: [0, solidStop, solidStop + (1 - solidStop) * 0.45, 1],
            ),
          ),
        ),
      ),
    );
  }
}

class _MobileAppBar extends ConsumerWidget implements PreferredSizeWidget {
  const _MobileAppBar({required this.location, required this.auth});

  final String location;
  final AuthState auth;

  @override
  Size get preferredSize => const Size.fromHeight(barHeight);

  static const barHeight = 62.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // No chrome of its own — the capsules float over the scrolling page, and
    // the shell's edge fade is what keeps them legible.
    return Padding(
      padding: EdgeInsets.only(top: MediaQuery.paddingOf(context).top),
      child: SizedBox(
        height: barHeight,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
          child: Row(
            // The identity capsule is sized by its content, not stretched to
            // fill the bar, so it ends just after the title instead of
            // trailing a long empty tail across to the avatar.
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: _BarCapsule(
                  isDark: isDark,
                  padding: const EdgeInsets.fromLTRB(5, 5, 15, 5),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const BrandMark(size: 30),
                      const SizedBox(width: 10),
                      Flexible(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'STMARKSCHURCH',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: theme.colorScheme.tertiary,
                                fontSize: 8.5,
                                letterSpacing: 1.3,
                                height: 1.2,
                              ),
                              maxLines: 1,
                            ),
                            Text(
                              currentNavLabel(location),
                              style: theme.textTheme.titleMedium?.copyWith(fontSize: 15, height: 1.25),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 9),
              // Capsule two: you. Separated so the account is its own target
              // rather than an afterthought riding on the title bar.
              _BarCapsule(
                isDark: isDark,
                padding: const EdgeInsets.all(5),
                onTap: () => _showAccountSheet(context, ref, auth),
                tooltip: 'Your account',
                child: _Avatar(name: auth.user?.name, radius: 15),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// One capsule of the top bar: a frosted chip floating over the page.
///
/// The blur earns its keep here — the page scrolls underneath these, so there
/// is real content behind the glass rather than flat background.
class _BarCapsule extends StatelessWidget {
  const _BarCapsule({
    required this.child,
    required this.isDark,
    required this.padding,
    this.onTap,
    this.tooltip,
  });

  final Widget child;
  final bool isDark;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final shape = const StadiumBorder().copyWith(
      side: BorderSide(
        color: isDark
            ? Colors.white.withValues(alpha: 0.09)
            : theme.colorScheme.outline.withValues(alpha: 0.85),
      ),
    );

    Widget content = Padding(padding: padding, child: child);
    if (onTap != null) {
      content = InkWell(customBorder: shape, onTap: onTap, child: content);
    }

    Widget capsule = DecoratedBox(
      decoration: ShapeDecoration(shape: shape, shadows: restingShadow(context)),
      child: ClipPath(
        clipper: ShapeBorderClipper(shape: shape),
        child: BackdropFilter.grouped(
          filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: Material(
            color: theme.colorScheme.surface.withValues(alpha: isDark ? 0.72 : 0.8),
            shape: shape,
            clipBehavior: Clip.antiAlias,
            child: content,
          ),
        ),
      ),
    );

    if (tooltip != null) capsule = Tooltip(message: tooltip!, child: capsule);
    return capsule;
  }
}

/// The floating dock: a single detached pill, centred on the screen and only
/// as wide as its tabs need, so the destinations sit shoulder-to-shoulder
/// instead of being flung to the corners of a full-width bar.
class _FloatingDock extends ConsumerWidget {
  const _FloatingDock({required this.location, required this.auth});

  final String location;
  final AuthState auth;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final tabs = mobileTabs.where((i) => _canSee(auth, i)).toList();
    // Anything outside the four pinned tabs lives behind "More", so that's
    // what should look selected while you're in there.
    final onTab = tabs.any((i) => navIsActive(location, i.path));
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, bottomInset > 0 ? bottomInset * 0.5 + 8 : 14),
      // `heightFactor: 1` is load-bearing: Scaffold hands its bottom slot
      // loose constraints, and a plain Center would stretch to the full page
      // height and strand the dock in the middle of the screen.
      child: Align(
        alignment: Alignment.bottomCenter,
        heightFactor: 1,
        child: Container(
          // The shadow lives outside the clip — a BoxShadow drawn inside a
          // ClipRRect is clipped away with everything else.
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.pill),
            boxShadow: floatingShadow(context),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppRadii.pill),
            child: BackdropFilter.grouped(
              filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
              child: Container(
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface.withValues(alpha: isDark ? 0.82 : 0.88),
                  borderRadius: BorderRadius.circular(AppRadii.pill),
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.08)
                        : theme.colorScheme.outline.withValues(alpha: 0.9),
                  ),
                ),
                padding: const EdgeInsets.all(5),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (final item in tabs)
                        _DockTile(item: item, active: navIsActive(location, item.path)),
                      _DockTile(
                        // Not a grid icon: Dashboard already owns one, and at
                        // dock size the two are indistinguishable.
                        item: const NavItem(path: '__more', label: 'More', icon: LucideIcons.ellipsis),
                        active: !onTab,
                        // The contact inbox is behind "More", so unread mail
                        // has to announce itself here or it is invisible.
                        badgeCount: ref.watch(unreadContactCountProvider),
                        onTap: () => _showMoreSheet(context, ref, auth, location),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DockTile extends StatelessWidget {
  const _DockTile({required this.item, required this.active, this.onTap, this.badgeCount = 0});

  final NavItem item;
  final bool active;
  final VoidCallback? onTap;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return TweenAnimationBuilder<double>(
      // Only `end` drives the animation — TweenAnimationBuilder eases from
      // whatever the last value was to the new target on each rebuild.
      tween: Tween<double>(begin: 0, end: active ? 1 : 0),
      duration: AppDurations.medium,
      curve: appEaseOutExpo,
      builder: (context, t, _) {
        final color = Color.lerp(theme.colorScheme.onSurfaceVariant, theme.colorScheme.primary, t)!;
        return Semantics(
          button: true,
          selected: active,
          label: item.label,
          child: Material(
            color: Color.lerp(Colors.transparent, theme.colorScheme.primaryContainer, t),
            borderRadius: BorderRadius.circular(AppRadii.pill),
            child: InkWell(
              borderRadius: BorderRadius.circular(AppRadii.pill),
              // No ripple in the dock. The pill sliding to the tapped tab is
              // already the feedback, and a splash expanding underneath it
              // just muddies that one clean movement. The haptic covers the
              // "I registered your touch" job the ripple would have done.
              splashFactory: NoSplash.splashFactory,
              splashColor: Colors.transparent,
              highlightColor: Colors.transparent,
              hoverColor: Colors.transparent,
              onTap: () {
                HapticFeedback.selectionClick();
                (onTap ?? () => context.go(item.path))();
              },
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 12 + 3 * t, vertical: 11),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Icon(item.icon, size: 20, color: color),
                        if (badgeCount > 0)
                          Positioned(top: -3, right: -4, child: _UnreadBadge(count: badgeCount, dotOnly: true)),
                      ],
                    ),
                    // The label unfurls only for the selected tab, which is
                    // what keeps five destinations narrow enough to sit
                    // together in one pill.
                    ClipRect(
                      child: Align(
                        alignment: Alignment.centerLeft,
                        widthFactor: t,
                        child: Opacity(
                          opacity: t.clamp(0.0, 1.0),
                          child: Padding(
                            padding: const EdgeInsets.only(left: 7, right: 2),
                            child: Text(
                              item.short,
                              maxLines: 1,
                              softWrap: false,
                              style: theme.textTheme.labelLarge?.copyWith(
                                fontSize: 13,
                                color: theme.colorScheme.onPrimaryContainer,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// "More" sheet — every destination the dock can't hold
//
// Deliberately holds navigation and nothing else. Who you are signed in as is
// not a place you can navigate to, and burying "Sign out" under the last row
// of a destination grid made it both hard to find and easy to hit by mistake.
// The account lives behind the profile capsule instead.
// ---------------------------------------------------------------------------

void _showMoreSheet(BuildContext context, WidgetRef ref, AuthState auth, String location) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.88),
    builder: (ctx) => _MoreSheet(auth: auth, location: location, parentContext: context, ref: ref),
  );
}

class _MoreSheet extends StatelessWidget {
  const _MoreSheet({
    required this.auth,
    required this.location,
    required this.parentContext,
    required this.ref,
  });

  final AuthState auth;
  final String location;
  final BuildContext parentContext;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sections = _visibleSections(auth);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 12, 10),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Everything', style: theme.textTheme.headlineSmall),
                    const SizedBox(height: 2),
                    Text('Every part of the portal you can reach', style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Close',
                icon: const Icon(LucideIcons.x, size: 20),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Flexible(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
            children: [
              for (final section in sections) ...[
                Padding(
                  padding: const EdgeInsets.fromLTRB(4, 12, 4, 8),
                  child: Text(section.label.toUpperCase(), style: theme.textTheme.labelMedium),
                ),
                LayoutBuilder(
                  builder: (context, constraints) => GridView.count(
                    crossAxisCount: constraints.maxWidth > 460 ? 3 : 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 3.0,
                    children: [
                      for (final item in section.items)
                        _MoreSheetTile(
                          item: item,
                          active: navIsActive(location, item.path),
                          badgeCount: item.path == '/contact-messages'
                              ? ref.watch(unreadContactCountProvider)
                              : 0,
                          onTap: () {
                            Navigator.pop(context);
                            GoRouter.of(parentContext).go(item.path);
                          },
                        ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Account sheet — behind the profile capsule, top right
// ---------------------------------------------------------------------------

void _showAccountSheet(BuildContext context, WidgetRef ref, AuthState auth) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.8),
    builder: (ctx) => _AccountSheet(auth: auth, parentContext: context, ref: ref),
  );
}

class _AccountSheet extends StatelessWidget {
  const _AccountSheet({required this.auth, required this.parentContext, required this.ref});

  final AuthState auth;
  final BuildContext parentContext;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = auth.user;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 4, 0, 16),
            child: Row(
              children: [
                _Avatar(name: user?.name, radius: 26),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.name ?? 'Signed in',
                        style: theme.textTheme.titleLarge,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user?.email ?? '',
                        style: theme.textTheme.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (user != null) ...[
                        const SizedBox(height: 7),
                        // The role decides what the rest of the portal will
                        // let this person do, so it is worth stating plainly
                        // rather than as one more line of grey text.
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                          decoration: ShapeDecoration(
                            color: theme.colorScheme.primaryContainer,
                            shape: const StadiumBorder(),
                          ),
                          child: Text(
                            user.role,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: theme.colorScheme.onPrimaryContainer,
                              letterSpacing: 0.3,
                              fontSize: 11,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Close',
                  icon: const Icon(LucideIcons.x, size: 20),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
            child: Text('APPEARANCE', style: theme.textTheme.labelMedium),
          ),
          const ThemeToggle(),
          const SizedBox(height: 20),
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
            child: Text('ACCOUNT', style: theme.textTheme.labelMedium),
          ),
          AppSurface(
            padding: EdgeInsets.zero,
            clipContents: true,
            child: Column(
              children: [
                _AccountRow(
                  icon: LucideIcons.user,
                  label: 'Account & password',
                  onTap: () {
                    Navigator.pop(context);
                    GoRouter.of(parentContext).go('/settings');
                  },
                ),
                const AppInsetDivider(indent: 52),
                _AccountRow(
                  icon: LucideIcons.server,
                  label: 'Server connection',
                  onTap: () {
                    Navigator.pop(context);
                    GoRouter.of(parentContext).go('/settings');
                  },
                ),
                const AppInsetDivider(indent: 52),
                for (final doc in legalDocuments) ...[
                  _AccountRow(
                    icon: LucideIcons.fileText,
                    label: doc.title,
                    onTap: () {
                      Navigator.pop(context);
                      GoRouter.of(parentContext).push('/legal/${doc.slug}');
                    },
                  ),
                  if (doc != legalDocuments.last) const AppInsetDivider(indent: 52),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),
          AppSurface(
            padding: EdgeInsets.zero,
            clipContents: true,
            child: _AccountRow(
              icon: LucideIcons.logOut,
              label: 'Sign out',
              destructive: true,
              onTap: () {
                Navigator.pop(context);
                _confirmLogout(parentContext, ref);
              },
            ),
          ),
          const SizedBox(height: 14),
          Center(
            child: Text(
              "CSI St. Mark's Portal · version $kAppVersion",
              style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 0.2, fontSize: 10.5),
            ),
          ),
        ],
      ),
    );
  }
}

class _AccountRow extends StatelessWidget {
  const _AccountRow({
    required this.icon,
    required this.label,
    required this.onTap,
    this.destructive = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = destructive ? theme.colorScheme.error : theme.colorScheme.onSurface;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 15, 14, 15),
        child: Row(
          children: [
            Icon(icon, size: 18, color: destructive ? color : theme.colorScheme.onSurfaceVariant),
            const SizedBox(width: 14),
            Expanded(child: Text(label, style: theme.textTheme.bodyMedium?.copyWith(color: color))),
            if (!destructive)
              Icon(LucideIcons.chevronRight, size: 18, color: theme.colorScheme.onSurfaceVariant),
          ],
        ),
      ),
    );
  }
}

/// A count badge for the contact inbox. Shown wherever the inbox can be
/// reached but isn't currently on screen, so a message waiting is visible
/// without opening anything.
class _UnreadBadge extends StatelessWidget {
  const _UnreadBadge({required this.count, this.dotOnly = false});

  final int count;

  /// On the dock there is no room for digits, so the badge collapses to a dot.
  final bool dotOnly;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (count <= 0) return const SizedBox.shrink();

    if (dotOnly) {
      return Container(
        width: 9,
        height: 9,
        decoration: BoxDecoration(
          color: theme.colorScheme.error,
          shape: BoxShape.circle,
          border: Border.all(color: theme.colorScheme.surface, width: 1.5),
        ),
      );
    }

    return Container(
      constraints: const BoxConstraints(minWidth: 19),
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
      alignment: Alignment.center,
      decoration: ShapeDecoration(color: theme.colorScheme.error, shape: const StadiumBorder()),
      child: Text(
        count > 99 ? '99+' : '$count',
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.onError,
          fontSize: 10.5,
          letterSpacing: 0,
          height: 1.2,
        ),
      ),
    );
  }
}

class _MoreSheetTile extends StatelessWidget {
  const _MoreSheetTile({
    required this.item,
    required this.active,
    required this.onTap,
    this.badgeCount = 0,
  });

  final NavItem item;
  final bool active;
  final VoidCallback onTap;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fg = active ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant;

    return Material(
      color: active
          ? theme.colorScheme.primaryContainer
          : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
      shape: appSquircle(
        AppRadii.lg,
        side: BorderSide(
          color: active ? theme.colorScheme.primary.withValues(alpha: 0.35) : Colors.transparent,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        customBorder: appSquircle(AppRadii.lg),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 12, 8),
          child: Row(
            children: [
              Container(
                width: 30,
                height: 30,
                alignment: Alignment.center,
                decoration: ShapeDecoration(
                  color: active
                      ? theme.colorScheme.surface.withValues(alpha: 0.75)
                      : theme.colorScheme.surface.withValues(alpha: 0.9),
                  shape: appSquircle(AppRadii.sm),
                ),
                child: Icon(item.icon, size: 17, color: fg),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Text(
                  item.label,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                    color: active ? theme.colorScheme.onPrimaryContainer : theme.colorScheme.onSurface,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (badgeCount > 0) ...[
                const SizedBox(width: 6),
                _UnreadBadge(count: badgeCount),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
