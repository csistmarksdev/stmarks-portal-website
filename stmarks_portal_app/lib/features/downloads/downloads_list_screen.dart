import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/models/content.dart';
import '../../core/resource/resource_list_page.dart';
import '../../widgets/content_card.dart';
import '../../core/providers/providers.dart';
import 'downloads_repository_provider.dart';

const _categoryLabels = {'bulletin': 'Bulletin', 'form': 'Form', 'document': 'Document'};

class DownloadsListScreen extends ConsumerStatefulWidget {
  const DownloadsListScreen({super.key});

  @override
  ConsumerState<DownloadsListScreen> createState() => _DownloadsListScreenState();
}

class _DownloadsListScreenState extends ConsumerState<DownloadsListScreen> {
  String? _category;

  @override
  Widget build(BuildContext context) {
    final repo = ref.watch(downloadsRepositoryProvider);
    final can = ref.read(authControllerProvider.notifier).can;

    return ResourceListPage<DownloadFile>(
      key: ValueKey('downloads-${_category ?? 'all'}'),
      title: 'Downloads',
      subtitle: 'Sunday bulletins, application forms and church documents. File size and format come from the upload itself.',
      repository: repo,
      idOf: (d) => d.id,
      statusOf: (d) => d.status,
      canWrite: can('content.write'),
      canDelete: can('content.delete'),
      canPublish: can('content.publish'),
      emptyIcon: LucideIcons.download,
      emptyTitle: 'Nothing to hand out yet',
      emptyMessage: "Upload this week's bulletin or a form to the media library, then list it here for the congregation.",
      createLabel: 'New download',
      searchHint: 'Search files…',
      deleteLabelOf: (d) => d.title.en,
      extraParams: () => {'category': _category},
      extraFilterBar: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            for (final entry in {null: 'All', ..._categoryLabels}.entries)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(entry.value),
                  selected: _category == entry.key,
                  onSelected: (_) => setState(() => _category = entry.key),
                ),
              ),
          ],
        ),
      ),
      onCreate: () => context.push('/downloads/new'),
      onEdit: (d) => context.push('/downloads/${d.id}'),
      cardBuilder: (context, item, {required onEdit, required onDelete, statusMenu}) {
        final published = DateTime.tryParse(item.publishedAt);
        return ContentCard(
          imageIcon: item.category == 'bulletin' ? LucideIcons.bookOpen : LucideIcons.fileText,
          title: item.title.en.isNotEmpty ? item.title.en : item.title.ta,
          badges: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(999)),
              child: Text(
                _categoryLabels[item.category] ?? item.category,
                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
              ),
            ),
          ],
          metaRows: [
            MetaRow(icon: LucideIcons.file, text: '${item.format} · ${item.size}'),
            if (published != null) MetaRow(icon: LucideIcons.calendarDays, text: DateFormat('d MMM yyyy').format(published)),
          ],
          onEdit: onEdit,
          onDelete: onDelete,
          statusMenu: statusMenu,
        );
      },
    );
  }
}
