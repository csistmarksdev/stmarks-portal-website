import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/display/refresh_rate.dart';
import 'core/notifications/contact_watcher.dart';
import 'core/notifications/notification_service.dart';
import 'core/providers/providers.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/auth_controller.dart';

class PortalApp extends ConsumerStatefulWidget {
  const PortalApp({super.key});

  // Built once. `AppTheme.build` assembles a couple of dozen component
  // themes, and rebuilding both of them on every frame of a route transition
  // is pure waste.
  static final _light = AppTheme.light();
  static final _dark = AppTheme.dark();

  @override
  ConsumerState<PortalApp> createState() => _PortalAppState();
}

class _PortalAppState extends ConsumerState<PortalApp> {
  @override
  void initState() {
    super.initState();
    // After the first frame: a permission dialog should land on a drawn app,
    // not on a blank window during startup.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      // Needs a live window, so it waits for the first frame rather than
      // running in main().
      await RefreshRate.apply();
      await NotificationService.instance.init();
      NotificationService.instance.onOpenRoute = (route) {
        if (mounted) ref.read(appRouterProvider).go(route);
      };
      ref.read(contactWatcherProvider).start();

      // The login screen asks on a fresh sign-in, but a session restored from
      // storage never passes through it — without this, anyone already signed
      // in when the app updated would never be offered notifications at all.
      // Waits for the token restore to settle first.
      final auth = ref.read(authControllerProvider);
      if (!auth.loading && auth.isAuthenticated) {
        unawaited(NotificationService.instance.requestPermission());
      } else {
        late final ProviderSubscription<AuthState> sub;
        sub = ref.listenManual(authControllerProvider, (previous, next) {
          if (next.isAuthenticated) {
            sub.close();
            unawaited(NotificationService.instance.requestPermission());
          }
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    final themeModeString = ref.watch(themeModeProvider);
    final themeMode = switch (themeModeString) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };

    return MaterialApp.router(
      title: "CSI St. Mark's Portal",
      debugShowCheckedModeBanner: false,
      theme: PortalApp._light,
      darkTheme: PortalApp._dark,
      themeMode: themeMode,
      routerConfig: router,
      scrollBehavior: const _PortalScrollBehavior(),
      builder: (context, child) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
            statusBarBrightness: isDark ? Brightness.dark : Brightness.light,
            systemNavigationBarColor: Colors.transparent,
            systemNavigationBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
            systemNavigationBarDividerColor: Colors.transparent,
          ),
          child: MediaQuery.withClampedTextScaling(
            // Accessibility scaling is honoured, but a 2× system font would
            // burst the dock pill and the stat tiles; 1.3 is as far as the
            // layouts hold together.
            minScaleFactor: 0.85,
            maxScaleFactor: 1.3,
            child: child ?? const SizedBox.shrink(),
          ),
        );
      },
    );
  }
}

/// One scrolling feel across every platform.
class _PortalScrollBehavior extends MaterialScrollBehavior {
  const _PortalScrollBehavior();

  /// Lets the portal be dragged with a mouse or trackpad on desktop and web,
  /// where Flutter otherwise only accepts touch and the scroll wheel.
  @override
  Set<PointerDeviceKind> get dragDevices => {
        PointerDeviceKind.touch,
        PointerDeviceKind.mouse,
        PointerDeviceKind.trackpad,
        PointerDeviceKind.stylus,
      };

  /// Rubber-band overscroll and iOS deceleration everywhere, rather than
  /// Android's hard stop. It carries momentum further and settles more
  /// gently, which is most of what "smooth" means when a list is flung.
  /// [AlwaysScrollableScrollPhysics] as the parent keeps pull-to-refresh
  /// working on lists too short to scroll.
  @override
  ScrollPhysics getScrollPhysics(BuildContext context) =>
      const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics());

  /// The blue glow belongs to the clamping physics it was drawn for; with a
  /// rubber band there is nothing left for it to indicate.
  @override
  Widget buildOverscrollIndicator(BuildContext context, Widget child, ScrollableDetails details) => child;
}
