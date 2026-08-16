import 'package:flutter/cupertino.dart' show CupertinoPage;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/announcements/announcement_form_screen.dart';
import '../../features/announcements/announcements_list_screen.dart';
import '../../features/audit/audit_logs_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/backup/backup_screen.dart';
import '../../features/blog/blog_form_screen.dart';
import '../../features/blog/blog_list_screen.dart';
import '../../features/church/church_landing_screen.dart';
import '../../features/church/pastor_message_screen.dart';
import '../../features/church/service_timings_screen.dart';
import '../../features/church/weekly_verse_screen.dart';
import '../../features/connect/connect_screen.dart';
import '../../features/contact/contact_messages_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/downloads/download_form_screen.dart';
import '../../features/downloads/downloads_list_screen.dart';
import '../../features/events/event_form_screen.dart';
import '../../features/events/events_list_screen.dart';
import '../../features/fellowships/fellowship_form_screen.dart';
import '../../features/fellowships/fellowships_list_screen.dart';
import '../../features/gallery/gallery_album_screen.dart';
import '../../features/gallery/gallery_list_screen.dart';
import '../../features/legal/legal_documents.dart';
import '../../features/legal/legal_screen.dart';
import '../../features/media/media_library_screen.dart';
import '../../features/roles/roles_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/shell/admin_shell.dart';
import '../../features/users/users_screen.dart';
import '../theme/app_theme.dart';
import '../providers/providers.dart';
import 'providers_bridge.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

/// Builds a shell page that fades and settles into place.
///
/// The transition belongs here, inside the shell's own Navigator, and not in
/// [AdminShell]. The `child` handed to a `ShellRoute` builder is go_router's
/// navigator, and it carries a `GlobalObjectKey`; wrapping that in an
/// `AnimatedSwitcher` keyed on the location makes Flutter reparent the
/// navigator element into the incoming subtree, so the outgoing page blanks
/// out for a frame before it fades — the flicker between screens. Animating
/// the individual pages instead leaves the navigator alone entirely.
///
/// The [ColoredBox] matters too: pages are transparent scroll views, so
/// without an opaque backing a cross-fade shows the scaffold straight through
/// the middle of the transition.
CustomTransitionPage<void> _fadeThroughPage(GoRouterState state, Widget child) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    transitionDuration: const Duration(milliseconds: 260),
    reverseTransitionDuration: const Duration(milliseconds: 180),
    child: Builder(
      builder: (context) => ColoredBox(color: Theme.of(context).scaffoldBackgroundColor, child: child),
    ),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final eased = CurvedAnimation(parent: animation, curve: appEaseOutExpo);
      return FadeTransition(
        opacity: eased,
        child: SlideTransition(
          // A short settle rather than a slide — direction without drama.
          position: Tween(begin: const Offset(0, 0.012), end: Offset.zero).animate(eased),
          child: child,
        ),
      );
    },
  );
}

/// Detail and form screens push in from the trailing edge and can be dragged
/// back, the way a stack of screens behaves on iOS. Used for everything that
/// sits *inside* a destination (an event's form, a gallery album) as opposed
/// to the destinations themselves, which cross-fade.
CupertinoPage<void> _pushPage(GoRouterState state, Widget child) =>
    CupertinoPage<void>(key: state.pageKey, child: child);

/// Resolves `:slug` to a document, falling back to the privacy policy rather
/// than erroring out on a stale or mistyped link.
LegalDocument _legalBySlug(GoRouterState state) {
  final slug = state.pathParameters['slug'];
  return legalDocuments.firstWhere((d) => d.slug == slug, orElse: () => privacyPolicy);
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final refreshNotifier = ref.watch(routerRefreshProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/dashboard',
    refreshListenable: refreshNotifier,
    redirect: (context, state) {
      final apiConfigured = ref.read(apiConfiguredProvider);
      final auth = ref.read(authControllerProvider);
      final loc = state.matchedLocation;
      // Legal text is readable at any time, signed in or not, configured or not.
      if (loc.startsWith('/legal-public/')) return null;
      final atConnect = loc == '/connect';
      final atLogin = loc == '/login';

      if (!apiConfigured) {
        return atConnect ? null : '/connect';
      }
      if (auth.loading) return null;
      if (!auth.isAuthenticated) {
        return atLogin ? null : '/login';
      }
      if (atLogin || atConnect) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/connect', builder: (context, state) => const ConnectScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      // Also mounted outside the shell: the policy has to be readable before
      // anyone has an account to sign in with. The redirect below lets these
      // two paths through unauthenticated.
      GoRoute(
        path: '/legal-public/:slug',
        builder: (context, state) => Scaffold(body: SafeArea(child: LegalScreen(document: _legalBySlug(state)))),
      ),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => AdminShell(location: state.matchedLocation, child: child),
        routes: [
          GoRoute(path: '/dashboard', pageBuilder: (context, state) => _fadeThroughPage(state, const DashboardScreen())),

          GoRoute(
            path: '/events',
            pageBuilder: (context, state) => _fadeThroughPage(state, const EventsListScreen()),
            routes: [
              GoRoute(path: 'new', pageBuilder: (context, state) => _pushPage(state, const EventFormScreen())),
              GoRoute(path: ':id', pageBuilder: (context, state) => _pushPage(state, EventFormScreen(id: state.pathParameters['id']))),
            ],
          ),
          GoRoute(
            path: '/blog',
            pageBuilder: (context, state) => _fadeThroughPage(state, const BlogListScreen()),
            routes: [
              GoRoute(path: 'new', pageBuilder: (context, state) => _pushPage(state, const BlogFormScreen())),
              GoRoute(path: ':id', pageBuilder: (context, state) => _pushPage(state, BlogFormScreen(id: state.pathParameters['id']))),
            ],
          ),
          GoRoute(
            path: '/gallery',
            pageBuilder: (context, state) => _fadeThroughPage(state, const GalleryListScreen()),
            routes: [
              GoRoute(path: 'new', pageBuilder: (context, state) => _pushPage(state, const GalleryAlbumScreen())),
              GoRoute(path: ':id', pageBuilder: (context, state) => _pushPage(state, GalleryAlbumScreen(id: state.pathParameters['id']))),
            ],
          ),
          GoRoute(
            path: '/announcements',
            pageBuilder: (context, state) => _fadeThroughPage(state, const AnnouncementsListScreen()),
            routes: [
              GoRoute(path: 'new', pageBuilder: (context, state) => _pushPage(state, const AnnouncementFormScreen())),
              GoRoute(path: ':id', pageBuilder: (context, state) => _pushPage(state, AnnouncementFormScreen(id: state.pathParameters['id']))),
            ],
          ),
          GoRoute(
            path: '/downloads',
            pageBuilder: (context, state) => _fadeThroughPage(state, const DownloadsListScreen()),
            routes: [
              GoRoute(path: 'new', pageBuilder: (context, state) => _pushPage(state, const DownloadFormScreen())),
              GoRoute(path: ':id', pageBuilder: (context, state) => _pushPage(state, DownloadFormScreen(id: state.pathParameters['id']))),
            ],
          ),
          GoRoute(
            path: '/fellowships',
            pageBuilder: (context, state) => _fadeThroughPage(state, const FellowshipsListScreen()),
            routes: [
              GoRoute(path: 'new', pageBuilder: (context, state) => _pushPage(state, const FellowshipFormScreen())),
              GoRoute(path: ':id', pageBuilder: (context, state) => _pushPage(state, FellowshipFormScreen(id: state.pathParameters['id']))),
            ],
          ),

          GoRoute(
            path: '/church',
            pageBuilder: (context, state) => _fadeThroughPage(state, const ChurchLandingScreen()),
            routes: [
              GoRoute(path: 'service-timings', pageBuilder: (context, state) => _pushPage(state, const ServiceTimingsScreen())),
              GoRoute(path: 'pastor-message', pageBuilder: (context, state) => _pushPage(state, const PastorMessageScreen())),
              GoRoute(path: 'weekly-verse', pageBuilder: (context, state) => _pushPage(state, const WeeklyVerseScreen())),
            ],
          ),

          GoRoute(path: '/media', pageBuilder: (context, state) => _fadeThroughPage(state, const MediaLibraryScreen())),
          GoRoute(path: '/contact-messages', pageBuilder: (context, state) => _fadeThroughPage(state, const ContactMessagesScreen())),
          GoRoute(path: '/users', pageBuilder: (context, state) => _fadeThroughPage(state, const UsersScreen())),
          GoRoute(path: '/roles', pageBuilder: (context, state) => _fadeThroughPage(state, const RolesScreen())),
          GoRoute(path: '/audit-logs', pageBuilder: (context, state) => _fadeThroughPage(state, const AuditLogsScreen())),
          GoRoute(path: '/backup', pageBuilder: (context, state) => _fadeThroughPage(state, const BackupScreen())),
          GoRoute(path: '/settings', pageBuilder: (context, state) => _fadeThroughPage(state, const SettingsScreen())),
          GoRoute(
            path: '/legal/:slug',
            pageBuilder: (context, state) => _pushPage(state, LegalScreen(document: _legalBySlug(state))),
          ),
        ],
      ),
    ],
  );
});
