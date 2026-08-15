import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:csi_portal/app.dart';
import 'package:csi_portal/core/models/admin.dart';
import 'package:csi_portal/core/providers/providers.dart';
import 'package:csi_portal/core/storage/local_store.dart';
import 'package:csi_portal/features/auth/auth_controller.dart';
import 'package:csi_portal/features/dashboard/dashboard_data.dart';

class TestAuthController extends AuthController {
  TestAuthController(super.api, super.store, AdminUser user) {
    state = AuthState(user: user, loading: false);
  }

  @override
  Future<void> restore() async {}
}

class TestUnauthController extends AuthController {
  TestUnauthController(super.api, super.store) {
    state = const AuthState(loading: false);
  }

  @override
  Future<void> restore() async {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Router Redirect Logic', () {
    late LocalStore store;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      store = await LocalStore.instance();
      await store.setApiBaseUrl(null);
      await store.clearTokens();
    });

    testWidgets('boots to connect screen when API URL is not set', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [localStoreProvider.overrideWithValue(store)],
          child: const PortalApp(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Connect to your Portal'), findsOneWidget);
      expect(find.text('API base URL'), findsOneWidget);
    });

    testWidgets('redirects to login screen when API URL is set but user is unauthenticated', (tester) async {
      await store.setApiBaseUrl('http://192.168.1.5:4000/v1');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            localStoreProvider.overrideWithValue(store),
            authControllerProvider.overrideWith((ref) {
              final api = ref.watch(apiClientProvider);
              return TestUnauthController(api, store);
            }),
          ],
          child: const PortalApp(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Welcome back'), findsOneWidget);
      expect(find.widgetWithText(FilledButton, 'Sign in'), findsOneWidget);
    });

    testWidgets('shows dashboard when API URL is set and user is authenticated', (tester) async {
      await store.setApiBaseUrl('http://192.168.1.5:4000/v1');
      await store.setTokens(accessToken: 'mock_access_token', refreshToken: 'mock_refresh_token');

      const mockUser = AdminUser(
        id: 'usr_admin',
        name: 'Admin User',
        email: 'admin@csistmarks.org',
        role: 'super-admin',
        active: true,
        createdAt: '',
        updatedAt: '',
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            localStoreProvider.overrideWithValue(store),
            authControllerProvider.overrideWith((ref) {
              final api = ref.watch(apiClientProvider);
              return TestAuthController(api, store, mockUser);
            }),
            dashboardDataProvider.overrideWith((ref) async => const DashboardData(
              stats: DashboardStats({}),
              upcomingEvents: [],
              recentAudit: [],
            )),
          ],
          child: const PortalApp(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text("Here's what the congregation is seeing on the website today."), findsOneWidget);
    });
  });
}
