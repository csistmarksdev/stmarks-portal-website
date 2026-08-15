import '../models/common.dart';
import 'api_client.dart';

/// Generic CRUD repository for the Portal's repeated
/// `GET/POST/PATCH/DELETE /admin/<resource>` shape (events, blog, gallery,
/// announcements, downloads, fellowships all follow it — see docs/API.md).
class ResourceRepository<T> {
  ResourceRepository({required this.api, required this.basePath, required this.fromJson});

  final ApiClient api;
  final String basePath;
  final T Function(Map<String, dynamic>) fromJson;

  Future<Paginated<T>> list({
    int page = 1,
    int pageSize = 20,
    String? search,
    String? status,
    Map<String, dynamic>? extra,
  }) async {
    final json = await api.get<Map<String, dynamic>>(
      basePath,
      params: {'page': page, 'pageSize': pageSize, 'search': search, 'status': status, ...?extra},
    );
    return Paginated.fromJson(json, fromJson);
  }

  /// For resources whose admin list endpoint isn't paginated (fellowships).
  Future<List<T>> listAll({Map<String, dynamic>? extra}) async {
    final json = await api.get<dynamic>(basePath, params: extra);
    return (json as List<dynamic>).map((e) => fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<T> getOne(String id) async {
    final json = await api.get<Map<String, dynamic>>('$basePath/$id');
    return fromJson(json);
  }

  Future<T> create(Map<String, dynamic> body) async {
    final json = await api.post<Map<String, dynamic>>(basePath, data: body);
    return fromJson(json);
  }

  Future<T> update(String id, Map<String, dynamic> body) async {
    final json = await api.patch<Map<String, dynamic>>('$basePath/$id', data: body);
    return fromJson(json);
  }

  Future<void> remove(String id) => api.delete<dynamic>('$basePath/$id');

  Future<T> setStatus(String id, String status) async {
    final json = await api.patch<Map<String, dynamic>>('$basePath/$id/status', data: {'status': status});
    return fromJson(json);
  }
}
