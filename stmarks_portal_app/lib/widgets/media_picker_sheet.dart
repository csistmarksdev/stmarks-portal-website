import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/models/admin.dart';
import '../core/providers/providers.dart';
import '../core/theme/app_theme.dart';
import '../features/media/media_repository.dart';
import 'confirm_dialog.dart';
import 'portal_image.dart';

/// Opens the media library as a picker (single or multi-select) and returns
/// the chosen item(s), or null if cancelled. Mirrors the web app's
/// `MediaLibraryDialog` / `ImagePicker`.
Future<List<MediaItem>?> showMediaPickerSheet(
  BuildContext context, {
  bool multiSelect = false,
  String? kindFilter,
}) {
  return showModalBottomSheet<List<MediaItem>>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (ctx) => _MediaPickerSheet(multiSelect: multiSelect, kindFilter: kindFilter),
  );
}

class _MediaPickerSheet extends ConsumerStatefulWidget {
  const _MediaPickerSheet({required this.multiSelect, this.kindFilter});

  final bool multiSelect;
  final String? kindFilter;

  @override
  ConsumerState<_MediaPickerSheet> createState() => _MediaPickerSheetState();
}

class _MediaPickerSheetState extends ConsumerState<_MediaPickerSheet> {
  final _searchController = TextEditingController();
  String? _kind;
  int _page = 1;
  bool _loading = true;
  bool _uploading = false;
  String? _error;
  List<MediaItem> _items = [];
  bool _hasMore = false;
  final Set<String> _selectedIds = {};

  @override
  void initState() {
    super.initState();
    _kind = widget.kindFilter;
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load({bool append = false}) async {
    setState(() {
      _loading = true;
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
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Could not load media — $e';
        _loading = false;
      });
    }
  }

  Future<void> _upload() async {
    final files = await FilePicker.pickFiles();
    if (files.isEmpty) return;
    setState(() => _uploading = true);
    final repo = MediaRepository(ref.read(apiClientProvider));
    for (final file in files) {
      try {
        final bytes = await file.readAsBytes();
        final item = await repo.upload(bytes: bytes, filename: file.name);
        setState(() {
          _items = [item, ..._items];
          if (!widget.multiSelect) {
            _selectedIds
              ..clear()
              ..add(item.id);
          }
        });
      } catch (e) {
        if (mounted) showAppSnackBar(context, 'Upload failed for ${file.name}', error: true);
      }
    }
    if (mounted) setState(() => _uploading = false);
  }

  void _toggle(MediaItem item) {
    setState(() {
      if (widget.multiSelect) {
        if (_selectedIds.contains(item.id)) {
          _selectedIds.remove(item.id);
        } else {
          _selectedIds.add(item.id);
        }
      } else {
        _selectedIds
          ..clear()
          ..add(item.id);
      }
    });
  }

  void _confirmSelection() {
    final selected = _items.where((i) => _selectedIds.contains(i.id)).toList();
    Navigator.of(context).pop(selected);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final height = MediaQuery.of(context).size.height * 0.88;

    return SizedBox(
      height: height,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Expanded(child: Text('Media library', style: theme.textTheme.titleLarge)),
                IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(context)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onSubmitted: (_) => _load(),
                    decoration: InputDecoration(
                      hintText: 'Search media…',
                      prefixIcon: const Icon(Icons.search_rounded),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                FilledButton.icon(
                  onPressed: _uploading ? null : _upload,
                  icon: _uploading
                      ? const SizedBox(height: 14, width: 14, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.upload_rounded, size: 18),
                  label: const Text('Upload'),
                  style: FilledButton.styleFrom(
                    backgroundColor: theme.colorScheme.primary,
                    foregroundColor: theme.colorScheme.onPrimary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final entry in {null: 'All', 'image': 'Images', 'video': 'Video', 'pdf': 'PDF', 'document': 'Docs'}.entries)
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
          ),
          const SizedBox(height: 8),
          Expanded(child: _buildBody()),
          if (_selectedIds.isNotEmpty)
            Container(
              padding: EdgeInsets.fromLTRB(16, 10, 16, 10 + MediaQuery.of(context).padding.bottom),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                border: Border(top: BorderSide(color: theme.colorScheme.outline)),
              ),
              child: Row(
                children: [
                  Expanded(child: Text('${_selectedIds.length} selected', style: theme.textTheme.bodyMedium)),
                  FilledButton(
                    onPressed: _confirmSelection,
                    style: FilledButton.styleFrom(
                      backgroundColor: theme.colorScheme.primary,
                      foregroundColor: theme.colorScheme.onPrimary,
                    ),
                    child: const Text('Use selected'),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_loading && _items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return ErrorRetrySmall(message: _error!, onRetry: () => _load());
    }
    if (_items.isEmpty) {
      return const Center(child: Text('No media yet — upload something to get started.'));
    }
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 140,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1,
      ),
      itemCount: _items.length + (_hasMore ? 1 : 0),
      itemBuilder: (context, i) {
        if (i >= _items.length) {
          return Center(
            child: TextButton(onPressed: () => _load(append: true), child: const Text('Load more')),
          );
        }
        final item = _items[i];
        final selected = _selectedIds.contains(item.id);
        return InkWell(
          borderRadius: BorderRadius.circular(AppRadii.md),
          onTap: () => _toggle(item),
          child: Stack(
            fit: StackFit.expand,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(AppRadii.md),
                child: item.kind == 'image'
                    ? PortalImage(url: item.thumbnailUrl ?? item.url)
                    : Container(
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                        alignment: Alignment.center,
                        child: Icon(_kindIcon(item.kind), size: 28),
                      ),
              ),
              Positioned(
                top: 6,
                right: 6,
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: selected ? Theme.of(context).colorScheme.primary : Colors.black.withValues(alpha: 0.35),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    selected ? Icons.check_rounded : Icons.circle_outlined,
                    size: 14,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

IconData _kindIcon(String kind) {
  switch (kind) {
    case 'video':
      return Icons.videocam_rounded;
    case 'pdf':
      return Icons.picture_as_pdf_rounded;
    default:
      return Icons.insert_drive_file_rounded;
  }
}

class ErrorRetrySmall extends StatelessWidget {
  const ErrorRetrySmall({super.key, required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 8),
          TextButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
