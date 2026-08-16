import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/models/content.dart';
import '../../core/providers/providers.dart';
import '../../core/resource/resource_list_page.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/content_card.dart';
import 'announcements_repository_provider.dart';

class AnnouncementsListScreen extends ConsumerStatefulWidget {
  const AnnouncementsListScreen({super.key});

  @override
  ConsumerState<AnnouncementsListScreen> createState() => _AnnouncementsListScreenState();
}

class _AnnouncementsListScreenState extends ConsumerState<AnnouncementsListScreen> {
  int _refreshToken = 0;

  Future<void> _togglePin(Announcement a) async {
    final api = ref.read(apiClientProvider);
    try {
      await api.patch<dynamic>('/admin/announcements/${a.id}/pin', data: {'pinned': !a.pinned});
      setState(() => _refreshToken++);
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Could not update pin — $e', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final repo = ref.watch(announcementsRepositoryProvider);
    final can = ref.read(authControllerProvider.notifier).can;

    return ResourceListPage<Announcement>(
      key: ValueKey('announcements-$_refreshToken'),
      title: 'Announcements',
      subtitle:
          'Parish notices, in the order the congregation sees them — the pinned one leads, then newest first. Only one can be pinned at a time.',
      repository: repo,
      idOf: (a) => a.id,
      statusOf: (a) => a.status,
      canWrite: can('content.write'),
      canDelete: can('content.delete'),
      canPublish: can('content.publish'),
      emptyIcon: LucideIcons.bell,
      emptyTitle: 'No notices posted',
      emptyMessage: 'Share what the congregation should know — pin the most important one to keep it on top.',
      createLabel: 'New announcement',
      searchHint: 'Search notices…',
      deleteLabelOf: (a) => a.title.en,
      onCreate: () => context.push('/announcements/new'),
      onEdit: (a) => context.push('/announcements/${a.id}'),
      cardBuilder: (context, item, {required onEdit, required onDelete, statusMenu}) {
        final published = DateTime.tryParse(item.publishedAt);
        return ContentCard(
          imageIcon: LucideIcons.bell,
          title: item.title.en.isNotEmpty ? item.title.en : item.title.ta,
          badges: [
            if (item.pinned)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(999)),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(LucideIcons.pin, size: 12, color: Colors.white),
                    SizedBox(width: 3),
                    Text('Pinned', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
          ],
          metaRows: [
            if (published != null) MetaRow(icon: LucideIcons.calendarDays, text: DateFormat('d MMM yyyy').format(published)),
            MetaRow(icon: LucideIcons.alignLeft, text: item.body.en),
          ],
          onEdit: onEdit,
          onDelete: onDelete,
          statusMenu: statusMenu,
          footerExtra: IconButton(
            tooltip: item.pinned ? 'Unpin' : 'Pin to top',
            icon: Icon(item.pinned ? LucideIcons.pin : LucideIcons.pin, size: 19),
            onPressed: can('content.write') ? () => _togglePin(item) : null,
          ),
        );
      },
    );
  }
}
