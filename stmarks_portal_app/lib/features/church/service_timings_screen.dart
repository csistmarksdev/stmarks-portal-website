import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/models/common.dart';
import '../../core/models/content.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/localized_field.dart';
import '../../widgets/app_surface.dart';

/// Editor for the church's weekly service timings list — a singleton
/// document (`{items: ServiceTiming[]}`) rather than a paginated resource,
/// so the whole list is loaded and saved in one shot.
class ServiceTimingsScreen extends ConsumerStatefulWidget {
  const ServiceTimingsScreen({super.key});

  @override
  ConsumerState<ServiceTimingsScreen> createState() => _ServiceTimingsScreenState();
}

class _ServiceTimingsScreenState extends ConsumerState<ServiceTimingsScreen> {
  bool _loading = true;
  bool _saving = false;
  String? _error;
  List<ServiceTiming> _items = [];

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
      final res = await ref.read(apiClientProvider).get<dynamic>('/admin/church/service-timings');
      List<dynamic> raw = [];
      if (res is Map<String, dynamic>) {
        raw = res['items'] as List<dynamic>? ?? res['data'] as List<dynamic>? ?? [];
      } else if (res is List<dynamic>) {
        raw = res;
      }
      final items = raw.map((e) => ServiceTiming.fromJson(e as Map<String, dynamic>)).toList();
      setState(() {
        _items = items;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        // Not set up in DB yet — start with empty list so user can add rows
        setState(() {
          _items = [];
          _loading = false;
        });
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
    setState(() => _saving = true);
    try {
      await ref.read(apiClientProvider).put(
        '/admin/church/service-timings',
        data: {'items': _items.map((e) => e.toJson()).toList()},
      );
      if (mounted) showAppSnackBar(context, 'Saved');
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Could not save — $e', error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _addRow() {
    setState(() {
      _items = [
        ..._items,
        const ServiceTiming(
          id: '',
          day: LocalizedText.empty,
          time: LocalizedText.empty,
          service: LocalizedText.empty,
          venue: LocalizedText.empty,
        ),
      ];
    });
  }

  Future<void> _removeRow(int index) async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Remove row?',
      message: 'This row will be removed once you save.',
      confirmLabel: 'Remove',
      destructive: true,
    );
    if (!confirmed) return;
    setState(() {
      final next = [..._items]..removeAt(index);
      _items = next;
    });
  }

  void _updateRow(int index, ServiceTiming updated) {
    setState(() {
      final next = [..._items];
      next[index] = updated;
      _items = next;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

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
                    child: Text('Service timings', style: theme.textTheme.headlineSmall),
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
                for (var i = 0; i < _items.length; i++) ...[
                  _ServiceTimingCard(
                    item: _items[i],
                    onChanged: (v) => _updateRow(i, v),
                    onDelete: () => _removeRow(i),
                  ),
                  const SizedBox(height: 14),
                ],
                OutlinedButton.icon(
                  onPressed: _addRow,
                  icon: const Icon(LucideIcons.plus, size: 18),
                  label: const Text('Add row'),
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
                      : const Text('Save all'),
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

class _ServiceTimingCard extends StatelessWidget {
  const _ServiceTimingCard({required this.item, required this.onChanged, required this.onDelete});

  final ServiceTiming item;
  final ValueChanged<ServiceTiming> onChanged;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: ShapeDecoration(
        color: theme.colorScheme.surface,
        shape: appSquircle(AppRadii.card, side: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.7))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text('Service', style: theme.textTheme.labelLarge),
              ),
              IconButton(
                icon: Icon(LucideIcons.trash2, size: 20, color: theme.colorScheme.error),
                tooltip: 'Delete row',
                onPressed: onDelete,
              ),
            ],
          ),
          const SizedBox(height: 4),
          LocalizedField(
            label: 'Day',
            value: item.day,
            onChanged: (v) => onChanged(item.copyWith(day: v)),
          ),
          const SizedBox(height: 16),
          LocalizedField(
            label: 'Time',
            value: item.time,
            onChanged: (v) => onChanged(item.copyWith(time: v)),
          ),
          const SizedBox(height: 16),
          LocalizedField(
            label: 'Service',
            value: item.service,
            onChanged: (v) => onChanged(item.copyWith(service: v)),
          ),
          const SizedBox(height: 16),
          LocalizedField(
            label: 'Venue',
            value: item.venue,
            onChanged: (v) => onChanged(item.copyWith(venue: v)),
          ),
        ],
      ),
    );
  }
}
