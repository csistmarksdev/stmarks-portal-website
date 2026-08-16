import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/models/content.dart';
import '../../core/providers/providers.dart';
import '../../core/resource/resource_list_page.dart';
import '../../widgets/content_card.dart';
import 'blog_repository_provider.dart';

class BlogListScreen extends ConsumerWidget {
  const BlogListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(blogRepositoryProvider);
    final can = ref.read(authControllerProvider.notifier).can;

    return ResourceListPage<BlogPost>(
      title: 'Blog',
      subtitle:
          'Reports on events, reflections and testimonies from church life. Reading time is worked out automatically from the text.',
      repository: repo,
      idOf: (b) => b.id,
      statusOf: (b) => b.status,
      canWrite: can('content.write'),
      canDelete: can('content.delete'),
      canPublish: can('content.publish'),
      emptyIcon: LucideIcons.newspaper,
      emptyTitle: 'No stories written yet',
      emptyMessage: 'After the next event, write up how it went — posts can link back to the event they report on.',
      createLabel: 'New post',
      searchHint: 'Search by title…',
      deleteLabelOf: (b) => b.title.en,
      onCreate: () => context.push('/blog/new'),
      onEdit: (b) => context.push('/blog/${b.id}'),
      cardBuilder: (context, item, {required onEdit, required onDelete, statusMenu}) {
        final published = DateTime.tryParse(item.publishedAt);
        final fellowshipLabel = item.fellowshipSlug != null ? kFellowshipLabels[item.fellowshipSlug] : null;
        return ContentCard(
          imageUrl: item.coverImage?.url,
          imageIcon: LucideIcons.newspaper,
          title: item.title.en.isNotEmpty ? item.title.en : item.title.ta,
          badges: [if (fellowshipLabel != null) _FellowshipBadge(label: fellowshipLabel)],
          metaRows: [
            if (item.author.en.isNotEmpty) MetaRow(icon: LucideIcons.user, text: item.author.en),
            if (published != null) MetaRow(icon: LucideIcons.calendarDays, text: DateFormat('d MMM yyyy').format(published)),
            if (item.readingMinutes != null)
              MetaRow(icon: LucideIcons.clock, text: '${item.readingMinutes} min read'),
          ],
          onEdit: onEdit,
          onDelete: onDelete,
          statusMenu: statusMenu,
        );
      },
    );
  }
}

class _FellowshipBadge extends StatelessWidget {
  const _FellowshipBadge({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(999)),
      child: Text(
        label,
        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}
