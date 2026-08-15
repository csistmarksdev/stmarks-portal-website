import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/models/admin.dart';
import '../../core/storage/local_store.dart';

class AuthState {
  const AuthState({this.user, this.loading = true, this.error});

  final AdminUser? user;
  final bool loading;
  final String? error;

  bool get isAuthenticated => user != null;

  AuthState copyWith({AdminUser? user, bool? loading, String? error, bool clearUser = false, bool clearError = false}) {
    return AuthState(
      user: clearUser ? null : (user ?? this.user),
      loading: loading ?? this.loading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._api, this._store) : super(const AuthState(loading: true)) {
    restore();
  }

  final ApiClient _api;
  final LocalStore _store;

  Future<void> restore() async {
    state = state.copyWith(loading: true, clearError: true);
    if (!_api.isConfigured) {
      state = const AuthState(loading: false);
      return;
    }
    final access = _store.accessToken;
    final refresh = _store.refreshToken;
    if ((access == null || access.isEmpty) && (refresh == null || refresh.isEmpty)) {
      state = const AuthState(loading: false);
      return;
    }
    try {
      final json = await _api.get<Map<String, dynamic>>('/auth/me');
      state = AuthState(user: AdminUser.fromJson(json), loading: false);
    } catch (_) {
      await _store.clearTokens();
      state = const AuthState(loading: false);
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final json = await _api.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'email': email, 'password': password},
      );
      await _store.setTokens(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String,
      );
      state = AuthState(user: AdminUser.fromJson(json['user'] as Map<String, dynamic>), loading: false);
    } on ApiException catch (e) {
      state = state.copyWith(loading: false, error: e.message);
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await _api.post<dynamic>('/auth/logout');
    } catch (_) {
      // Best-effort — proceed with local logout regardless.
    }
    await _store.clearTokens();
    state = const AuthState(loading: false);
  }

  /// Called by [ApiClient] when a refresh attempt fails outright.
  Future<void> forceLogout() async {
    await _store.clearTokens();
    state = const AuthState(loading: false, error: 'Your session has expired — sign in again.');
  }

  Future<void> updateName(String name) async {
    final json = await _api.patch<Map<String, dynamic>>('/auth/me', data: {'name': name});
    state = state.copyWith(user: AdminUser.fromJson(json));
  }

  Future<void> changePassword({required String currentPassword, required String newPassword}) {
    return _api.post<dynamic>(
      '/auth/change-password',
      data: {'currentPassword': currentPassword, 'newPassword': newPassword},
    );
  }

  bool can(String permission) {
    final role = state.user?.role;
    if (role == null) return false;
    return kRolePermissions[role]?.contains(permission) ?? false;
  }
}
