import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/models/common.dart';
import '../../core/models/admin.dart';

class MediaRepository {
  MediaRepository(this.api);

  final ApiClient api;

  Future<Paginated<MediaItem>> list({int page = 1, int pageSize = 30, String? search, String? kind}) async {
    final json = await api.get<Map<String, dynamic>>(
      '/admin/media',
      params: {'page': page, 'pageSize': pageSize, 'search': search, 'kind': kind},
    );
    return Paginated.fromJson(json, MediaItem.fromJson);
  }

  Future<MediaItem> upload({
    required Uint8List bytes,
    required String filename,
    String? altEn,
    String? altTa,
    void Function(int sent, int total)? onProgress,
  }) async {
    final form = FormData.fromMap({
      'file': MultipartFile.fromBytes(bytes, filename: filename),
      if (altEn != null && altEn.isNotEmpty) 'altEn': altEn,
      if (altTa != null && altTa.isNotEmpty) 'altTa': altTa,
    });
    final json = await api.upload<Map<String, dynamic>>('/admin/media', form, onProgress: onProgress);
    return MediaItem.fromJson(json);
  }

  Future<MediaItem> videoPoster(String url) async {
    final json = await api.post<Map<String, dynamic>>('/admin/media/video-poster', data: {'url': url});
    return MediaItem.fromJson(json);
  }

  Future<MediaItem> updateAlt(String id, {required String altEn, required String altTa}) async {
    final json = await api.patch<Map<String, dynamic>>(
      '/admin/media/$id',
      data: {
        'alt': {'en': altEn, 'ta': altTa},
      },
    );
    return MediaItem.fromJson(json);
  }

  Future<void> remove(String id) => api.delete<dynamic>('/admin/media/$id');
}

ImageAsset mediaItemToImageAsset(MediaItem m) => ImageAsset(
  url: m.url,
  alt: m.alt ?? LocalizedText.empty,
  width: m.width ?? 0,
  height: m.height ?? 0,
  blurDataURL: m.blurDataURL,
);
