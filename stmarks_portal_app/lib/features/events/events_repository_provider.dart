import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/resource_repository.dart';
import '../../core/models/content.dart';
import '../../core/providers/providers.dart';

final eventsRepositoryProvider = Provider<ResourceRepository<ChurchEvent>>((ref) {
  final api = ref.watch(apiClientProvider);
  return ResourceRepository<ChurchEvent>(api: api, basePath: '/admin/events', fromJson: ChurchEvent.fromJson);
});
