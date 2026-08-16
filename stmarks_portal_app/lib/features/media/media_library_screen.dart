import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/admin.dart';
import '../../core/models/common.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/localized_field.dart';
import '../../widgets/portal_image.dart';
import 'media_repository.dart';

const Map<String?, String> _kKindFilters = {
  null: 'All',
  'image': 'Images',
  'video': 'Video',
  'pdf': 'PDF',
  'document': 'Docs',
};

IconData _kindIcon(String kind) {
  switch (kind) {
    case 'video':
      return LucideIcons.video;
    case 'pdf':
      return LucideIcons.fileText;
    default:
      return LucideIcons.file;
  }
}

/// Standalone, full-page media library — browse, search, filter, upload,
/// inspect, edit alt text and delete. Mirrors the layout conventions used by
/// [ResourceListPage] (header, search/filter row, responsive grid, "load
/// more" footer) but is self-contained since media has no publish workflow.
class MediaLibraryScreen extends ConsumerStatefulWidget {
  const MediaLibraryScreen({super.key});

  @override
  ConsumerState<MediaLibraryScreen> createState() => _MediaLibraryScreenState();
}

class _MediaLibraryScreenState extends ConsumerState<MediaLibraryScreen> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  String? _kind;

  List<MediaItem> _items = [];
  bool _loading = true;
  bool _loadingMore = false;
  bool _uploading = false;
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
      final repo = MediaRepository(ref.read(apiClientProvider));
      final result = await repo.list(
        page: append ? _page + 1 : 1,
        search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
        kind: _kind,
      );
      setState(() {
        _items = append ? [..._items, ...result.items] : result.items;
        _page = result.page;
        _hasMore = result.hasMore;
      });
    } catch (e) {
      setState(() => _error = 'Could not load media — $e');
    } finally {
      if (mounted) setState(() => _loading = _loadingMore = false);
    }
  }

  void _onSearchChanged(String _) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), _load);
  }

  Future<void> _upload() async {
    final files = await FilePicker.pickFiles();
    if (files.isEmpty) return;
    setState(() => _uploading = true);
    final repo = MediaRepository(ref.read(apiClientProvider));
    var uploaded = 0;
    var failed = 0;
    for (final file in files) {
      try {
        final bytes = await file.readAsBytes();
        await repo.upload(bytes: bytes, filename: file.name);
        uploaded++;
      } catch (_) {
        failed++;
      }
    }
    if (mounted) {
      setState(() => _uploading = false);
      if (failed == 0) {
        showAppSnackBar(context, 'Uploaded $uploaded file${uploaded == 1 ? '' : 's'}');
      } else {
        showAppSnackBar(context, 'Uploaded $uploaded, failed $failed', error: true);
      }
    }
    await _load();
  }

  void _openDetail(MediaItem item) {
    final auth = ref.read(authControllerProvider.notifier);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => _MediaDetailSheet(
        item: item,
        canWrite: auth.can('media.write'),
        canDelete: auth.can('media.delete'),
        onUpdated: (updated) {
          if (!mounted) return;
          setState(() {
            final idx = _items.indexWhere((i) => i.id == updated.id);
            if (idx != -1) _items[idx] = updated;
          });
        },
        onDeleted: () {
          if (!mounted) return;
          setState(() => _items.removeWhere((i) => i.id == item.id));
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = ref.watch(authControllerProvider.notifier);
    final canWrite = auth.can('media.write');

    return RefreshIndicator(
      // The list starts at y=0 under the floating bar, so the spinner has
      // to be pushed clear of it.
      edgeOffset: MediaQuery.paddingOf(context).top,
      onRefresh: _load,
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: EdgeInsets.fromLTRB(20, appPageTop(context), 20, 8),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Media library', style: theme.textTheme.headlineMedium),
                  const SizedBox(height: 4),
                  Text(
                    'Images, videos and documents used across the portal.',
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ],
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
                          decoration: const InputDecoration(
                            hintText: 'Search media…',
                            prefixIcon: Icon(LucideIcons.search),
                            isDense: true,
                          ),
                        ),
                      ),
                      if (canWrite) ...[
                        const SizedBox(width: 10),
                        FilledButton.icon(
                          onPressed: _uploading ? null : _upload,
                          icon: _uploading
                              ? const SizedBox(
                                  height: 14,
                                  width: 14,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(LucideIcons.upload, size: 18),
                          label: const Text('Upload'),
                          style: FilledButton.styleFrom(
                            backgroundColor: theme.colorScheme.primary,
                            foregroundColor: theme.colorScheme.onPrimary,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 10),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        for (final entry in _kKindFilters.entries)
                          Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(entry.value),
                              selected: _kind == entry.key,
                              onSelected: (_) {
                                setState(() => _kind = entry.key);
                                _load();
                              },
                            ),
                          ),
                      ],
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
                icon: LucideIcons.folderOpen,
                title: 'No media yet',
                message: 'Upload something to get started.',
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, kFloatingDockHeight + 24),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 160,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 0.85,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, i) => _MediaTile(item: _items[i], onTap: () => _openDetail(_items[i])),
                  childCount: _items.length,
                ),
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

class _MediaTile extends StatelessWidget {
  const _MediaTile({required this.item, required this.onTap});

  final MediaItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isImage = item.kind == 'image';
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadii.md),
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(AppRadii.md),
          border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.5)),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: isImage
                  ? PortalImage(url: item.thumbnailUrl ?? item.url)
                  : Container(
                      width: double.infinity,
                      color: theme.colorScheme.surfaceContainerHighest,
                      alignment: Alignment.center,
                      child: Icon(_kindIcon(item.kind), size: 32, color: theme.colorScheme.onSurfaceVariant),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
              child: Text(
                item.filename,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: theme.textTheme.labelSmall,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MediaDetailSheet extends ConsumerStatefulWidget {
  const _MediaDetailSheet({
    required this.item,
    required this.canWrite,
    required this.canDelete,
    required this.onUpdated,
    required this.onDeleted,
  });

  final MediaItem item;
  final bool canWrite;
  final bool canDelete;
  final ValueChanged<MediaItem> onUpdated;
  final VoidCallback onDeleted;

  @override
  ConsumerState<_MediaDetailSheet> createState() => _MediaDetailSheetState();
}

class _MediaDetailSheetState extends ConsumerState<_MediaDetailSheet> {
  late LocalizedText _alt;
  bool _saving = false;
  bool _deleting = false;

  @override
  void initState() {
    super.initState();
    _alt = widget.item.alt ?? LocalizedText.empty;
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final repo = MediaRepository(ref.read(apiClientProvider));
      final updated = await repo.updateAlt(widget.item.id, altEn: _alt.en, altTa: _alt.ta);
      widget.onUpdated(updated);
      if (mounted) showAppSnackBar(context, 'Alt text saved');
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Could not save — $e', error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Delete ${widget.item.filename}?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    );
    if (!confirmed) return;
    setState(() => _deleting = true);
    try {
      final repo = MediaRepository(ref.read(apiClientProvider));
      await repo.remove(widget.item.id);
      widget.onDeleted();
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        showAppSnackBar(context, 'Delete failed — $e', error: true);
        setState(() => _deleting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final item = widget.item;
    final details = <String>[
      if (item.format.isNotEmpty) item.format.toUpperCase(),
      if (item.size.isNotEmpty) item.size,
      if (item.kind == 'image' && item.width != null && item.height != null) '${item.width} × ${item.height}',
    ].join(' · ');

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.outline,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(AppRadii.lg),
              child: SizedBox(
                height: 220,
                width: double.infinity,
                child: item.kind == 'image'
                    ? PortalImage(url: item.url, fit: BoxFit.contain)
                    : Container(
                        color: theme.colorScheme.surfaceContainerHighest,
                        alignment: Alignment.center,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(_kindIcon(item.kind), size: 56, color: theme.colorScheme.onSurfaceVariant),
                            const SizedBox(height: 8),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: Text(
                                item.filename,
                                textAlign: TextAlign.center,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 16),
            Text(item.filename, style: theme.textTheme.titleMedium),
            if (details.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(details, style: theme.textTheme.bodySmall),
            ],
            const SizedBox(height: 20),
            LocalizedField(
              label: 'Alt text',
              value: _alt,
              onChanged: widget.canWrite ? (v) => setState(() => _alt = v) : (_) {},
              hint: 'Describe this media for accessibility',
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                if (widget.canWrite)
                  Expanded(
                    child: FilledButton(
                      onPressed: _saving ? null : _save,
                      style: FilledButton.styleFrom(
                        backgroundColor: theme.colorScheme.primary,
                        foregroundColor: theme.colorScheme.onPrimary,
                      ),
                      child: _saving
                          ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Save'),
                    ),
                  ),
                if (widget.canWrite && widget.canDelete) const SizedBox(width: 12),
                if (widget.canDelete)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _deleting ? null : _delete,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: theme.colorScheme.error,
                        side: BorderSide(color: theme.colorScheme.error),
                      ),
                      child: _deleting
                          ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Delete'),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
