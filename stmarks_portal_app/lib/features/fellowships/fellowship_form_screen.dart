import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/common.dart';
import '../../core/models/content.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/image_picker_field.dart';
import '../../widgets/localized_field.dart';
import '../../widgets/paragraphs_field.dart';
import 'fellowships_repository_provider.dart';

/// Custom create/edit form for Fellowships — doesn't use the generic
/// `ResourceFormPage` because of the fixed slug dropdown (locked once
/// created) and the dynamic committee-member list editor, neither of which
/// fit the shared `FieldDef` model. Mirrors its visual conventions and
/// `_save()` semantics closely.
class FellowshipFormScreen extends ConsumerStatefulWidget {
  const FellowshipFormScreen({super.key, this.id});

  final String? id;

  @override
  ConsumerState<FellowshipFormScreen> createState() => _FellowshipFormScreenState();
}

class _FellowshipFormScreenState extends ConsumerState<FellowshipFormScreen> {
  Map<String, dynamic> _data = {};
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String _status = 'draft';

  bool get _isEdit => widget.id != null;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Map<String, dynamic> _defaults() => {
    'slug': kFellowshipSlugs.first,
    'name': LocalizedText.empty.toJson(),
    'tagline': LocalizedText.empty.toJson(),
    'about': <Map<String, dynamic>>[],
    'vision': LocalizedText.empty.toJson(),
    'schedule': LocalizedText.empty.toJson(),
    'memberCount': null,
    'banner': null,
    'committee': <Map<String, dynamic>>[],
    'coordinator': {'name': LocalizedText.empty.toJson()},
    'order': 0,
  };

  Future<void> _init() async {
    if (!_isEdit) {
      setState(() {
        _data = _defaults();
        _loading = false;
      });
      return;
    }
    try {
      final repo = ref.read(fellowshipsRepositoryProvider);
      final item = await repo.getOne(widget.id!);
      setState(() {
        _data = item.toJson();
        _status = item.status ?? 'draft';
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

  List<LocalizedText> get _about =>
      (_data['about'] as List<dynamic>? ?? []).map((e) => LocalizedText.fromJson(e as Map<String, dynamic>?)).toList();

  List<FellowshipCommitteeMember> get _committee => (_data['committee'] as List<dynamic>? ?? [])
      .map((e) => FellowshipCommitteeMember.fromJson(e as Map<String, dynamic>))
      .toList();

  void _updateCommittee(List<FellowshipCommitteeMember> list) =>
      _patch({'committee': list.map((e) => e.toJson()).toList()});

  FellowshipCoordinator get _coordinator => FellowshipCoordinator.fromJson(_data['coordinator'] as Map<String, dynamic>?);

  void _updateCoordinator(FellowshipCoordinator c) => _patch({'coordinator': c.toJson()});

  Future<void> _save() async {
    final name = LocalizedText.fromJson(_data['name'] as Map<String, dynamic>?);
    final tagline = LocalizedText.fromJson(_data['tagline'] as Map<String, dynamic>?);
    if (name.isEmpty) {
      showAppSnackBar(context, 'Name is required', error: true);
      return;
    }
    if (tagline.isEmpty) {
      showAppSnackBar(context, 'Tagline is required', error: true);
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final repo = ref.read(fellowshipsRepositoryProvider);
      final payload = {..._data};
      Fellowship saved;
      if (_isEdit) {
        saved = await repo.update(widget.id!, payload);
        saved = await repo.setStatus(widget.id!, _status);
      } else {
        saved = await repo.create(payload);
        if (_status != 'draft') {
          saved = await repo.setStatus(saved.id, _status);
        }
      }
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
    if (widget.id == null) return;
    final confirmed = await showConfirmDialog(
      context,
      title: 'Delete fellowship?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    );
    if (!confirmed) return;
    try {
      final repo = ref.read(fellowshipsRepositoryProvider);
      await repo.remove(widget.id!);
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
      padding: const EdgeInsets.all(20),
      child: Center(
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
                    child: Text(
                      _isEdit ? 'Edit fellowship' : 'New fellowship',
                      style: theme.textTheme.headlineSmall,
                    ),
                  ),
                  if (_isEdit)
                    IconButton(
                      icon: Icon(Icons.delete_outline_rounded, color: theme.colorScheme.error),
                      onPressed: _delete,
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
                    _buildSlugField(theme),
                    const SizedBox(height: 20),
                    LocalizedField(
                      label: 'Name',
                      required: true,
                      value: LocalizedText.fromJson(_data['name'] as Map<String, dynamic>?),
                      onChanged: (v) => _patch({'name': v.toJson()}),
                    ),
                    const SizedBox(height: 20),
                    LocalizedField(
                      label: 'Tagline',
                      required: true,
                      value: LocalizedText.fromJson(_data['tagline'] as Map<String, dynamic>?),
                      onChanged: (v) => _patch({'tagline': v.toJson()}),
                    ),
                    const SizedBox(height: 20),
                    ParagraphsField(
                      label: 'About',
                      value: _about,
                      onChanged: (v) => _patch({'about': v.map((e) => e.toJson()).toList()}),
                    ),
                    const SizedBox(height: 20),
                    LocalizedField(
                      label: 'Vision',
                      maxLines: 4,
                      value: LocalizedText.fromJson(_data['vision'] as Map<String, dynamic>?),
                      onChanged: (v) => _patch({'vision': v.toJson()}),
                    ),
                    const SizedBox(height: 20),
                    LocalizedField(
                      label: 'Schedule',
                      hint: 'e.g. Every Sunday, 4:00 PM',
                      value: LocalizedText.fromJson(_data['schedule'] as Map<String, dynamic>?),
                      onChanged: (v) => _patch({'schedule': v.toJson()}),
                    ),
                    const SizedBox(height: 20),
                    _NumberField(
                      label: 'Member count',
                      value: _data['memberCount'] as num?,
                      onChanged: (v) => _patch({'memberCount': v}),
                    ),
                    const SizedBox(height: 20),
                    ImagePickerField(
                      label: 'Banner',
                      value: _data['banner'] != null ? ImageAsset.fromJson(_data['banner'] as Map<String, dynamic>) : null,
                      onChanged: (v) => _patch({'banner': v?.toJson()}),
                    ),
                    const SizedBox(height: 20),
                    _buildCommitteeSection(theme),
                    const SizedBox(height: 20),
                    _buildCoordinatorSection(theme),
                    const SizedBox(height: 20),
                    _NumberField(
                      label: 'Order',
                      value: _data['order'] as num? ?? 0,
                      allowNull: false,
                      onChanged: (v) => _patch({'order': v ?? 0}),
                    ),
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
                          : Text(_isEdit ? 'Save changes' : 'Create'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSlugField(ThemeData theme) {
    final slug = _data['slug'] as String? ?? kFellowshipSlugs.first;
    if (_isEdit) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Fellowship type', style: theme.textTheme.labelLarge),
          const SizedBox(height: 8),
          InputDecorator(
            decoration: const InputDecoration(enabled: false),
            child: Text(kFellowshipLabels[slug] ?? slug),
          ),
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text('Fellowship type', style: theme.textTheme.labelLarge),
            Text(' *', style: TextStyle(color: theme.colorScheme.error)),
          ],
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          initialValue: kFellowshipSlugs.contains(slug) ? slug : kFellowshipSlugs.first,
          items: [
            for (final s in kFellowshipSlugs) DropdownMenuItem(value: s, child: Text(kFellowshipLabels[s] ?? s)),
          ],
          onChanged: (v) {
            if (v != null) _patch({'slug': v});
          },
        ),
      ],
    );
  }

  Widget _buildCommitteeSection(ThemeData theme) {
    final members = _committee;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Committee', style: theme.textTheme.labelLarge),
        const SizedBox(height: 8),
        for (var i = 0; i < members.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                border: Border.all(color: theme.colorScheme.outline),
                borderRadius: BorderRadius.circular(AppRadii.md),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 110,
                    child: ImagePickerField(
                      label: 'Photo',
                      value: members[i].image,
                      onChanged: (img) {
                        final next = [...members];
                        final m = next[i];
                        next[i] = FellowshipCommitteeMember(id: m.id, name: m.name, designation: m.designation, image: img);
                        _updateCommittee(next);
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        LocalizedField(
                          label: 'Name',
                          value: members[i].name,
                          onChanged: (v) {
                            final next = [...members];
                            next[i] = next[i].copyWith(name: v);
                            _updateCommittee(next);
                          },
                        ),
                        const SizedBox(height: 10),
                        LocalizedField(
                          label: 'Designation',
                          value: members[i].designation,
                          onChanged: (v) {
                            final next = [...members];
                            next[i] = next[i].copyWith(designation: v);
                            _updateCommittee(next);
                          },
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline_rounded, size: 20),
                    tooltip: 'Remove member',
                    onPressed: () {
                      final next = [...members]..removeAt(i);
                      _updateCommittee(next);
                    },
                  ),
                ],
              ),
            ),
          ),
        OutlinedButton.icon(
          onPressed: () {
            final next = [
              ...members,
              FellowshipCommitteeMember(
                id: DateTime.now().microsecondsSinceEpoch.toString(),
                name: LocalizedText.empty,
                designation: LocalizedText.empty,
              ),
            ];
            _updateCommittee(next);
          },
          icon: const Icon(Icons.add_rounded, size: 16),
          label: const Text('Add committee member'),
        ),
      ],
    );
  }

  Widget _buildCoordinatorSection(ThemeData theme) {
    final coordinator = _coordinator;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Coordinator', style: theme.textTheme.labelLarge),
        const SizedBox(height: 8),
        LocalizedField(
          label: 'Name',
          value: coordinator.name,
          onChanged: (v) => _updateCoordinator(coordinator.copyWith(name: v)),
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth > 480;
            final phoneField = TextFormField(
              initialValue: coordinator.phone ?? '',
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Phone', isDense: true),
              onChanged: (v) => _updateCoordinator(coordinator.copyWith(phone: v)),
            );
            final emailField = TextFormField(
              initialValue: coordinator.email ?? '',
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email', isDense: true),
              onChanged: (v) => _updateCoordinator(coordinator.copyWith(email: v)),
            );
            if (wide) {
              return Row(
                children: [
                  Expanded(child: phoneField),
                  const SizedBox(width: 12),
                  Expanded(child: emailField),
                ],
              );
            }
            return Column(children: [phoneField, const SizedBox(height: 10), emailField]);
          },
        ),
      ],
    );
  }
}

class _NumberField extends StatelessWidget {
  const _NumberField({required this.label, required this.value, required this.onChanged, this.allowNull = true});

  final String label;
  final num? value;
  final bool allowNull;
  final ValueChanged<int?> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.labelLarge),
        const SizedBox(height: 8),
        TextFormField(
          initialValue: value?.toString() ?? '',
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(isDense: true),
          onChanged: (v) {
            if (v.trim().isEmpty) {
              onChanged(allowNull ? null : 0);
              return;
            }
            onChanged(int.tryParse(v.trim()));
          },
        ),
      ],
    );
  }
}
