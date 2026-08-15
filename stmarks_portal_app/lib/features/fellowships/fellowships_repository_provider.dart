import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/resource_repository.dart';
import '../../core/models/content.dart';
import '../../core/providers/providers.dart';

final fellowshipsRepositoryProvider = Provider<ResourceRepository<Fellowship>>((ref) {
  final api = ref.watch(apiClientProvider);
  return ResourceRepository<Fellowship>(api: api, basePath: '/admin/fellowships', fromJson: Fellowship.fromJson);
});
