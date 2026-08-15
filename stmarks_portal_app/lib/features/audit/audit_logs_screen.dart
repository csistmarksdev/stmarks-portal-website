import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/models/admin.dart';
import '../../core/models/common.dart';
import '../../core/providers/providers.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/empty_state.dart';

const List<String> _kAuditActions = [
  'login',
  'logout',
  'create',
  'update',
  'delete',
  'publish',
  'unpublish',
  'archive',
  'pin',
  'upload',
];

/// Audit log viewer — filterable list of admin actions, plus a purge tool
/// for super-admins.
class AuditLogsScreen extends ConsumerStatefulWidget {
  const AuditLogsScreen({super.key});

  @override
  ConsumerState<AuditLogsScreen> createState() => _AuditLogsScreenState();
}

class _AuditLogsScreenState extends ConsumerState<AuditLogsScreen> {
  final _resourceController = TextEditingController();
  String? _actionFilter;

  List<AuditLogEntry> _items = [];
  bool _loading = true;
  bool _loadingMore = false;
  String? _error;
  int _page = 1;
  bool _hasMore = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _resourceController.dispose();
    super.dispose();
  }

  Future<void> _load({bool append = false}) async {
    setState(() {
      if (append) {
        _loadingMore = true;
      } else {
        _loading = true;
      }
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final json = await api.get<Map<String, dynamic>>(
        '/admin/audit-logs',
        params: {
          'page': append ? _page + 1 : 1,
          'pageSize': 30,
          'action': _actionFilter,
          'resource': _resourceController.text.trim().isEmpty ? null : _resourceController.text.trim(),
        },
      );
      final result = Paginated.fromJson(json, AuditLogEntry.fromJson);
      setState(() {
        _items = append ? [..._items, ...result.items] : result.items;
        _page = result.page;
        _hasMore = result.hasMore;
      });
    } catch (e) {
      setState(() => _error = 'Could not load — $e');
    } finally {
      if (mounted) setState(() => _loading = _loadingMore = false);
    }
  }

  Future<void> _purge() async {
    final controller = TextEditingController(text: '90');
    final days = await showDialog<int>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Purge old entries'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Older than (days)'),
            ),
            const SizedBox(height: 8),
            Text(
              '0 clears all entries.',
              style: Theme.of(ctx).textTheme.bodySmall,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, int.tryParse(controller.text.trim())),
            child: const Text('Continue'),
          ),
        ],
      ),
    );
    if (days == null || !mounted) return;

    final confirmed = await showConfirmDialog(
      context,
      title: 'Purge audit history?',
      message: days == 0
          ? 'This permanently deletes ALL audit history and cannot be undone.'
          : 'This permanently deletes audit entries older than $days day${days == 1 ? '' : 's'} and cannot be undone.',
      confirmLabel: 'Purge',
      destructive: true,
    );
    if (!confirmed || !mounted) return;

    try {
      final api = ref.read(apiClientProvider);
      await api.delete('/admin/audit-logs?olderThanDays=$days');
      if (mounted) {
        showAppSnackBar(context, 'Audit history purged');
        _load();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Purge failed — $e', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final can = ref.read(authControllerProvider.notifier).can;
    final canPurge = can('audit.delete');

    return RefreshIndicator(
      onRefresh: _load,
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
            sliver: SliverToBoxAdapter(
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                runSpacing: 12,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Audit logs', style: theme.textTheme.headlineMedium),
                      const SizedBox(height: 4),
                      Text(
                        'A record of actions taken across the portal.',
                        style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                  if (canPurge)
                    OutlinedButton.icon(
                      onPressed: _purge,
                      icon: Icon(Icons.delete_sweep_outlined, size: 18, color: theme.colorScheme.error),
                      label: Text('Purge old entries', style: TextStyle(color: theme.colorScheme.error)),
                      style: OutlinedButton.styleFrom(side: BorderSide(color: theme.colorScheme.error)),
                    ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            sliver: SliverToBoxAdapter(
              child: Row(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: theme.colorScheme.outline),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: PopupMenuButton<String?>(
                      initialValue: _actionFilter,
                      onSelected: (v) {
                        setState(() => _actionFilter = v);
                        _load();
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(value: null, child: Text('All actions')),
                        ..._kAuditActions.map(
                          (a) => PopupMenuItem(value: a, child: Text(a[0].toUpperCase() + a.substring(1))),
                        ),
                      ],
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(_actionFilter == null
                                ? 'All actions'
                                : _actionFilter![0].toUpperCase() + _actionFilter!.substring(1)),
                            const SizedBox(width: 4),
                            const Icon(Icons.arrow_drop_down_rounded, size: 18),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _resourceController,
                      onSubmitted: (_) => _load(),
                      decoration: InputDecoration(
                        hintText: 'e.g. events, media, auth',
                        isDense: true,
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.search_rounded),
                          onPressed: _load,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_loading && _items.isEmpty)
            const SliverFillRemaining(hasScrollBody: false, child: LoadingListSkeleton())
          else if (_error != null && _items.isEmpty)
            SliverFillRemaining(hasScrollBody: false, child: ErrorRetryState(message: _error!, onRetry: _load))
          else if (_items.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: EmptyState(
                icon: Icons.history_rounded,
                title: 'No audit entries',
                message: 'Actions taken in the portal will be logged here.',
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
              sliver: SliverList.separated(
                itemCount: _items.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, i) => _AuditRow(entry: _items[i]),
              ),
            ),
          if (_hasMore && !_loading)
            SliverPadding(
              padding: const EdgeInsets.only(bottom: 24),
              sliver: SliverToBoxAdapter(
                child: Center(
                  child: _loadingMore
                      ? const Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())
                      : OutlinedButton(onPressed: () => _load(append: true), child: const Text('Load more')),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _AuditRow extends StatelessWidget {
  const _AuditRow({required this.entry});

  final AuditLogEntry entry;

  IconData _actionIcon(String action) {
    switch (action) {
      case 'create':
        return Icons.add_circle_outline_rounded;
      case 'update':
        return Icons.edit_outlined;
      case 'delete':
        return Icons.delete_outline_rounded;
      case 'publish':
        return Icons.public_rounded;
      case 'unpublish':
        return Icons.public_off_rounded;
      case 'archive':
        return Icons.archive_outlined;
      case 'pin':
        return Icons.push_pin_outlined;
      case 'upload':
        return Icons.upload_outlined;
      case 'login':
        return Icons.login_rounded;
      case 'logout':
        return Icons.logout_rounded;
      default:
        return Icons.circle_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    DateTime? date;
    try {
      date = DateTime.parse(entry.createdAt).toLocal();
    } catch (_) {}

    final secondaryParts = [
      if (entry.userName != null && entry.userName!.isNotEmpty) entry.userName!,
      if (date != null) DateFormat('d MMM yyyy, h:mm a').format(date),
      if (entry.ip != null && entry.ip!.isNotEmpty) entry.ip!,
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.7)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(_actionIcon(entry.action), size: 18, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(entry.summary, style: theme.textTheme.bodyMedium),
                if (secondaryParts.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(secondaryParts.join(' · '), style: theme.textTheme.bodySmall),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
