import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../storage/local_store.dart';
import '../../features/auth/auth_controller.dart';

/// Overridden in `main()` once the async [LocalStore] has been created.
final localStoreProvider = Provider<LocalStore>((ref) {
  throw UnimplementedError('localStoreProvider must be overridden in main()');
});

/// Bumped whenever the API base URL changes, so [apiClientProvider] (and
/// everything that depends on it) rebuilds with a fresh client.
final apiConfigVersionProvider = StateProvider<int>((ref) => 0);

final Provider<ApiClient> apiClientProvider = Provider<ApiClient>((ref) {
  ref.watch(apiConfigVersionProvider);
  final store = ref.watch(localStoreProvider);
  return ApiClient(
    store: store,
    onSessionExpired: () => ref.read(authControllerProvider.notifier).forceLogout(),
  );
});

final StateNotifierProvider<AuthController, AuthState> authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
      final api = ref.watch(apiClientProvider);
      final store = ref.watch(localStoreProvider);
      return AuthController(api, store);
    });

/// Light/dark/system theme preference, persisted via [LocalStore].
final themeModeProvider = StateProvider<String>((ref) {
  return ref.watch(localStoreProvider).themeMode;
});
