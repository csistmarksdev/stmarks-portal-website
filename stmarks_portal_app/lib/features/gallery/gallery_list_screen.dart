import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/models/content.dart';
import '../../core/providers/providers.dart';
import '../../core/resource/resource_list_page.dart';
import '../../widgets/content_card.dart';
import 'gallery_repository_provider.dart';

class GalleryListScreen extends ConsumerWidget {
  const GalleryListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(galleryRepositoryProvider);
    final can = ref.read(authControllerProvider.notifier).can;

    return ResourceListPage<GalleryAlbum>(
      title: 'Gallery',
      subtitle: 'Photo and video albums shown on the website.',
      repository: repo,
      idOf: (a) => a.id,
      statusOf: (a) => a.status,
      canWrite: can('content.write'),
      canDelete: can('content.delete'),
      canPublish: can('content.publish'),
      emptyIcon: LucideIcons.images,
      emptyTitle: 'No albums yet',
      emptyMessage: 'Create your first album to show it on the website.',
      createLabel: 'New album',
      deleteLabelOf: (a) => a.title.en,
      onCreate: () => context.push('/gallery/new'),
      onEdit: (a) => context.push('/gallery/${a.id}'),
      cardBuilder: (context, item, {required onEdit, required onDelete, statusMenu}) {
        final date = DateTime.tryParse(item.date);
        final fellowshipLabel = item.fellowshipSlug != null ? kFellowshipLabels[item.fellowshipSlug] : null;
        return ContentCard(
          imageUrl: item.cover?.url,
          imageIcon: LucideIcons.images,
          title: item.title.en.isNotEmpty ? item.title.en : item.title.ta,
          badges: [
            if (item.shared == true)
              const _ChipBadge(icon: LucideIcons.globe, label: 'Shared')
            else if (fellowshipLabel != null)
              _ChipBadge(icon: LucideIcons.users, label: fellowshipLabel),
          ],
          metaRows: [
            if (date != null) MetaRow(icon: LucideIcons.calendarDays, text: DateFormat('d MMM yyyy').format(date)),
            MetaRow(icon: LucideIcons.image, text: '${item.photos.length} items'),
          ],
          onEdit: onEdit,
          onDelete: onDelete,
          statusMenu: statusMenu,
        );
      },
    );
  }
}

class _ChipBadge extends StatelessWidget {
  const _ChipBadge({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: Colors.white),
          const SizedBox(width: 3),
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
