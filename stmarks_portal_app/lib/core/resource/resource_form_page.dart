import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../widgets/confirm_dialog.dart';
import '../../widgets/image_picker_field.dart';
import '../../widgets/localized_field.dart';
import '../../widgets/media_picker_sheet.dart';
import '../../widgets/paragraphs_field.dart';
import '../api/resource_repository.dart';
import '../models/common.dart';
import '../theme/app_theme.dart';
import 'field_def.dart';
import '../../widgets/app_surface.dart';

/// Generic, config-driven create/edit form — mirrors the web app's
/// `ResourceFormPage`. Works against a plain `Map<String, dynamic>` of wire
/// -format form data so one renderer covers every content type; each module
/// only supplies its [FieldDef] list plus how to seed/serialize that map.
class ResourceFormPage<T> extends ConsumerStatefulWidget {
  const ResourceFormPage({
    super.key,
    required this.title,
    required this.fields,
    required this.repository,
    required this.defaultFormData,
    this.itemId,
    this.toFormData,
    this.statusEditable = true,
    this.onSaved,
    this.extraValidate,
  });

  final String title;
  final List<FieldDef> fields;
  final ResourceRepository<T> repository;
  final Map<String, dynamic> Function() defaultFormData;
  final String? itemId;
  final Map<String, dynamic> Function(T)? toFormData;
  final bool statusEditable;
  final void Function(T item)? onSaved;
  final String? Function(Map<String, dynamic> data)? extraValidate;

  @override
  ConsumerState<ResourceFormPage<T>> createState() => _ResourceFormPageState<T>();
}

class _ResourceFormPageState<T> extends ConsumerState<ResourceFormPage<T>> {
  Map<String, dynamic> _data = {};
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String _status = 'draft';

  bool get _isEdit => widget.itemId != null;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    if (!_isEdit) {
      setState(() {
        _data = widget.defaultFormData();
        _loading = false;
      });
      return;
    }
    try {
      final item = await widget.repository.getOne(widget.itemId!);
      final formData = widget.toFormData?.call(item) ?? {};
      String status = 'draft';
      try {
        final dynamic s = (item as dynamic).status;
        if (s is String) status = s;
      } catch (_) {}
      setState(() {
        _data = formData;
        _status = status;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Could not load — $e';
        _loading = false;
      });
    }
  }

  void _patch(Map<String, dynamic> patch) {
    setState(() => _data = {..._data, ...patch});
  }

  String? _validationError() {
    for (final f in widget.fields) {
      if (!f.required) continue;
      final v = _data[f.key];
      switch (f.kind) {
        case FieldKind.localized:
          final loc = LocalizedText.fromJson(v as Map<String, dynamic>?);
          if (loc.isEmpty) return '${f.label} is required';
          break;
        case FieldKind.date:
        case FieldKind.datetime:
          if (v == null || (v is String && v.isEmpty)) return '${f.label} is required';
          break;
        case FieldKind.select:
          if (v == null || (v is String && v.isEmpty)) return '${f.label} is required';
          break;
        case FieldKind.image:
        case FieldKind.file:
          if (v == null) return '${f.label} is required';
          break;
        default:
          break;
      }
    }
    return widget.extraValidate?.call(_data);
  }

  Future<void> _save({String? overrideStatus}) async {
    final err = _validationError();
    if (err != null) {
      showAppSnackBar(context, err, error: true);
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final payload = {..._data};
      T saved;
      if (_isEdit) {
        saved = await widget.repository.update(widget.itemId!, payload);
        final targetStatus = overrideStatus ?? _status;
        saved = await widget.repository.setStatus(widget.itemId!, targetStatus);
      } else {
        saved = await widget.repository.create(payload);
        final targetStatus = overrideStatus ?? _status;
        if (targetStatus != 'draft') {
          final idGetter = (saved as dynamic).id as String;
          saved = await widget.repository.setStatus(idGetter, targetStatus);
        }
      }
      widget.onSaved?.call(saved);
      if (mounted) {
        showAppSnackBar(context, _isEdit ? 'Saved' : 'Created');
        Navigator.of(context).maybePop(true);
      }
    } catch (e) {
      setState(() => _error = 'Could not save — $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    if (widget.itemId == null) return;
    final confirmed = await showConfirmDialog(
      context,
      title: 'Delete ${widget.title}?',
      message: 'This permanently removes the record. This action cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    );
    if (!confirmed) return;
    try {
      await widget.repository.remove(widget.itemId!);
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
                    child: Text(_isEdit ? 'Edit ${widget.title}' : 'New ${widget.title}', style: theme.textTheme.headlineSmall),
                  ),
                  if (_isEdit)
                    IconButton(
                      icon: Icon(LucideIcons.trash2, color: theme.colorScheme.error),
                      onPressed: _delete,
                      tooltip: 'Delete',
                    ),
                ],
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: ShapeDecoration(
        color: theme.colorScheme.surface,
        shape: appSquircle(AppRadii.card, side: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.7))),
      ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final field in widget.fields) ...[
                      _buildField(field),
                      const SizedBox(height: 20),
                    ],
                    if (widget.statusEditable) ...[
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
                      onPressed: _saving ? null : () => _save(),
                      style: FilledButton.styleFrom(
                        backgroundColor: theme.colorScheme.primary,
                        foregroundColor: theme.colorScheme.onPrimary,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                      ),
                      child: _saving
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text(_isEdit ? 'Save changes' : 'Create'),
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

  Widget _buildField(FieldDef f) {
    switch (f.kind) {
      case FieldKind.localized:
        return LocalizedField(
          label: f.label,
          required: f.required,
          maxLines: f.multiline ? 4 : 1,
          hint: f.hint,
          value: LocalizedText.fromJson(_data[f.key] as Map<String, dynamic>?),
          onChanged: (v) => _patch({f.key: v.toJson()}),
        );
      case FieldKind.paragraphs:
        final raw = (_data[f.key] as List<dynamic>? ?? []);
        final list = raw.map((e) => LocalizedText.fromJson(e as Map<String, dynamic>?)).toList();
        return ParagraphsField(
          label: f.label,
          value: list,
          onChanged: (v) => _patch({f.key: v.map((e) => e.toJson()).toList()}),
        );
      case FieldKind.date:
      case FieldKind.datetime:
        return _DateField(
          label: f.label,
          required: f.required,
          withTime: f.kind == FieldKind.datetime,
          isoValue: _data[f.key] as String?,
          onChanged: (v) => _patch({f.key: v}),
        );
      case FieldKind.checkbox:
        return _CheckboxField(
          label: f.label,
          hint: f.hint,
          value: _data[f.key] as bool? ?? false,
          onChanged: (v) => _patch({f.key: v}),
        );
      case FieldKind.select:
        return _SelectField(
          label: f.label,
          required: f.required,
          options: f.options ?? const [],
          value: _data[f.key] as String?,
          onChanged: (v) => _patch({f.key: v}),
        );
      case FieldKind.image:
        final raw = _data[f.key];
        return ImagePickerField(
          label: f.label,
          value: raw != null ? ImageAsset.fromJson(raw as Map<String, dynamic>) : null,
          onChanged: (v) => _patch({f.key: v?.toJson()}),
        );
      case FieldKind.file:
        return _FileField(label: f.label, data: _data, patch: _patch, urlKey: f.key);
      case FieldKind.custom:
        return f.customBuilder!(context, _data, _patch);
    }
  }
}

class _DateField extends StatelessWidget {
  const _DateField({required this.label, required this.required, required this.withTime, required this.isoValue, required this.onChanged});

  final String label;
  final bool required;
  final bool withTime;
  final String? isoValue;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final current = isoValue != null && isoValue!.isNotEmpty ? DateTime.tryParse(isoValue!) : null;
    final display = current == null
        ? ''
        : (withTime ? DateFormat('d MMM yyyy · h:mm a').format(current.toLocal()) : DateFormat('d MMM yyyy').format(current.toLocal()));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [Text(label, style: theme.textTheme.labelLarge), if (required) Text(' *', style: TextStyle(color: theme.colorScheme.error))]),
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
            DateTime result = date;
            if (withTime && context.mounted) {
              final time = await showTimePicker(
                context: context,
                initialTime: current != null ? TimeOfDay.fromDateTime(current) : TimeOfDay.now(),
              );
              if (time != null) {
                result = DateTime(date.year, date.month, date.day, time.hour, time.minute);
              }
            }
            onChanged(result.toIso8601String());
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

class _CheckboxField extends StatelessWidget {
  const _CheckboxField({required this.label, this.hint, required this.value, required this.onChanged});
  final String label;
  final String? hint;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(label),
      subtitle: hint != null ? Text(hint!) : null,
      value: value,
      onChanged: onChanged,
    );
  }
}

class _SelectField extends StatelessWidget {
  const _SelectField({required this.label, required this.required, required this.options, required this.value, required this.onChanged});
  final String label;
  final bool required;
  final List<MapEntry<String, String>> options;
  final String? value;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [Text(label, style: theme.textTheme.labelLarge), if (required) Text(' *', style: TextStyle(color: theme.colorScheme.error))]),
        const SizedBox(height: 8),
        DropdownButtonFormField<String?>(
          initialValue: value != null && options.any((o) => o.key == value) ? value : null,
          items: [
            const DropdownMenuItem(value: null, child: Text('—')),
            for (final o in options) DropdownMenuItem(value: o.key, child: Text(o.value)),
          ],
          onChanged: onChanged,
        ),
      ],
    );
  }
}

class _FileField extends ConsumerWidget {
  const _FileField({required this.label, required this.data, required this.patch, required this.urlKey});
  final String label;
  final Map<String, dynamic> data;
  final void Function(Map<String, dynamic>) patch;
  final String urlKey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final url = data[urlKey] as String?;
    final format = data['format'] as String?;
    final size = data['size'] as String?;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.labelLarge),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(border: Border.all(color: theme.colorScheme.outline), borderRadius: BorderRadius.circular(AppRadii.md)),
          child: Row(
            children: [
              Icon(LucideIcons.file, color: theme.colorScheme.onSurfaceVariant),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  url == null ? 'No file selected' : '${format ?? ''} · ${size ?? ''}'.trim(),
                  style: theme.textTheme.bodyMedium,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              TextButton(
                onPressed: () async {
                  final selected = await showMediaPickerSheet(context);
                  if (selected != null && selected.isNotEmpty) {
                    final m = selected.first;
                    patch({urlKey: m.url, 'format': m.format, 'size': m.size});
                  }
                },
                child: Text(url == null ? 'Choose' : 'Change'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Format and size are computed automatically at upload time.',
          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
      ],
    );
  }
}
