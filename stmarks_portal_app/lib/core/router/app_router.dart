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
import '../../features/media/media_library_screen.dart';
import '../../features/roles/roles_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/shell/admin_shell.dart';
import '../../features/users/users_screen.dart';
import '../providers/providers.dart';
import 'providers_bridge.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

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
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => AdminShell(location: state.matchedLocation, child: child),
        routes: [
          GoRoute(path: '/dashboard', builder: (context, state) => const DashboardScreen()),

          GoRoute(
            path: '/events',
            builder: (context, state) => const EventsListScreen(),
            routes: [
              GoRoute(path: 'new', builder: (context, state) => const EventFormScreen()),
              GoRoute(path: ':id', builder: (context, state) => EventFormScreen(id: state.pathParameters['id'])),
            ],
          ),
          GoRoute(
            path: '/blog',
            builder: (context, state) => const BlogListScreen(),
            routes: [
              GoRoute(path: 'new', builder: (context, state) => const BlogFormScreen()),
              GoRoute(path: ':id', builder: (context, state) => BlogFormScreen(id: state.pathParameters['id'])),
            ],
          ),
          GoRoute(
            path: '/gallery',
            builder: (context, state) => const GalleryListScreen(),
            routes: [
              GoRoute(path: 'new', builder: (context, state) => const GalleryAlbumScreen()),
              GoRoute(path: ':id', builder: (context, state) => GalleryAlbumScreen(id: state.pathParameters['id'])),
            ],
          ),
          GoRoute(
            path: '/announcements',
            builder: (context, state) => const AnnouncementsListScreen(),
            routes: [
              GoRoute(path: 'new', builder: (context, state) => const AnnouncementFormScreen()),
              GoRoute(path: ':id', builder: (context, state) => AnnouncementFormScreen(id: state.pathParameters['id'])),
            ],
          ),
          GoRoute(
            path: '/downloads',
            builder: (context, state) => const DownloadsListScreen(),
            routes: [
              GoRoute(path: 'new', builder: (context, state) => const DownloadFormScreen()),
              GoRoute(path: ':id', builder: (context, state) => DownloadFormScreen(id: state.pathParameters['id'])),
            ],
          ),
          GoRoute(
            path: '/fellowships',
            builder: (context, state) => const FellowshipsListScreen(),
            routes: [
              GoRoute(path: 'new', builder: (context, state) => const FellowshipFormScreen()),
              GoRoute(path: ':id', builder: (context, state) => FellowshipFormScreen(id: state.pathParameters['id'])),
            ],
          ),

          GoRoute(
            path: '/church',
            builder: (context, state) => const ChurchLandingScreen(),
            routes: [
              GoRoute(path: 'service-timings', builder: (context, state) => const ServiceTimingsScreen()),
              GoRoute(path: 'pastor-message', builder: (context, state) => const PastorMessageScreen()),
              GoRoute(path: 'weekly-verse', builder: (context, state) => const WeeklyVerseScreen()),
            ],
          ),

          GoRoute(path: '/media', builder: (context, state) => const MediaLibraryScreen()),
          GoRoute(path: '/contact-messages', builder: (context, state) => const ContactMessagesScreen()),
          GoRoute(path: '/users', builder: (context, state) => const UsersScreen()),
          GoRoute(path: '/roles', builder: (context, state) => const RolesScreen()),
          GoRoute(path: '/audit-logs', builder: (context, state) => const AuditLogsScreen()),
          GoRoute(path: '/backup', builder: (context, state) => const BackupScreen()),
          GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
        ],
      ),
    ],
  );
});
