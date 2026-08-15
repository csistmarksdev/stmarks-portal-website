import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/models/common.dart';
import '../../core/models/content.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/image_picker_field.dart';
import '../../widgets/localized_field.dart';
import '../../widgets/media_picker_sheet.dart';
import '../../widgets/portal_image.dart';
import '../media/media_repository.dart';
import 'gallery_repository_provider.dart';

/// Create/edit screen for a gallery album. Unlike the other content types,
/// an album has a photo sub-resource that can only be managed once the
/// album itself exists, so this screen is hand-built (not the generic
/// `ResourceFormPage`) with two parts: an album-metadata form, and — once
/// an id exists — a photo grid with add/remove actions hitting
/// `/admin/gallery/:id/photos` directly.
class GalleryAlbumScreen extends ConsumerStatefulWidget {
  const GalleryAlbumScreen({super.key, this.id});

  final String? id;

  @override
  ConsumerState<GalleryAlbumScreen> createState() => _GalleryAlbumScreenState();
}

class _GalleryAlbumScreenState extends ConsumerState<GalleryAlbumScreen> {
  String? _albumId;
  bool _loading = true;
  bool _saving = false;
  bool _photoBusy = false;
  String? _error;

  LocalizedText _title = LocalizedText.empty;
  LocalizedText? _description;
  String _date = DateTime.now().toIso8601String();
  ImageAsset? _cover;
  bool _shared = false;
  String? _fellowshipSlug;
  String _status = 'draft';
  List<GalleryPhoto> _photos = [];

  bool get _isEdit => _albumId != null;

  @override
  void initState() {
    super.initState();
    _albumId = widget.id;
    _init();
  }

  Future<void> _init() async {
    if (widget.id == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final album = await ref.read(galleryRepositoryProvider).getOne(widget.id!);
      setState(() {
        _albumId = album.id;
        _title = album.title;
        _description = album.description;
        _date = album.date;
        _cover = album.cover;
        _shared = album.shared ?? false;
        _fellowshipSlug = album.fellowshipSlug;
        _status = album.status ?? 'draft';
        _photos = album.photos;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Could not load — $e';
        _loading = false;
      });
    }
  }

  Map<String, dynamic> _buildPayload() {
    return {
      'title': _title.toJson(),
      if (_description != null && !_description!.isEmpty) 'description': _description!.toJson(),
      'date': _date,
      if (_cover != null) 'cover': _cover!.toJson(),
      if (!_shared && _fellowshipSlug != null && _fellowshipSlug!.isNotEmpty) 'fellowshipSlug': _fellowshipSlug,
      'shared': _shared,
    };
  }

  Future<void> _save() async {
    if (_title.isEmpty) {
      showAppSnackBar(context, 'Title is required', error: true);
      return;
    }
    final wasEdit = _isEdit;
    setState(() {
      _saving = true;
      _error = null;
    });
    final repo = ref.read(galleryRepositoryProvider);
    try {
      GalleryAlbum saved;
      if (!wasEdit) {
        saved = await repo.create(_buildPayload());
        if (_status != 'draft') {
          saved = await repo.setStatus(saved.id, _status);
        }
      } else {
        saved = await repo.update(_albumId!, _buildPayload());
        saved = await repo.setStatus(_albumId!, _status);
      }
      if (!mounted) return;
      setState(() {
        _albumId = saved.id;
        _title = saved.title;
        _description = saved.description;
        _date = saved.date;
        _cover = saved.cover;
        _shared = saved.shared ?? false;
        _fellowshipSlug = saved.fellowshipSlug;
        _status = saved.status ?? _status;
        _photos = saved.photos;
      });
      showAppSnackBar(context, wasEdit ? 'Saved' : 'Album created — you can add photos now');
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Could not save — $e');
        showAppSnackBar(context, 'Could not save — $e', error: true);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _deleteAlbum() async {
    if (_albumId == null) return;
    final confirmed = await showConfirmDialog(
      context,
      title: 'Delete album?',
      message: 'This will remove the album and all of its photos. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    );
    if (!confirmed) return;
    try {
      await ref.read(galleryRepositoryProvider).remove(_albumId!);
      if (mounted) Navigator.of(context).maybePop(true);
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Delete failed — $e', error: true);
    }
  }

  Future<void> _refreshPhotos() async {
    if (_albumId == null) return;
    try {
      final album = await ref.read(galleryRepositoryProvider).getOne(_albumId!);
      if (mounted) setState(() => _photos = album.photos);
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Could not refresh photos — $e', error: true);
    }
  }

  Future<void> _deletePhoto(GalleryPhoto photo) async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Delete photo?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    );
    if (!confirmed) return;
    setState(() => _photoBusy = true);
    try {
      await ref.read(apiClientProvider).delete<dynamic>('/admin/gallery/$_albumId/photos/${photo.id}');
      await _refreshPhotos();
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Delete failed — $e', error: true);
    } finally {
      if (mounted) setState(() => _photoBusy = false);
    }
  }

  Future<void> _addFromLibrary() async {
    final selected = await showMediaPickerSheet(context, multiSelect: true, kindFilter: 'image');
    if (selected == null || selected.isEmpty || _albumId == null) return;
    setState(() => _photoBusy = true);
    try {
      final body = selected.map((m) => {'image': mediaItemToImageAsset(m).toJson()}).toList();
      await ref.read(apiClientProvider).post<dynamic>('/admin/gallery/$_albumId/photos', data: body);
      await _refreshPhotos();
      if (mounted) showAppSnackBar(context, 'Photos added');
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Could not add photos — $e', error: true);
    } finally {
      if (mounted) setState(() => _photoBusy = false);
    }
  }

  Future<void> _promptVideoLink() async {
    final controller = TextEditingController();
    final url = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add video by link'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'YouTube, Vimeo, or a direct video file link'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, controller.text.trim()), child: const Text('Add')),
        ],
      ),
    );
    if (url == null || url.isEmpty || _albumId == null) return;
    setState(() => _photoBusy = true);
    MediaItemLike? poster;
    try {
      final item = await MediaRepository(ref.read(apiClientProvider)).videoPoster(url);
      poster = MediaItemLike(mediaItemToImageAsset(item));
    } catch (e) {
      if (mounted) {
        showAppSnackBar(
          context,
          "Couldn't fetch a thumbnail for that link — try uploading a poster image instead",
          error: true,
        );
      }
      if (mounted) setState(() => _photoBusy = false);
      return;
    }
    try {
      await ref.read(apiClientProvider).post<dynamic>(
        '/admin/gallery/$_albumId/photos',
        data: [
          {
            'image': poster.image.toJson(),
            'video': {'url': url},
          },
        ],
      );
      await _refreshPhotos();
      if (mounted) showAppSnackBar(context, 'Video added');
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Could not add video — $e', error: true);
    } finally {
      if (mounted) setState(() => _photoBusy = false);
    }
  }

  void _openAddPhotosSheet() {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('From media library'),
              onTap: () {
                Navigator.pop(ctx);
                _addFromLibrary();
              },
            ),
            ListTile(
              leading: const Icon(Icons.link_rounded),
              title: const Text('Add video by link'),
              onTap: () {
                Navigator.pop(ctx);
                _promptVideoLink();
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 720),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_rounded),
                        onPressed: () => Navigator.of(context).maybePop(),
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(_isEdit ? 'Edit Album' : 'New Album', style: theme.textTheme.headlineSmall),
                      ),
                      if (_isEdit)
                        IconButton(
                          icon: Icon(Icons.delete_outline_rounded, color: theme.colorScheme.error),
                          onPressed: _deleteAlbum,
                          tooltip: 'Delete',
                        ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surface,
                      borderRadius: BorderRadius.circular(AppRadii.card),
                      border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.7)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        LocalizedField(
                          label: 'Title',
                          required: true,
                          value: _title,
                          onChanged: (v) => setState(() => _title = v),
                        ),
                        const SizedBox(height: 20),
                        LocalizedField(
                          label: 'Description',
                          maxLines: 4,
                          value: _description ?? LocalizedText.empty,
                          onChanged: (v) => setState(() => _description = v.isEmpty ? null : v),
                        ),
                        const SizedBox(height: 20),
                        _buildDateField(theme),
                        const SizedBox(height: 20),
                        ImagePickerField(
                          label: 'Cover image',
                          value: _cover,
                          onChanged: (v) => setState(() => _cover = v),
                        ),
                        const SizedBox(height: 12),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Shared album (churchwide)'),
                          subtitle: const Text('Visible across the whole church rather than a single fellowship.'),
                          value: _shared,
                          onChanged: (v) => setState(() {
                            _shared = v;
                            if (v) _fellowshipSlug = null;
                          }),
                        ),
                        if (!_shared) ...[
                          const SizedBox(height: 8),
                          _buildFellowshipDropdown(theme),
                        ],
                        const SizedBox(height: 20),
                        Text('Status', style: theme.textTheme.labelLarge),
                        const SizedBox(height: 8),
                        SegmentedButton<String>(
                          segments: const [
                            ButtonSegment(value: 'draft', label: Text('Draft')),
                            ButtonSegment(value: 'published', label: Text('Published')),
                            ButtonSegment(value: 'archived', label: Text('Archived')),
                          ],
                          selected: {_status},
                          onSelectionChanged: (s) => setState(() => _status = s.first),
                        ),
                      ],
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 14),
                    Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
                  ],
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _saving ? null : () => Navigator.of(context).maybePop(),
                          style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 15)),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: _saving ? null : _save,
                          style: FilledButton.styleFrom(
                            backgroundColor: theme.colorScheme.primary,
                            foregroundColor: theme.colorScheme.onPrimary,
                            padding: const EdgeInsets.symmetric(vertical: 15),
                          ),
                          child: _saving
                              ? const SizedBox(
                                  height: 18,
                                  width: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Text('Save details'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1100),
              child: _buildPhotoSection(theme),
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildDateField(ThemeData theme) {
    final current = DateTime.tryParse(_date);
    final display = current == null ? '' : DateFormat('d MMM yyyy').format(current.toLocal());
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text('Date', style: theme.textTheme.labelLarge),
            Text(' *', style: TextStyle(color: theme.colorScheme.error)),
          ],
        ),
        const SizedBox(height: 8),
        InkWell(
          borderRadius: BorderRadius.circular(AppRadii.md),
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: current ?? DateTime.now(),
              firstDate: DateTime(2000),
              lastDate: DateTime(2100),
            );
            if (picked != null) setState(() => _date = picked.toIso8601String());
          },
          child: InputDecorator(
            decoration: const InputDecoration(suffixIcon: Icon(Icons.calendar_today_rounded, size: 18)),
            child: Text(display.isEmpty ? 'Select date' : display, style: theme.textTheme.bodyMedium),
          ),
        ),
      ],
    );
  }

  Widget _buildFellowshipDropdown(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Fellowship', style: theme.textTheme.labelLarge),
        const SizedBox(height: 8),
        DropdownButtonFormField<String?>(
          initialValue: _fellowshipSlug != null && kFellowshipLabels.containsKey(_fellowshipSlug) ? _fellowshipSlug : null,
          items: [
            const DropdownMenuItem(value: null, child: Text('—')),
            for (final e in kFellowshipLabels.entries) DropdownMenuItem(value: e.key, child: Text(e.value)),
          ],
          onChanged: (v) => setState(() => _fellowshipSlug = v),
        ),
      ],
    );
  }

  Widget _buildPhotoSection(ThemeData theme) {
    if (_albumId == null) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(AppRadii.card),
        ),
        child: Row(
          children: [
            Icon(Icons.info_outline_rounded, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Save the album first to add photos.',
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text('Photos', style: theme.textTheme.titleMedium)),
            if (_photoBusy) ...[
              const SizedBox(
                height: 16,
                width: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(width: 12),
            ],
            FilledButton.icon(
              onPressed: _photoBusy ? null : _openAddPhotosSheet,
              icon: const Icon(Icons.add_photo_alternate_outlined, size: 18),
              label: const Text('Add photos'),
              style: FilledButton.styleFrom(
                backgroundColor: theme.colorScheme.primary,
                foregroundColor: theme.colorScheme.onPrimary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        if (_photos.isEmpty)
          const EmptyState(
            icon: Icons.photo_outlined,
            title: 'No photos yet',
            message: 'Add photos from the media library or a video link.',
          )
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 160,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
            ),
            itemCount: _photos.length,
            itemBuilder: (context, i) {
              final photo = _photos[i];
              return _PhotoTile(photo: photo, onDelete: () => _deletePhoto(photo));
            },
          ),
      ],
    );
  }
}

/// Tiny wrapper so the fetched video-poster `MediaItem` only has to carry
/// what this screen needs (its `ImageAsset` form) past the try/catch.
class MediaItemLike {
  const MediaItemLike(this.image);
  final ImageAsset image;
}

class _PhotoTile extends StatelessWidget {
  const _PhotoTile({required this.photo, required this.onDelete});

  final GalleryPhoto photo;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadii.md),
      child: Stack(
        fit: StackFit.expand,
        children: [
          PortalImage(url: photo.image.url),
          if (photo.video != null)
            Center(
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.45), shape: BoxShape.circle),
                child: const Icon(Icons.play_circle_fill, color: Colors.white, size: 28),
              ),
            ),
          Positioned(
            top: 6,
            right: 6,
            child: Material(
              color: Colors.black.withValues(alpha: 0.55),
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: onDelete,
                child: const Padding(
                  padding: EdgeInsets.all(6),
                  child: Icon(Icons.delete_outline_rounded, size: 16, color: Colors.white),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
