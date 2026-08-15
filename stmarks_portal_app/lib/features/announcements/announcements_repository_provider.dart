import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/resource_repository.dart';
import '../../core/models/content.dart';
import '../../core/providers/providers.dart';

final announcementsRepositoryProvider = Provider<ResourceRepository<Announcement>>((ref) {
  final api = ref.watch(apiClientProvider);
  return ResourceRepository<Announcement>(api: api, basePath: '/admin/announcements', fromJson: Announcement.fromJson);
});
