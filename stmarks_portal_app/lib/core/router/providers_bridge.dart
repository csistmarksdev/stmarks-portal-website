import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/providers.dart';
import '../../features/auth/auth_controller.dart';

final apiConfiguredProvider = Provider<bool>((ref) {
  return ref.watch(apiClientProvider).isConfigured;
});

class RouterRefreshNotifier extends ChangeNotifier {
  void ping() => notifyListeners();
}

/// Bridges Riverpod state changes (auth + API config) into a [Listenable]
/// go_router can use as `refreshListenable`, so navigation guards re-run
/// whenever sign-in state or the configured API URL changes.
final routerRefreshProvider = Provider<RouterRefreshNotifier>((ref) {
  final notifier = RouterRefreshNotifier();
  ref.listen<AuthState>(authControllerProvider, (prev, next) {
    if (prev?.isAuthenticated != next.isAuthenticated || prev?.loading != next.loading) {
      notifier.ping();
    }
  });
  ref.listen<int>(apiConfigVersionProvider, (prev, next) => notifier.ping());
  ref.onDispose(notifier.dispose);
  return notifier;
});
