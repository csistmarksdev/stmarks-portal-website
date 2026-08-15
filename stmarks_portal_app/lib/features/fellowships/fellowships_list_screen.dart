import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/content.dart';
import '../../core/providers/providers.dart';
import '../../core/resource/resource_list_page.dart';
import '../../widgets/content_card.dart';
import 'fellowships_repository_provider.dart';

class FellowshipsListScreen extends ConsumerWidget {
  const FellowshipsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(fellowshipsRepositoryProvider);
    final can = ref.read(authControllerProvider.notifier).can;

    return ResourceListPage<Fellowship>(
      title: 'Fellowships',
      subtitle: 'Ministry groups and their committees.',
      repository: repo,
      paginated: false,
      idOf: (f) => f.id,
      statusOf: (f) => f.status,
      canWrite: can('content.write'),
      canDelete: can('content.delete'),
      canPublish: can('content.publish'),
      emptyIcon: Icons.groups_outlined,
      emptyTitle: 'No fellowships yet',
      emptyMessage: 'Create your first fellowship to show it on the website.',
      createLabel: 'New fellowship',
      deleteLabelOf: (f) => f.name.en,
      onCreate: () => context.push('/fellowships/new'),
      onEdit: (f) => context.push('/fellowships/${f.id}'),
      cardBuilder: (context, item, {required onEdit, required onDelete, statusMenu}) {
        return ContentCard(
          imageUrl: item.banner?.url,
          imageIcon: Icons.groups_outlined,
          title: item.name.en.isNotEmpty ? item.name.en : item.name.ta,
          metaRows: [
            if (item.tagline.en.isNotEmpty) MetaRow(icon: Icons.info_outline_rounded, text: item.tagline.en),
            MetaRow(icon: Icons.badge_outlined, text: '${item.committee.length} committee members'),
            if (item.memberCount != null)
              MetaRow(icon: Icons.people_alt_outlined, text: '${item.memberCount} members'),
          ],
          onEdit: onEdit,
          onDelete: onDelete,
          statusMenu: statusMenu,
        );
      },
    );
  }
}
