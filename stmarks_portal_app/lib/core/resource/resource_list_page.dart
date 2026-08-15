import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../widgets/confirm_dialog.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/status_badge.dart';
import '../api/resource_repository.dart';
import '../theme/app_theme.dart';

/// Generic, config-driven CRUD list screen — mirrors the web app's
/// `ResourceListPage`: search, status filter, responsive card grid,
/// pagination, empty/loading/error states, and a per-card publish-workflow
/// menu + delete-with-confirm. Powers Events/Blog/Gallery/Announcements/
/// Downloads/Fellowships with a small config each.
class ResourceListPage<T> extends ConsumerStatefulWidget {
  const ResourceListPage({
    super.key,
    required this.title,
    required this.subtitle,
    required this.repository,
    required this.cardBuilder,
    required this.idOf,
    required this.onCreate,
    required this.onEdit,
    this.statusOf,
    this.onSetStatus,
    this.onDelete,
    this.paginated = true,
    this.pageSize = 20,
    this.canWrite = true,
    this.canDelete = true,
    this.canPublish = true,
    this.emptyIcon = Icons.inbox_outlined,
    this.emptyTitle = 'Nothing here yet',
    this.emptyMessage,
    this.createLabel = 'New',
    this.extraFilterBar,
    this.extraParams,
    this.deleteLabelOf,
    this.searchHint = 'Search…',
  });

  final String title;
  final String subtitle;
  final ResourceRepository<T> repository;
  final Widget Function(BuildContext context, T item, {required VoidCallback onEdit, required VoidCallback onDelete, Widget? statusMenu}) cardBuilder;
  final String Function(T) idOf;
  final String? Function(T)? statusOf;
  final Future<void> Function(T item, String status)? onSetStatus;
  final Future<void> Function(T item)? onDelete;
  final VoidCallback onCreate;
  final void Function(T item) onEdit;
  final bool paginated;
  final int pageSize;
  final bool canWrite;
  final bool canDelete;
  final bool canPublish;
  final IconData emptyIcon;
  final String emptyTitle;
  final String? emptyMessage;
  final String createLabel;
  final Widget? extraFilterBar;
  final Map<String, dynamic> Function()? extraParams;
  final String Function(T)? deleteLabelOf;
  /// Placeholder text for the search box — mirrors the web app's per-collection
  /// `searchPlaceholder` (e.g. "Search by title or slug…").
  final String searchHint;

  @override
  ConsumerState<ResourceListPage<T>> createState() => _ResourceListPageState<T>();
}

class _ResourceListPageState<T> extends ConsumerState<ResourceListPage<T>> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  String? _statusFilter;
  List<T> _items = [];
  bool _loading = true;
  bool _loadingMore = false;
  String? _error;
  int _page = 1;
  bool _hasMore = false;
  int? _total;

  bool get _filtering => _searchController.text.trim().isNotEmpty || _statusFilter != null;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
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
      if (widget.paginated) {
        final result = await widget.repository.list(
          page: append ? _page + 1 : 1,
          pageSize: widget.pageSize,
          search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
          status: _statusFilter,
          extra: widget.extraParams?.call(),
        );
        setState(() {
          _items = append ? [..._items, ...result.items] : result.items;
          _page = result.page;
          _hasMore = result.hasMore;
          _total = result.total;
        });
      } else {
        final result = await widget.repository.listAll(extra: widget.extraParams?.call());
        setState(() {
          _items = result;
          _hasMore = false;
          _total = result.length;
        });
      }
    } catch (e) {
      setState(() => _error = 'Could not load — $e');
    } finally {
      if (mounted) setState(() => _loading = _loadingMore = false);
    }
  }

  void _onSearchChanged(String _) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), _load);
  }

  Future<void> _handleDelete(T item) async {
    final label = widget.deleteLabelOf?.call(item) ?? 'this item';
    final confirmed = await showConfirmDialog(
      context,
      title: 'Delete $label?',
      message: 'This permanently removes the record. This action cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    );
    if (!confirmed) return;
    try {
      if (widget.onDelete != null) {
        await widget.onDelete!(item);
      } else {
        await widget.repository.remove(widget.idOf(item));
      }
      if (mounted) {
        setState(() => _items.removeWhere((i) => widget.idOf(i) == widget.idOf(item)));
        showAppSnackBar(context, 'Deleted');
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Delete failed — $e', error: true);
    }
  }

  Future<void> _handleSetStatus(T item, String status) async {
    try {
      if (widget.onSetStatus != null) {
        await widget.onSetStatus!(item, status);
      } else {
        await widget.repository.setStatus(widget.idOf(item), status);
      }
      await _load();
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Could not update status — $e', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
            sliver: SliverToBoxAdapter(
              child: _Header(
                title: widget.title,
                subtitle: widget.subtitle,
                canWrite: widget.canWrite,
                createLabel: widget.createLabel,
                onCreate: widget.onCreate,
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          onChanged: _onSearchChanged,
                          decoration: InputDecoration(
                            hintText: widget.searchHint,
                            prefixIcon: const Icon(Icons.search_rounded),
                            isDense: true,
                          ),
                        ),
                      ),
                      if (widget.statusOf != null) ...[
                        const SizedBox(width: 10),
                        _StatusFilterButton(
                          value: _statusFilter,
                          onChanged: (v) {
                            setState(() => _statusFilter = v);
                            _load();
                          },
                        ),
                      ],
                    ],
                  ),
                  if (widget.extraFilterBar != null) ...[const SizedBox(height: 10), widget.extraFilterBar!],
                ],
              ),
            ),
          ),
          if (_loading && _items.isEmpty)
            const SliverFillRemaining(hasScrollBody: false, child: LoadingListSkeleton())
          else if (_error != null && _items.isEmpty)
            SliverFillRemaining(hasScrollBody: false, child: ErrorRetryState(message: _error!, onRetry: _load))
          else if (_items.isEmpty && _filtering)
            SliverFillRemaining(
              hasScrollBody: false,
              child: EmptyState(
                icon: Icons.search_off_rounded,
                title: 'Nothing matches that search',
                actionLabel: 'Clear filters',
                onAction: () {
                  _searchController.clear();
                  setState(() => _statusFilter = null);
                  _load();
                },
              ),
            )
          else if (_items.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: EmptyState(
                icon: widget.emptyIcon,
                title: widget.emptyTitle,
                message: widget.emptyMessage,
                actionLabel: widget.canWrite ? widget.createLabel : null,
                onAction: widget.canWrite ? widget.onCreate : null,
              ),
            )
          else ...[
            if (_total != null)
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 4),
                sliver: SliverToBoxAdapter(
                  child: Text(
                    '$_total total${_items.length < (_total ?? 0) ? ' — showing ${_items.length}' : ''}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
              sliver: SliverLayoutBuilder(
                builder: (context, constraints) {
                  final width = constraints.crossAxisExtent;
                  final columns = width > 1100 ? 3 : (width > 680 ? 2 : 1);
                  if (columns == 1) {
                    return SliverList.separated(
                      itemCount: _items.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 16),
                      itemBuilder: (context, i) {
                        final item = _items[i];
                        final status = widget.statusOf?.call(item);
                        return widget.cardBuilder(
                          context,
                          item,
                          onEdit: () => widget.onEdit(item),
                          onDelete: widget.canDelete ? () => _handleDelete(item) : () {},
                          statusMenu: (status != null && widget.canPublish)
                              ? _StatusMenu(current: status, onSelect: (s) => _handleSetStatus(item, s))
                              : (status != null ? StatusBadge(status: status) : null),
                        );
                      },
                    );
                  }
                  return SliverGrid(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 16,
                      crossAxisSpacing: 16,
                      childAspectRatio: 1.15,
                    ),
                    delegate: SliverChildBuilderDelegate((context, i) {
                      final item = _items[i];
                      final status = widget.statusOf?.call(item);
                      return widget.cardBuilder(
                        context,
                        item,
                        onEdit: () => widget.onEdit(item),
                        onDelete: widget.canDelete ? () => _handleDelete(item) : () {},
                        statusMenu: (status != null && widget.canPublish)
                            ? _StatusMenu(current: status, onSelect: (s) => _handleSetStatus(item, s))
                            : (status != null ? StatusBadge(status: status) : null),
                      );
                    }, childCount: _items.length),
                  );
                },
              ),
            ),
          ],
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

class _Header extends StatelessWidget {
  const _Header({
    required this.title,
    required this.subtitle,
    required this.canWrite,
    required this.createLabel,
    required this.onCreate,
  });

  final String title;
  final String subtitle;
  final bool canWrite;
  final String createLabel;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Wrap(
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.center,
      runSpacing: 12,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: theme.textTheme.headlineMedium),
            const SizedBox(height: 4),
            Text(subtitle, style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
          ],
        ),
        if (canWrite)
          FilledButton.icon(
            onPressed: onCreate,
            icon: const Icon(Icons.add_rounded, size: 18),
            label: Text(createLabel),
            style: FilledButton.styleFrom(
              backgroundColor: theme.colorScheme.primary,
              foregroundColor: theme.colorScheme.onPrimary,
            ),
          ),
      ],
    );
  }
}

class _StatusFilterButton extends StatelessWidget {
  const _StatusFilterButton({required this.value, required this.onChanged});
  final String? value;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outline),
        borderRadius: BorderRadius.circular(AppRadii.md),
      ),
      child: PopupMenuButton<String?>(
        initialValue: value,
        onSelected: onChanged,
        itemBuilder: (context) => const [
          PopupMenuItem(value: null, child: Text('All statuses')),
          PopupMenuItem(value: 'draft', child: Text('Draft')),
          PopupMenuItem(value: 'published', child: Text('Published')),
          PopupMenuItem(value: 'archived', child: Text('Archived')),
        ],
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(value == null ? 'All' : value![0].toUpperCase() + value!.substring(1)),
              const SizedBox(width: 4),
              const Icon(Icons.arrow_drop_down_rounded, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusMenu extends StatelessWidget {
  const _StatusMenu({required this.current, required this.onSelect});
  final String current;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      onSelected: onSelect,
      itemBuilder: (context) => [
        CheckedPopupMenuItem(value: 'draft', checked: current == 'draft', child: const Text('Draft')),
        CheckedPopupMenuItem(value: 'published', checked: current == 'published', child: const Text('Published')),
        CheckedPopupMenuItem(value: 'archived', checked: current == 'archived', child: const Text('Archived')),
      ],
      child: StatusBadge(status: current),
    );
  }
}
