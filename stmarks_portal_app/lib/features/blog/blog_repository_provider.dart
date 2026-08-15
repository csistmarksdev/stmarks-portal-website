import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/resource_repository.dart';
import '../../core/models/content.dart';
import '../../core/providers/providers.dart';

final blogRepositoryProvider = Provider<ResourceRepository<BlogPost>>((ref) {
  final api = ref.watch(apiClientProvider);
  return ResourceRepository<BlogPost>(api: api, basePath: '/admin/blog', fromJson: BlogPost.fromJson);
});
