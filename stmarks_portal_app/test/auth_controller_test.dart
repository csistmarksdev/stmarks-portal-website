import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:csi_portal/core/api/api_client.dart';
import 'package:csi_portal/core/models/admin.dart';
import 'package:csi_portal/core/storage/local_store.dart';
import 'package:csi_portal/features/auth/auth_controller.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AuthController & AuthState', () {
    late LocalStore store;
    late ApiClient api;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      store = await LocalStore.instance();
      api = ApiClient(store: store);
    });

    test('AuthState initial state and copyWith', () {
      const state = AuthState(loading: true);
      expect(state.isAuthenticated, isFalse);
      expect(state.loading, isTrue);
      expect(state.error, isNull);

      const user = AdminUser(
        id: '1',
        name: 'Admin',
        email: 'admin@test.com',
        role: 'super-admin',
        active: true,
        createdAt: '',
        updatedAt: '',
      );
      final loggedIn = state.copyWith(user: user, loading: false);
      expect(loggedIn.isAuthenticated, isTrue);
      expect(loggedIn.user?.name, 'Admin');

      final loggedOut = loggedIn.copyWith(clearUser: true);
      expect(loggedOut.isAuthenticated, isFalse);
    });

    test('restore with no API URL configured finishes loading unauthenticated', () async {
      final controller = AuthController(api, store);
      await controller.restore();
      expect(controller.state.loading, isFalse);
      expect(controller.state.isAuthenticated, isFalse);
    });

    test('can() permission checks based on current state user role', () async {
      final controller = AuthController(api, store);
      expect(controller.can('events.create'), isFalse);

      const user = AdminUser(
        id: '1',
        name: 'Editor User',
        email: 'ed@test.com',
        role: 'editor',
        active: true,
        createdAt: '',
        updatedAt: '',
      );
      controller.state = AuthState(user: user, loading: false);
      expect(controller.can('content.write'), isTrue);
      expect(controller.can('backup.restore'), isFalse);
    });

    test('forceLogout clears tokens and sets session expired error message', () async {
      await store.setTokens(accessToken: 'access_123', refreshToken: 'refresh_123');
      final controller = AuthController(api, store);

      await controller.forceLogout();
      expect(store.accessToken, isNull);
      expect(store.refreshToken, isNull);
      expect(controller.state.isAuthenticated, isFalse);
      expect(controller.state.error, contains('session has expired'));
    });
  });
}
