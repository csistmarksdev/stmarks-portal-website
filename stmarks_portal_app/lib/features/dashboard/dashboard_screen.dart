import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/models/content.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/app_theme_extension.dart';
import '../../widgets/app_surface.dart';
import '../../widgets/empty_state.dart';
import 'dashboard_data.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final auth = ref.watch(authControllerProvider);
    final dataAsync = ref.watch(dashboardDataProvider);
    final hour = DateTime.now().hour;
    // Mirrors the web dashboard's `greeting()` — before 5am reads as the same
    // evening to anyone still awake in it, not a new morning.
    final greeting = hour < 5
        ? 'Good evening'
        : hour < 12
            ? 'Good morning'
            : hour < 17
                ? 'Good afternoon'
                : 'Good evening';
    final today = DateFormat('EEEE, d MMMM y').format(DateTime.now());
    final nameParts = auth.user?.name.split(' ') ?? const [];
    final firstName = nameParts.isNotEmpty ? nameParts.first : '';

    return RefreshIndicator(
      // The list starts at y=0 under the floating bar, so the spinner has
      // to be pushed clear of it.
      edgeOffset: MediaQuery.paddingOf(context).top,
      onRefresh: () => ref.refresh(dashboardDataProvider.future),
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: EdgeInsets.fromLTRB(20, appPageTop(context, 20), 20, 8),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    today.toUpperCase(),
                    style: theme.textTheme.labelMedium?.copyWith(color: context.semanticColors.accentForeground),
                  ),
                  const SizedBox(height: 6),
                  Text('$greeting${firstName.isNotEmpty ? ', $firstName' : ''}.', style: theme.textTheme.headlineMedium),
                  const SizedBox(height: 4),
                  Text(
                    "Here's what the congregation is seeing on the website today.",
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            sliver: SliverToBoxAdapter(
              child: dataAsync.when(
                loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 60), child: Center(child: CircularProgressIndicator())),
                error: (e, _) => ErrorRetryState(message: 'Could not load the dashboard — $e', onRetry: () => ref.refresh(dashboardDataProvider)),
                data: (data) => _DashboardBody(data: data),
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: kFloatingDockHeight + 24)),
        ],
      ),
    );
  }
}

class _DashboardBody extends ConsumerWidget {
  const _DashboardBody({required this.data});

  final DashboardData data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final can = ref.read(authControllerProvider.notifier).can;
    final stats = data.stats;

    final eventDrafts = stats.events.get('total') - stats.events.get('published');
    final blogDrafts = stats.blog.get('total') - stats.blog.get('published');
    final unread = stats.contact.get('unread');
    final announcementsPinned = stats.announcements.get('pinned');
    final announcementsTotal = stats.announcements.get('total');

    // Exact wording — and exact conditions — from the web dashboard's
    // "Needs attention" list, including the easy-to-miss fourth condition:
    // an announcement total with nothing currently pinned.
    final needsAttention = <_ActionItem>[
      if (unread > 0)
        _ActionItem(
          icon: LucideIcons.inbox,
          label: unread == 1 ? '1 contact message is waiting for a reply' : '$unread contact messages are waiting for a reply',
          route: '/contact-messages',
        ),
      if (eventDrafts > 0)
        _ActionItem(
          icon: LucideIcons.squarePen,
          label: eventDrafts == 1 ? '1 event is written but not yet published' : '$eventDrafts events are written but not yet published',
          route: '/events',
        ),
      if (blogDrafts > 0)
        _ActionItem(
          icon: LucideIcons.squarePen,
          label: blogDrafts == 1 ? '1 blog post is still a draft' : '$blogDrafts blog posts are still drafts',
          route: '/blog',
        ),
      if (announcementsPinned == 0 && announcementsTotal > 0)
        _ActionItem(
          icon: LucideIcons.pin,
          label: "No announcement is pinned — the website's notice band is empty",
          route: '/announcements',
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth > 800 ? 4 : 2;
            return GridView.count(
              crossAxisCount: columns,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 14,
              crossAxisSpacing: 14,
              childAspectRatio: 1.4,
              children: [
                _StatTile(
                  label: stats.events.get('published') == 1 ? 'event live' : 'events live',
                  value: '${stats.events.get('published')}',
                  note: stats.events.get('upcoming') > 0 ? '${stats.events.get('upcoming')} still to come' : 'none still to come',
                  icon: LucideIcons.calendar,
                  highlight: stats.events.get('upcoming') > 0,
                  onTap: () => context.push('/events'),
                ),
                _StatTile(
                  label: stats.blog.get('published') == 1 ? 'post live' : 'posts live',
                  value: '${stats.blog.get('published')}',
                  note: blogDrafts > 0 ? '$blogDrafts still in draft' : 'nothing in draft',
                  icon: LucideIcons.newspaper,
                  onTap: () => context.push('/blog'),
                ),
                _StatTile(
                  label: stats.gallery.get('albums') == 1 ? 'album' : 'albums',
                  value: '${stats.gallery.get('albums')}',
                  note: '${stats.gallery.get('photos')} photographs',
                  icon: LucideIcons.images,
                  onTap: () => context.push('/gallery'),
                ),
                _StatTile(
                  label: 'unread',
                  value: '$unread',
                  note: '${stats.contact.get('total')} received in total',
                  icon: LucideIcons.inbox,
                  highlight: unread > 0,
                  onTap: () => context.push('/contact-messages'),
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 16),
        LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth > 900;
            final left = Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Always shown — an empty list is itself the reassuring
                // "all caught up" message, matching the web dashboard.
                _SectionCard(
                  title: 'Needs attention',
                  child: needsAttention.isEmpty
                      ? Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Row(
                            children: [
                              Icon(LucideIcons.circleCheck, size: 18, color: context.semanticColors.success),
                              const SizedBox(width: 10),
                              const Expanded(child: Text('All caught up — nothing is waiting on you today.')),
                            ],
                          ),
                        )
                      : Column(
                          children: [
                            for (final item in needsAttention)
                              ListTile(
                                contentPadding: EdgeInsets.zero,
                                leading: Icon(item.icon, color: Theme.of(context).colorScheme.tertiary),
                                title: Text(item.label),
                                trailing: const Icon(LucideIcons.chevronRight),
                                onTap: () => context.push(item.route),
                              ),
                          ],
                        ),
                ),
                const SizedBox(height: 14),
                _SectionCard(
                  title: 'Coming up',
                  action: _CardLink(label: 'All events', onTap: () => context.push('/events')),
                  child: data.upcomingEvents.isEmpty
                      ? Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              const Icon(LucideIcons.calendar, size: 18),
                              const SizedBox(width: 10),
                              const Text('Nothing on the calendar.'),
                              if (can('content.write'))
                                TextButton(
                                  style: TextButton.styleFrom(
                                    padding: EdgeInsets.zero,
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  onPressed: () => context.push('/events/new'),
                                  child: const Padding(
                                    padding: EdgeInsets.only(left: 6),
                                    child: Text('Add the next service'),
                                  ),
                                ),
                            ],
                          ),
                        )
                      : Column(
                          children: [
                            for (final event in data.upcomingEvents)
                              ListTile(
                                contentPadding: EdgeInsets.zero,
                                leading: _DateBlock(iso: event.startDate),
                                title: Text(event.title.en, maxLines: 1, overflow: TextOverflow.ellipsis),
                                subtitle: Text(
                                  [
                                    _whenLabel(event.startDate),
                                    if (event.location.en.isNotEmpty) event.location.en,
                                  ].join(' · '),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                trailing: const Icon(LucideIcons.chevronRight),
                                onTap: () => context.push('/events/${event.id}'),
                              ),
                          ],
                        ),
                ),
                // Only shown to roles that can actually read the audit log
                // (editors cannot) — matches the web dashboard's `can("audit.read")` gate.
                if (can('audit.read')) ...[
                  const SizedBox(height: 14),
                  _SectionCard(
                    title: 'Recently in the portal',
                    action: _CardLink(label: 'Full log', onTap: () => context.push('/audit-logs')),
                    child: data.recentAudit.isEmpty
                        ? const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12),
                            child: Text('Quiet so far — changes made in the portal will show up here.'),
                          )
                        : Column(
                            children: [
                              for (final run in collapseAuditRuns(data.recentAudit)) _AuditRow(run: run),
                            ],
                          ),
                  ),
                ],
              ],
            );

            final right = Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _VerseCard(verse: data.weeklyVerse, canEdit: can('content.write')),
                if (can('content.write')) ...[
                  const SizedBox(height: 14),
                  _SectionCard(
                    title: 'Start something',
                    child: Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        _QuickAction(icon: LucideIcons.calendar, label: 'New event', onTap: () => context.push('/events/new')),
                        _QuickAction(icon: LucideIcons.bell, label: 'Announcement', onTap: () => context.push('/announcements/new')),
                        _QuickAction(icon: LucideIcons.newspaper, label: 'Blog post', onTap: () => context.push('/blog/new')),
                        _QuickAction(icon: LucideIcons.upload, label: 'Upload media', onTap: () => context.push('/media')),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                _SectionCard(
                  title: 'Also in the library',
                  child: Column(
                    children: [
                      _TotalRow(label: 'Announcements', value: announcementsTotal, onTap: () => context.push('/announcements')),
                      _TotalRow(label: 'Downloads', value: stats.downloads.get('total'), onTap: () => context.push('/downloads')),
                      _TotalRow(label: 'Fellowships', value: stats.fellowships.get('total'), onTap: () => context.push('/fellowships')),
                      _TotalRow(label: 'Media files', value: stats.media.get('total'), onTap: () => context.push('/media')),
                    ],
                  ),
                ),
              ],
            );

            if (wide) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(flex: 3, child: left),
                  const SizedBox(width: 20),
                  Expanded(flex: 2, child: right),
                ],
              );
            }
            return Column(children: [left, const SizedBox(height: 14), right]);
          },
        ),
      ],
    );
  }
}

DateTime _toMidnight(DateTime d) => DateTime(d.year, d.month, d.day);

/// Whole days from today — negative is past, 0 today, 1 tomorrow. Mirrors
/// the web dashboard's `daysAway`.
int _daysAway(DateTime iso) {
  return _toMidnight(iso).difference(_toMidnight(DateTime.now())).inDays;
}

/// When the event is, as someone would say it out loud — mirrors the web
/// dashboard's `whenLabel`. "Today"/"Tomorrow" replace the date entirely.
String _whenLabel(String iso) {
  final date = DateTime.tryParse(iso)?.toLocal();
  if (date == null) return '';
  final time = DateFormat('h:mm a').format(date);
  final days = _daysAway(date);
  if (days == 0) return 'Today, $time';
  if (days == 1) return 'Tomorrow, $time';
  if (days > 1 && days < 7) return '${DateFormat('EEEE').format(date)}, $time';
  return time;
}

/// "Xm ago" / "Xh ago" / "Xd ago", falling back to a plain date — mirrors
/// the web dashboard's `timeAgo`.
String _timeAgo(String iso) {
  final date = DateTime.tryParse(iso);
  if (date == null) return '';
  final seconds = DateTime.now().difference(date).inSeconds;
  if (seconds < 60) return 'just now';
  final minutes = seconds ~/ 60;
  if (minutes < 60) return '${minutes}m ago';
  final hours = minutes ~/ 60;
  if (hours < 24) return '${hours}h ago';
  final days = hours ~/ 24;
  if (days < 7) return '${days}d ago';
  return DateFormat('d MMM').format(date.toLocal());
}

class _ActionItem {
  const _ActionItem({required this.icon, required this.label, required this.route});
  final IconData icon;
  final String label;
  final String route;
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.label, required this.value, required this.note, required this.icon, this.highlight = false, this.onTap});

  final String label;
  final String value;
  final String note;
  final IconData icon;
  final bool highlight;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final semantic = context.semanticColors;

    final accent = highlight ? semantic.accentForeground : theme.colorScheme.onSurfaceVariant;

    return AppSurface(
      onTap: onTap,
      color: highlight ? semantic.warningSoft : theme.colorScheme.surface,
      borderColor: highlight
          ? semantic.accentForeground.withValues(alpha: 0.25)
          : theme.colorScheme.outline.withValues(alpha: 0.7),
      padding: const EdgeInsets.fromLTRB(15, 13, 15, 13),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                alignment: Alignment.center,
                decoration: ShapeDecoration(
                  color: (highlight ? semantic.accentForeground : theme.colorScheme.onSurfaceVariant)
                      .withValues(alpha: 0.1),
                  shape: appSquircle(AppRadii.sm),
                ),
                child: Icon(icon, size: 16, color: accent),
              ),
              const Spacer(),
              if (onTap != null)
                Icon(LucideIcons.arrowUpRight, size: 14, color: accent.withValues(alpha: 0.5)),
            ],
          ),
          const Spacer(),
          Text(
            value,
            style: theme.textTheme.headlineMedium?.copyWith(
              height: 1,
              letterSpacing: -0.5,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
            maxLines: 1,
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurface, height: 1.2),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            note,
            style: theme.textTheme.labelSmall?.copyWith(
              letterSpacing: 0,
              height: 1.2,
              color: highlight ? semantic.accentForeground : null,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child, this.action});
  final String title;
  final Widget child;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AppSurface(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(child: Text(title, style: theme.textTheme.titleMedium)),
              // The action's own button padding would otherwise push it off
              // the card's right margin and add a row of dead space below.
              if (action case final a?)
                Padding(padding: const EdgeInsets.only(left: 8), child: a),
            ],
          ),
          const SizedBox(height: 2),
          child,
        ],
      ),
    );
  }
}

/// The compact "see everything" link in a section card's header. A plain
/// [TextButton] carries enough padding to make the header row twice as tall
/// as the title needs.
class _CardLink extends StatelessWidget {
  const _CardLink({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadii.sm),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: theme.textTheme.labelLarge?.copyWith(fontSize: 13, color: theme.colorScheme.primary),
            ),
            const SizedBox(width: 2),
            Icon(LucideIcons.chevronRight, size: 16, color: theme.colorScheme.primary),
          ],
        ),
      ),
    );
  }
}

/// Day-over-month block, the way a wall calendar reads — mirrors the web
/// dashboard's `DateBlock`, including the "today" highlight.
class _DateBlock extends StatelessWidget {
  const _DateBlock({required this.iso});
  final String iso;

  @override
  Widget build(BuildContext context) {
    final date = DateTime.tryParse(iso)?.toLocal();
    final theme = Theme.of(context);
    final semantic = context.semanticColors;
    final today = date != null && _daysAway(date) == 0;

    return Container(
      width: 44,
      height: 44,
      alignment: Alignment.center,
      decoration: ShapeDecoration(
        color: today ? semantic.warningSoft : theme.colorScheme.surfaceContainerHighest,
        shape: appSquircle(AppRadii.md),
      ),
      child: date == null
          ? null
          : Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${date.day}',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    height: 1,
                    color: today ? semantic.accentForeground : null,
                  ),
                ),
                Text(
                  DateFormat('MMM').format(date).toUpperCase(),
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontSize: 8,
                    letterSpacing: 0.5,
                    color: today ? semantic.accentForeground : theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
    );
  }
}

class _VerseCard extends StatelessWidget {
  const _VerseCard({required this.verse, required this.canEdit});
  final WeeklyVerse? verse;
  final bool canEdit;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: ShapeDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.brand900, AppColors.brand800, AppColors.accent900],
        ),
        shape: appSquircle(AppRadii.card),
        shadows: restingShadow(context),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('VERSE OF THE WEEK', style: theme.textTheme.labelMedium?.copyWith(color: Colors.white70)),
          const SizedBox(height: 10),
          if (verse != null) ...[
            Text(
              '“${verse!.text.en}”',
              style: theme.textTheme.titleMedium?.copyWith(color: Colors.white, fontFamily: 'Fraunces', height: 1.4),
            ),
            const SizedBox(height: 10),
            Text(verse!.reference.en, style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white70)),
          ] else
            Text(
              'No verse has been set for this week yet.',
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white70),
            ),
          if (canEdit) ...[
            const SizedBox(height: 14),
            InkWell(
              onTap: () => context.push('/church/weekly-verse'),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(LucideIcons.bookOpen, size: 14, color: Colors.white70),
                  const SizedBox(width: 6),
                  Text(
                    'Change the verse',
                    style: theme.textTheme.labelSmall?.copyWith(color: Colors.white70, letterSpacing: 0),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 16),
      label: Text(label),
      style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12)),
    );
  }
}

class _TotalRow extends StatelessWidget {
  const _TotalRow({required this.label, required this.value, this.onTap});
  final String label;
  final int value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Expanded(child: Text(label, style: theme.textTheme.bodyMedium)),
            Text('$value', style: theme.textTheme.titleSmall),
          ],
        ),
      ),
    );
  }
}

class _AuditRow extends StatelessWidget {
  const _AuditRow({required this.run});
  final AuditRun run;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(_actionIcon(run.entry.action), size: 16, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  run.count > 1 ? '${run.entry.summary} ×${run.count}' : run.entry.summary,
                  style: theme.textTheme.bodyMedium,
                ),
                Text(
                  [if (run.entry.userName != null) run.entry.userName, _timeAgo(run.entry.createdAt)].join(' · '),
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  IconData _actionIcon(String action) {
    switch (action) {
      case 'create':
        return LucideIcons.circlePlus;
      case 'update':
        return LucideIcons.pencil;
      case 'delete':
        return LucideIcons.trash2;
      case 'publish':
        return LucideIcons.globe;
      case 'unpublish':
        return LucideIcons.globeLock;
      case 'archive':
        return LucideIcons.archive;
      case 'pin':
        return LucideIcons.pin;
      case 'upload':
        return LucideIcons.upload;
      case 'login':
        return LucideIcons.logIn;
      case 'logout':
        return LucideIcons.logOut;
      default:
        return LucideIcons.circle;
    }
  }
}
