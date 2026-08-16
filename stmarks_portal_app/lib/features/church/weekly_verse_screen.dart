import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/models/common.dart';
import '../../core/models/content.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/localized_field.dart';
import '../../widgets/app_surface.dart';

/// Editor for the church's verse of the week — a singleton document.
class WeeklyVerseScreen extends ConsumerStatefulWidget {
  const WeeklyVerseScreen({super.key});

  @override
  ConsumerState<WeeklyVerseScreen> createState() => _WeeklyVerseScreenState();
}

class _WeeklyVerseScreenState extends ConsumerState<WeeklyVerseScreen> {
  bool _loading = true;
  bool _saving = false;
  String? _error;

  LocalizedText _reference = LocalizedText.empty;
  LocalizedText _text = LocalizedText.empty;
  String _weekOf = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final json = await ref.read(apiClientProvider).get<Map<String, dynamic>>('/admin/church/weekly-verse');
      final verse = WeeklyVerse.fromJson(json);
      setState(() {
        _reference = verse.reference;
        _text = verse.text;
        _weekOf = verse.weekOf;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        setState(() => _loading = false);
      } else {
        setState(() {
          _error = e.message;
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Could not load — $e';
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    if (_reference.isEmpty || _text.isEmpty || _weekOf.isEmpty) {
      showAppSnackBar(context, 'Reference, text and week are required', error: true);
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(apiClientProvider).put(
        '/admin/church/weekly-verse',
        data: WeeklyVerse(reference: _reference, text: _text, weekOf: _weekOf).toJson(),
      );
      if (mounted) showAppSnackBar(context, 'Weekly verse saved');
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Could not save — $e', error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickWeekOf() async {
    final current = _weekOf.isNotEmpty ? DateTime.tryParse(_weekOf) : null;
    final picked = await showDatePicker(
      context: context,
      initialDate: current ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked == null) return;
    setState(() => _weekOf = picked.toIso8601String());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final current = _weekOf.isNotEmpty ? DateTime.tryParse(_weekOf) : null;
    final display = current == null ? '' : DateFormat('d MMM yyyy').format(current.toLocal());

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, appPageTop(context), 20, kFloatingDockHeight + 24),
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
                    child: Text('Verse of the week', style: theme.textTheme.headlineSmall),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 60),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                ErrorRetryState(message: _error!, onRetry: _load)
              else ...[
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: ShapeDecoration(
        color: theme.colorScheme.surface,
        shape: appSquircle(AppRadii.card, side: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.7))),
      ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      LocalizedField(
                        label: 'Reference',
                        value: _reference,
                        required: true,
                        hint: 'e.g. John 3:16',
                        onChanged: (v) => setState(() => _reference = v),
                      ),
                      const SizedBox(height: 20),
                      LocalizedField(
                        label: 'Verse text',
                        value: _text,
                        required: true,
                        maxLines: 4,
                        onChanged: (v) => setState(() => _text = v),
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Text('Week of', style: theme.textTheme.labelLarge),
                          Text(' *', style: TextStyle(color: theme.colorScheme.error)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      InkWell(
                        borderRadius: BorderRadius.circular(AppRadii.md),
                        onTap: _pickWeekOf,
                        child: InputDecorator(
                          decoration: const InputDecoration(suffixIcon: Icon(LucideIcons.calendarDays, size: 18)),
                          child: Text(display.isEmpty ? 'Select date' : display, style: theme.textTheme.bodyMedium),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                FilledButton(
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
                      : const Text('Save'),
                ),
                const SizedBox(height: 40),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
