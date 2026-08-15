import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/resource_repository.dart';
import '../../core/models/content.dart';
import '../../core/providers/providers.dart';

final galleryRepositoryProvider = Provider<ResourceRepository<GalleryAlbum>>((ref) {
  final api = ref.watch(apiClientProvider);
  return ResourceRepository<GalleryAlbum>(api: api, basePath: '/admin/gallery', fromJson: GalleryAlbum.fromJson);
});
