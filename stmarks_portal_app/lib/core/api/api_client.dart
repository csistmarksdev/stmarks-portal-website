import 'dart:async';

import 'package:dio/dio.dart';

import '../storage/local_store.dart';
import 'api_exception.dart';

/// HTTP client for the Portal API.
///
/// Mirrors `frontend/src/lib/api.ts`: the base URL is resolved at call time
/// (not baked in), a bearer token is attached from local storage, and a 401
/// triggers a single-flight refresh + one retry before the session is
/// considered expired. `/auth/login`, `/auth/refresh` and `/auth/logout`
/// never trigger a refresh themselves.
class ApiClient {
  ApiClient({required this.store, this.onSessionExpired}) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          options.baseUrl = baseUrl;
          final access = store.accessToken;
          if (access != null && access.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $access';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final path = error.requestOptions.path;
          final refreshable = !_noRefreshEndpoints.any((p) => path.startsWith(p));
          final alreadyRetried = error.requestOptions.extra['retried'] == true;

          if (error.response?.statusCode == 401 && refreshable && !alreadyRetried) {
            final refreshed = await _tryRefresh();
            if (refreshed) {
              final opts = error.requestOptions;
              opts.extra['retried'] = true;
              opts.headers['Authorization'] = 'Bearer ${store.accessToken}';
              try {
                final response = await dio.fetch(opts);
                return handler.resolve(response);
              } on DioException catch (e) {
                return handler.next(e);
              }
            }
            await store.clearTokens();
            onSessionExpired?.call();
          }
          handler.next(error);
        },
      ),
    );
  }

  final LocalStore store;
  final VoidCallback? onSessionExpired;
  final Dio dio = Dio(
    BaseOptions(connectTimeout: const Duration(seconds: 20), receiveTimeout: const Duration(seconds: 60)),
  );

  static const _noRefreshEndpoints = ['/auth/login', '/auth/refresh', '/auth/logout'];

  /// Normalized base URL, e.g. `http://192.168.1.5:4000/v1` — no trailing
  /// slash. Empty when the user hasn't configured one yet.
  String get baseUrl {
    final configured = store.apiBaseUrl?.trim();
    if (configured == null || configured.isEmpty) return '';
    return configured.replaceAll(RegExp(r'/+$'), '');
  }

  bool get isConfigured => baseUrl.isNotEmpty;

  Completer<bool>? _refreshCompleter;

  Future<bool> _tryRefresh() {
    final existing = _refreshCompleter;
    if (existing != null) return existing.future;

    final completer = Completer<bool>();
    _refreshCompleter = completer;

    () async {
      try {
        final refreshToken = store.refreshToken;
        if (refreshToken == null || refreshToken.isEmpty) {
          completer.complete(false);
          return;
        }
        final response = await Dio(BaseOptions(baseUrl: baseUrl)).post<Map<String, dynamic>>(
          '/auth/refresh',
          data: {'refreshToken': refreshToken},
        );
        final data = response.data!;
        await store.setTokens(
          accessToken: data['accessToken'] as String,
          refreshToken: data['refreshToken'] as String,
        );
        completer.complete(true);
      } catch (_) {
        completer.complete(false);
      } finally {
        _refreshCompleter = null;
      }
    }();

    return completer.future;
  }

  Map<String, dynamic>? _cleanParams(Map<String, dynamic>? params) {
    if (params == null) return null;
    final out = <String, dynamic>{};
    for (final entry in params.entries) {
      if (entry.value == null) continue;
      if (entry.value is String && (entry.value as String).isEmpty) continue;
      out[entry.key] = entry.value;
    }
    return out.isEmpty ? null : out;
  }

  ApiException _toApiException(DioException e, String endpoint) {
    final status = e.response?.statusCode ?? 0;
    String message = status == 0 ? 'Could not reach the server — check the API URL and connection' : 'Request failed with $status';
    final body = e.response?.data;
    if (body is Map<String, dynamic> && body['message'] != null) {
      final m = body['message'];
      message = m is List ? m.join('; ') : m.toString();
    }
    return ApiException(message, statusCode: status, endpoint: endpoint);
  }

  void _requireConfigured() {
    if (!isConfigured) {
      throw ApiException('Set the API base URL in Settings before continuing.');
    }
  }

  Future<T> get<T>(String path, {Map<String, dynamic>? params}) async {
    _requireConfigured();
    try {
      final response = await dio.get<T>(path, queryParameters: _cleanParams(params));
      return response.data as T;
    } on DioException catch (e) {
      throw _toApiException(e, path);
    }
  }

  Future<T> post<T>(String path, {dynamic data}) async {
    _requireConfigured();
    try {
      final response = await dio.post<T>(path, data: data);
      return response.data as T;
    } on DioException catch (e) {
      throw _toApiException(e, path);
    }
  }

  Future<T> put<T>(String path, {dynamic data}) async {
    _requireConfigured();
    try {
      final response = await dio.put<T>(path, data: data);
      return response.data as T;
    } on DioException catch (e) {
      throw _toApiException(e, path);
    }
  }

  Future<T> patch<T>(String path, {dynamic data}) async {
    _requireConfigured();
    try {
      final response = await dio.patch<T>(path, data: data);
      return response.data as T;
    } on DioException catch (e) {
      throw _toApiException(e, path);
    }
  }

  Future<T?> delete<T>(String path) async {
    _requireConfigured();
    try {
      final response = await dio.delete<T>(path);
      return response.data;
    } on DioException catch (e) {
      throw _toApiException(e, path);
    }
  }

  Future<T> upload<T>(
    String path,
    FormData formData, {
    void Function(int sent, int total)? onProgress,
  }) async {
    _requireConfigured();
    try {
      final response = await dio.post<T>(
        path,
        data: formData,
        onSendProgress: onProgress,
      );
      return response.data as T;
    } on DioException catch (e) {
      throw _toApiException(e, path);
    }
  }

  /// Builds an absolute URL for a relative API path — used for `<img>`-style
  /// widgets and the backup download link.
  String absoluteUrl(String path) {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (!isConfigured) return path;
    // Media/file URLs are usually relative to the API's origin, not the
    // `/v1` prefix, so strip a trailing `/v1` (or configured prefix) before
    // joining.
    final origin = baseUrl.replaceFirst(RegExp(r'/(v1|api)/?$'), '');
    if (path.startsWith('/')) return '$origin$path';
    return '$origin/$path';
  }
}

typedef VoidCallback = void Function();
