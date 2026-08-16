import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/models/common.dart';
import '../../core/models/content.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/image_picker_field.dart';
import '../../widgets/localized_field.dart';
import '../../widgets/bilingual_body_editor.dart';
import 'blog_repository_provider.dart';
import '../../widgets/app_surface.dart';

const _kStepTitles = ['Details', 'Write', 'Cover image', 'Review'];

/// Custom 4-step wizard for creating/editing a blog post — mirrors the
/// original web app's blog editor. Uses the same save semantics as
/// [ResourceFormPage]: update/create then a separate setStatus call.
class BlogFormScreen extends ConsumerStatefulWidget {
  const BlogFormScreen({super.key, this.id});

  final String? id;

  @override
  ConsumerState<BlogFormScreen> createState() => _BlogFormScreenState();
}

class _BlogFormScreenState extends ConsumerState<BlogFormScreen> {
  Map<String, dynamic> _data = {};
  int? _readingMinutes;
  bool _loading = true;
  bool _saving = false;
  String? _loadError;
  String _status = 'draft';
  int _currentStep = 0;
  int _furthestStep = 0;

  bool get _isEdit => widget.id != null;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    if (!_isEdit) {
      setState(() {
        _data = _defaultData();
        _loading = false;
      });
      return;
    }
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final repo = ref.read(blogRepositoryProvider);
      final item = await repo.getOne(widget.id!);
      setState(() {
        _data = item.toJson();
        _status = item.status ?? 'draft';
        _readingMinutes = item.readingMinutes;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loadError = 'Could not load — $e';
        _loading = false;
      });
    }
  }

  Map<String, dynamic> _defaultData() => {
    'title': LocalizedText.empty.toJson(),
    'excerpt': LocalizedText.empty.toJson(),
    'body': <Map<String, dynamic>>[],
    'publishedAt': DateTime.now().toIso8601String(),
    'author': LocalizedText.empty.toJson(),
    'coverImage': null,
    'eventSlug': null,
    'fellowshipSlug': null,
  };

  void _patch(Map<String, dynamic> patch) {
    setState(() => _data = {..._data, ...patch});
  }

  LocalizedText _loc(String key) => LocalizedText.fromJson(_data[key] as Map<String, dynamic>?);

  String? _validateStep(int step) {
    switch (step) {
      case 0:
        if (_loc('title').isEmpty) return 'Title is required';
        if (_loc('author').isEmpty) return 'Author is required';
        return null;
      case 1:
        if (_loc('excerpt').isEmpty) return 'Excerpt is required';
        return null;
      default:
        return null;
    }
  }

  void _goNext() {
    final err = _validateStep(_currentStep);
    if (err != null) {
      showAppSnackBar(context, err, error: true);
      return;
    }
    if (_currentStep >= _kStepTitles.length - 1) return;
    setState(() {
      _currentStep++;
      if (_currentStep > _furthestStep) _furthestStep = _currentStep;
    });
  }

  void _goBack() {
    if (_currentStep == 0) {
      Navigator.of(context).maybePop();
      return;
    }
    setState(() => _currentStep--);
  }

  void _goToStep(int step) {
    if (step > _furthestStep || _saving) return;
    setState(() => _currentStep = step);
  }

  Future<void> _save() async {
    for (final s in [0, 1]) {
      final err = _validateStep(s);
      if (err != null) {
        showAppSnackBar(context, err, error: true);
        setState(() => _currentStep = s);
        return;
      }
    }

    setState(() => _saving = true);
    final repo = ref.read(blogRepositoryProvider);
    /*
     * An edit keeps explicit `null`s: the API reads a present `null` as "clear
     * this field" and an absent key as "leave it alone". Stripping nulls here
     * unconditionally used to mean clearing the cover image, the fellowship or
     * the related event slug and hitting Save quietly changed nothing — the
     * key was gone from the payload, so the old value survived on the server.
     *
     * A create has nothing to clear yet, so nulls there would only write one;
     * those are dropped exactly as before.
     */
    final payload = <String, dynamic>{..._data};
    if (!_isEdit) payload.removeWhere((key, value) => value == null);
    try {
      if (_isEdit) {
        await repo.update(widget.id!, payload);
        await repo.setStatus(widget.id!, _status);
      } else {
        final created = await repo.create(payload);
        if (_status != 'draft') {
          await repo.setStatus(created.id, _status);
        }
      }
      if (mounted) {
        showAppSnackBar(context, _isEdit ? 'Saved' : 'Created');
        Navigator.of(context).maybePop(true);
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Could not save — $e', error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    if (widget.id == null) return;
    final confirmed = await showConfirmDialog(
      context,
      title: 'Delete this post?',
      message: 'This permanently removes the record. This action cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    );
    if (!confirmed) return;
    try {
      await ref.read(blogRepositoryProvider).remove(widget.id!);
      if (mounted) Navigator.of(context).maybePop(true);
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Delete failed — $e', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_loadError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_loadError!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              OutlinedButton(onPressed: _init, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }

    final isLastStep = _currentStep == _kStepTitles.length - 1;

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, appPageTop(context), 20, 20),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  IconButton(
                    icon: const Icon(LucideIcons.arrowLeft),
                    onPressed: () => Navigator.of(context).maybePop(),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(_isEdit ? 'Edit post' : 'New post', style: theme.textTheme.headlineSmall),
                  ),
                  if (_isEdit)
                    IconButton(
                      icon: Icon(LucideIcons.trash2, color: theme.colorScheme.error),
                      onPressed: _saving ? null : _delete,
                      tooltip: 'Delete',
                    ),
                ],
              ),
              const SizedBox(height: 20),
              _StepIndicator(current: _currentStep, furthest: _furthestStep, onTap: _goToStep),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: ShapeDecoration(
        color: theme.colorScheme.surface,
        shape: appSquircle(AppRadii.card, side: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.7))),
      ),
                child: _buildStep(_currentStep),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _saving ? null : _goBack,
                      style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 15)),
                      child: Text(_currentStep == 0 ? 'Cancel' : 'Back'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: _saving ? null : (isLastStep ? _save : _goNext),
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
                          : Text(isLastStep ? (_isEdit ? 'Save changes' : 'Create') : 'Next'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: kFloatingDockHeight + 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep(int step) {
    switch (step) {
      case 0:
        return _DetailsStep(data: _data, onPatch: _patch);
      case 1:
        return _WriteStep(data: _data, onPatch: _patch);
      case 2:
        return _CoverStep(data: _data, onPatch: _patch);
      default:
        return _ReviewStep(
          data: _data,
          status: _status,
          readingMinutes: _readingMinutes,
          onStatusChanged: (s) => setState(() => _status = s),
        );
    }
  }
}

enum _StepDotState { current, completed, upcoming }

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.current, required this.furthest, required this.onTap});

  final int current;
  final int furthest;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        for (var i = 0; i < _kStepTitles.length; i++) ...[
          if (i > 0)
            Expanded(
              child: Container(
                height: 2,
                margin: const EdgeInsets.only(bottom: 20),
                color: i <= furthest ? theme.colorScheme.primary : theme.colorScheme.outline.withValues(alpha: 0.5),
              ),
            ),
          _StepDot(
            index: i,
            label: _kStepTitles[i],
            state: i == current
                ? _StepDotState.current
                : (i <= furthest ? _StepDotState.completed : _StepDotState.upcoming),
            enabled: i <= furthest,
            onTap: () => onTap(i),
          ),
        ],
      ],
    );
  }
}

class _StepDot extends StatelessWidget {
  const _StepDot({
    required this.index,
    required this.label,
    required this.state,
    required this.enabled,
    required this.onTap,
  });

  final int index;
  final String label;
  final _StepDotState state;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isCurrent = state == _StepDotState.current;
    final isCompleted = state == _StepDotState.completed;
    final active = isCurrent || isCompleted;

    final bg = active ? theme.colorScheme.primary : theme.colorScheme.surfaceContainerHighest;
    final fg = active ? theme.colorScheme.onPrimary : theme.colorScheme.onSurfaceVariant;

    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(999),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: bg,
                shape: BoxShape.circle,
                border: isCurrent ? Border.all(color: theme.colorScheme.primary, width: 2) : null,
              ),
              alignment: Alignment.center,
              child: isCompleted
                  ? Icon(LucideIcons.check, size: 16, color: fg)
                  : Text(
                      '${index + 1}',
                      style: theme.textTheme.labelMedium?.copyWith(color: fg, fontWeight: FontWeight.w600),
                    ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: theme.textTheme.labelSmall?.copyWith(
                color: isCurrent ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant,
                fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailsStep extends StatelessWidget {
  const _DetailsStep({required this.data, required this.onPatch});

  final Map<String, dynamic> data;
  final void Function(Map<String, dynamic>) onPatch;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = LocalizedText.fromJson(data['title'] as Map<String, dynamic>?);
    final author = LocalizedText.fromJson(data['author'] as Map<String, dynamic>?);
    final fellowshipSlug = data['fellowshipSlug'] as String?;
    final publishedAt = data['publishedAt'] as String?;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Details', style: theme.textTheme.titleMedium),
        const SizedBox(height: 16),
        LocalizedField(
          label: 'Title',
          required: true,
          value: title,
          onChanged: (v) => onPatch({'title': v.toJson()}),
        ),
        const SizedBox(height: 20),
        LocalizedField(
          label: 'Author',
          required: true,
          value: author,
          onChanged: (v) => onPatch({'author': v.toJson()}),
        ),
        const SizedBox(height: 20),
        Text('Fellowship', style: theme.textTheme.labelLarge),
        const SizedBox(height: 8),
        DropdownButtonFormField<String?>(
          initialValue: fellowshipSlug != null && kFellowshipLabels.containsKey(fellowshipSlug) ? fellowshipSlug : null,
          items: [
            const DropdownMenuItem(value: null, child: Text('None')),
            for (final e in kFellowshipLabels.entries) DropdownMenuItem(value: e.key, child: Text(e.value)),
          ],
          onChanged: (v) => onPatch({'fellowshipSlug': v}),
        ),
        const SizedBox(height: 4),
        Text(
          'Optional. Files the post under a fellowship.',
          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 20),
        _PublishedDateField(isoValue: publishedAt, onChanged: (v) => onPatch({'publishedAt': v})),
      ],
    );
  }
}

class _WriteStep extends StatelessWidget {
  const _WriteStep({required this.data, required this.onPatch});

  final Map<String, dynamic> data;
  final void Function(Map<String, dynamic>) onPatch;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final excerpt = LocalizedText.fromJson(data['excerpt'] as Map<String, dynamic>?);
    final body = (data['body'] as List<dynamic>? ?? [])
        .map((e) => LocalizedText.fromJson(e as Map<String, dynamic>?))
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Write', style: theme.textTheme.titleMedium),
        const SizedBox(height: 16),
        LocalizedField(
          label: 'Excerpt',
          required: true,
          maxLines: 3,
          value: excerpt,
          onChanged: (v) => onPatch({'excerpt': v.toJson()}),
        ),
        const SizedBox(height: 4),
        Text(
          'One or two sentences. This is what shows on the blog index and when the post is shared.',
          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 20),
        BilingualBodyEditor(
          label: 'Body',
          value: body,
          onChanged: (v) => onPatch({'body': v.map((e) => e.toJson()).toList()}),
        ),
      ],
    );
  }
}

class _CoverStep extends StatefulWidget {
  const _CoverStep({required this.data, required this.onPatch});

  final Map<String, dynamic> data;
  final void Function(Map<String, dynamic>) onPatch;

  @override
  State<_CoverStep> createState() => _CoverStepState();
}

class _CoverStepState extends State<_CoverStep> {
  late final TextEditingController _eventSlugController;

  @override
  void initState() {
    super.initState();
    _eventSlugController = TextEditingController(text: widget.data['eventSlug'] as String? ?? '');
  }

  @override
  void dispose() {
    _eventSlugController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final raw = widget.data['coverImage'];
    final coverImage = raw != null ? ImageAsset.fromJson(raw as Map<String, dynamic>) : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Presentation', style: theme.textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(
          'Optional — shown at the top of the post and in list cards.',
          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 16),
        ImagePickerField(
          label: 'Cover image',
          value: coverImage,
          onChanged: (v) => widget.onPatch({'coverImage': v?.toJson()}),
        ),
        const SizedBox(height: 20),
        Text('Related event slug', style: theme.textTheme.labelLarge),
        const SizedBox(height: 8),
        TextFormField(
          controller: _eventSlugController,
          decoration: const InputDecoration(hintText: 'e.g. harvest-festival-2026', isDense: true),
          onChanged: (v) => widget.onPatch({'eventSlug': v.trim().isEmpty ? null : v.trim()}),
        ),
        const SizedBox(height: 4),
        Text(
          'Optional. Links the post to an event page.',
          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
      ],
    );
  }
}

class _ReviewStep extends StatelessWidget {
  const _ReviewStep({
    required this.data,
    required this.status,
    required this.readingMinutes,
    required this.onStatusChanged,
  });

  final Map<String, dynamic> data;
  final String status;
  final int? readingMinutes;
  final ValueChanged<String> onStatusChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = LocalizedText.fromJson(data['title'] as Map<String, dynamic>?);
    final author = LocalizedText.fromJson(data['author'] as Map<String, dynamic>?);
    final excerpt = LocalizedText.fromJson(data['excerpt'] as Map<String, dynamic>?);
    final fellowshipSlug = data['fellowshipSlug'] as String?;
    final publishedAt = DateTime.tryParse(data['publishedAt'] as String? ?? '');
    final body = (data['body'] as List<dynamic>? ?? [])
        .map((e) => LocalizedText.fromJson(e as Map<String, dynamic>?))
        .toList();
    final englishParagraphs = body.where((p) => p.en.trim().isNotEmpty).length;
    final tamilParagraphs = body.where((p) => p.ta.trim().isNotEmpty).length;
    final coverRaw = data['coverImage'];
    final coverImage = coverRaw != null ? ImageAsset.fromJson(coverRaw as Map<String, dynamic>) : null;
    final eventSlug = data['eventSlug'] as String?;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Review', style: theme.textTheme.titleMedium),
        const SizedBox(height: 16),
        _ReviewRow(label: 'Title', value: title.en.isNotEmpty ? title.en : title.ta),
        _ReviewRow(label: 'Author', value: author.en.isNotEmpty ? author.en : author.ta),
        _ReviewRow(
          label: 'Published on',
          value: publishedAt != null ? DateFormat('d MMM yyyy').format(publishedAt.toLocal()) : '—',
        ),
        _ReviewRow(
          label: 'Length',
          value: englishParagraphs == 0
              ? '—'
              : '$englishParagraphs paragraph${englishParagraphs == 1 ? '' : 's'} in English'
                    '${tamilParagraphs != englishParagraphs ? (tamilParagraphs == 0 ? ' · no Tamil text' : ' · $tamilParagraphs in Tamil — counts differ') : ''}',
        ),
        _ReviewRow(label: 'Cover image', value: coverImage != null ? (coverImage.alt.en.isNotEmpty ? coverImage.alt.en : 'Selected') : '—'),
        _ReviewRow(
          label: 'Fellowship',
          value: fellowshipSlug != null ? (kFellowshipLabels[fellowshipSlug] ?? fellowshipSlug) : 'None',
        ),
        if (eventSlug != null && eventSlug.isNotEmpty) _ReviewRow(label: 'Related event', value: eventSlug),
        if (readingMinutes != null) _ReviewRow(label: 'Reading time', value: '$readingMinutes min read'),
        const SizedBox(height: 12),
        Text('Excerpt', style: theme.textTheme.labelLarge),
        const SizedBox(height: 6),
        Text(excerpt.en.isNotEmpty ? excerpt.en : excerpt.ta, style: theme.textTheme.bodyMedium),
        const SizedBox(height: 24),
        Text('Status', style: theme.textTheme.labelLarge),
        const SizedBox(height: 8),
        SegmentedButton<String>(
          segments: const [
            ButtonSegment(value: 'draft', label: Text('Draft')),
            ButtonSegment(value: 'published', label: Text('Published')),
            ButtonSegment(value: 'archived', label: Text('Archived')),
          ],
          selected: {status},
          onSelectionChanged: (s) => onStatusChanged(s.first),
        ),
      ],
    );
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
          ),
          Expanded(child: Text(value.isEmpty ? '—' : value, style: theme.textTheme.bodyMedium)),
        ],
      ),
    );
  }
}

class _PublishedDateField extends StatelessWidget {
  const _PublishedDateField({required this.isoValue, required this.onChanged});

  final String? isoValue;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final current = isoValue != null && isoValue!.isNotEmpty ? DateTime.tryParse(isoValue!) : null;
    final display = current != null ? DateFormat('d MMM yyyy').format(current.toLocal()) : '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Published date', style: theme.textTheme.labelLarge),
        const SizedBox(height: 8),
        InkWell(
          borderRadius: BorderRadius.circular(AppRadii.md),
          onTap: () async {
            final date = await showDatePicker(
              context: context,
              initialDate: current ?? DateTime.now(),
              firstDate: DateTime(2000),
              lastDate: DateTime(2100),
            );
            if (date == null) return;
            onChanged(date.toIso8601String());
          },
          child: InputDecorator(
            decoration: const InputDecoration(suffixIcon: Icon(LucideIcons.calendarDays, size: 18)),
            child: Text(display.isEmpty ? 'Select date' : display, style: theme.textTheme.bodyMedium),
          ),
        ),
      ],
    );
  }
}
