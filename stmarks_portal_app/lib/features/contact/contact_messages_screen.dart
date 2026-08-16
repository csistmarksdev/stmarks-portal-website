import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/models/admin.dart';
import '../../core/models/common.dart';
import '../../core/notifications/contact_watcher.dart';
import '../../core/notifications/notification_service.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/app_surface.dart';

/// Contact messages inbox — lists messages submitted through the public
/// contact form, with unread tracking, a detail view and delete.
class ContactMessagesScreen extends ConsumerStatefulWidget {
  const ContactMessagesScreen({super.key});

  @override
  ConsumerState<ContactMessagesScreen> createState() => _ContactMessagesScreenState();
}

class _ContactMessagesScreenState extends ConsumerState<ContactMessagesScreen> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  bool _unreadOnly = false;

  List<ContactMessage> _items = [];
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
      final api = ref.read(apiClientProvider);
      final json = await api.get<Map<String, dynamic>>(
        '/admin/contact-messages',
        params: {
          'page': append ? _page + 1 : 1,
          'pageSize': 20,
          'unread': _unreadOnly ? true : null,
          'search': _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
        },
      );
      final result = Paginated.fromJson(json, ContactMessage.fromJson);
      // Reading the inbox is the moment the alert has done its job.
      unawaited(NotificationService.instance.cancelAll());
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

  void _onSearchChanged(String _) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), _load);
  }

  Future<void> _markRead(ContactMessage m) async {
    if (m.read) return;
    // Optimistic update.
    setState(() {
      final idx = _items.indexWhere((i) => i.id == m.id);
      if (idx != -1) {
        _items[idx] = ContactMessage(
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          subject: m.subject,
          message: m.message,
          read: true,
          createdAt: m.createdAt,
        );
      }
    });
    try {
      final api = ref.read(apiClientProvider);
      await api.patch<dynamic>('/admin/contact-messages/${m.id}/read', data: {'read': true});
      final current = ref.read(unreadContactCountProvider);
      if (current > 0) ref.read(unreadContactCountProvider.notifier).state = current - 1;
    } catch (_) {
      // Non-fatal — leave the optimistic state as-is.
    }
  }

  Future<void> _delete(ContactMessage m) async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Delete message?',
      message: 'This will permanently delete the message from ${m.name}. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    );
    if (!confirmed) return;
    try {
      final api = ref.read(apiClientProvider);
      await api.delete('/admin/contact-messages/${m.id}');
      if (mounted) {
        Navigator.of(context).maybePop();
        setState(() => _items.removeWhere((i) => i.id == m.id));
        showAppSnackBar(context, 'Message deleted');
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Delete failed — $e', error: true);
    }
  }

  Future<void> _openDetail(ContactMessage m) async {
    await _markRead(m);
    if (!mounted) return;
    final current = _items.firstWhere((i) => i.id == m.id, orElse: () => m);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _MessageDetailSheet(message: current, onDelete: () => _delete(current)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

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
                  Text('Contact messages', style: theme.textTheme.headlineMedium),
                  const SizedBox(height: 4),
                  Text(
                    'Messages submitted through the public contact form.',
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
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
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      onChanged: _onSearchChanged,
                      decoration: const InputDecoration(
                        hintText: 'Search by name, email or subject…',
                        prefixIcon: Icon(LucideIcons.search),
                        isDense: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  FilterChip(
                    label: const Text('Unread only'),
                    selected: _unreadOnly,
                    onSelected: (v) {
                      setState(() => _unreadOnly = v);
                      _load();
                    },
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
                icon: LucideIcons.mailOpen,
                title: 'No messages',
                message: 'Contact form submissions will show up here.',
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, kFloatingDockHeight + 24),
              sliver: SliverList.separated(
                itemCount: _items.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, i) => _MessageRow(message: _items[i], onTap: () => _openDetail(_items[i])),
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

class _MessageRow extends StatelessWidget {
  const _MessageRow({required this.message, required this.onTap});

  final ContactMessage message;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final unread = !message.read;
    DateTime? date;
    try {
      date = DateTime.parse(message.createdAt).toLocal();
    } catch (_) {}

    return Material(
      color: theme.colorScheme.surface,
      shape: appSquircle(
        AppRadii.card,
        side: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.7)),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        customBorder: appSquircle(AppRadii.card),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: unread ? theme.colorScheme.primary : Colors.transparent,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            message.subject.isEmpty ? '(No subject)' : message.subject,
                            style: theme.textTheme.bodyLarge?.copyWith(
                              fontWeight: unread ? FontWeight.w700 : FontWeight.w500,
                              color: unread ? theme.colorScheme.primary : null,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          date != null ? DateFormat('d MMM yyyy').format(date) : '',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(message.name, style: theme.textTheme.bodySmall),
                    const SizedBox(height: 4),
                    Text(
                      message.message,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MessageDetailSheet extends StatelessWidget {
  const _MessageDetailSheet({required this.message, required this.onDelete});

  final ContactMessage message;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    DateTime? date;
    try {
      date = DateTime.parse(message.createdAt).toLocal();
    } catch (_) {}

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: 20 + MediaQuery.of(context).viewInsets.bottom,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(message.subject.isEmpty ? '(No subject)' : message.subject, style: theme.textTheme.headlineSmall),
              const SizedBox(height: 4),
              if (date != null)
                Text(
                  DateFormat('d MMM yyyy, h:mm a').format(date),
                  style: theme.textTheme.bodySmall,
                ),
              const SizedBox(height: 16),
              _DetailRow(icon: LucideIcons.user, label: message.name),
              const SizedBox(height: 8),
              _DetailRow(icon: LucideIcons.mail, label: message.email),
              if (message.phone != null && message.phone!.isNotEmpty) ...[
                const SizedBox(height: 8),
                _DetailRow(icon: LucideIcons.phone, label: message.phone!),
              ],
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: ShapeDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        shape: appSquircle(16),
      ),
                child: Text(message.message, style: theme.textTheme.bodyMedium),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onDelete,
                      icon: Icon(LucideIcons.trash2, color: theme.colorScheme.error),
                      label: Text('Delete', style: TextStyle(color: theme.colorScheme.error)),
                      style: OutlinedButton.styleFrom(side: BorderSide(color: theme.colorScheme.error)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => Navigator.of(context).maybePop(),
                      child: const Text('Close'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Icon(icon, size: 18, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(width: 8),
        Expanded(child: Text(label, style: theme.textTheme.bodyMedium)),
      ],
    );
  }
}
