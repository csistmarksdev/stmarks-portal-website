import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/resource_repository.dart';
import '../../core/models/content.dart';
import '../../core/providers/providers.dart';

final downloadsRepositoryProvider = Provider<ResourceRepository<DownloadFile>>((ref) {
  final api = ref.watch(apiClientProvider);
  return ResourceRepository<DownloadFile>(api: api, basePath: '/admin/downloads', fromJson: DownloadFile.fromJson);
});
