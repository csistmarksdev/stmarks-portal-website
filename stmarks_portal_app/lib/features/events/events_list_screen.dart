import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/models/content.dart';
import '../../core/resource/resource_list_page.dart';
import '../../widgets/content_card.dart';
import '../../core/providers/providers.dart';
import 'events_repository_provider.dart';

class EventsListScreen extends ConsumerWidget {
  const EventsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(eventsRepositoryProvider);
    final can = ref.read(authControllerProvider.notifier).can;

    return ResourceListPage<ChurchEvent>(
      title: 'Events',
      subtitle:
          "Services, festivals and gatherings. Published events appear on the website's events page; featured ones are highlighted on the home page.",
      repository: repo,
      idOf: (e) => e.id,
      statusOf: (e) => e.status,
      canWrite: can('content.write'),
      canDelete: can('content.delete'),
      canPublish: can('content.publish'),
      emptyIcon: LucideIcons.calendar,
      emptyTitle: 'No events on the calendar',
      emptyMessage: 'Add the next service or gathering and publish it when the details are settled.',
      createLabel: 'New event',
      searchHint: 'Search by title or slug…',
      deleteLabelOf: (e) => e.title.en,
      onCreate: () => context.push('/events/new'),
      onEdit: (e) => context.push('/events/${e.id}'),
      cardBuilder: (context, item, {required onEdit, required onDelete, statusMenu}) {
        final start = DateTime.tryParse(item.startDate);
        final fellowshipLabel = item.fellowshipSlug != null ? kFellowshipLabels[item.fellowshipSlug] : null;
        return ContentCard(
          imageUrl: item.image?.url,
          imageIcon: LucideIcons.calendar,
          title: item.title.en.isNotEmpty ? item.title.en : item.title.ta,
          badges: [if (item.featured) const _FeaturedBadge()],
          metaRows: [
            if (start != null) MetaRow(icon: LucideIcons.calendarDays, text: DateFormat('d MMM yyyy, h:mm a').format(start)),
            if (item.location.en.isNotEmpty) MetaRow(icon: LucideIcons.mapPin, text: item.location.en),
            if (fellowshipLabel != null) MetaRow(icon: LucideIcons.users, text: fellowshipLabel),
          ],
          onEdit: onEdit,
          onDelete: onDelete,
          statusMenu: statusMenu,
        );
      },
    );
  }
}

class _FeaturedBadge extends StatelessWidget {
  const _FeaturedBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(999)),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(LucideIcons.star, size: 12, color: Colors.white),
          SizedBox(width: 3),
          Text('Featured', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
