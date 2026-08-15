import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/models/admin.dart';
import '../../core/models/common.dart';
import '../../core/providers/providers.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/empty_state.dart';

/// Admin users management — list, create, edit, reset password and delete.
class UsersScreen extends ConsumerStatefulWidget {
  const UsersScreen({super.key});

  @override
  ConsumerState<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends ConsumerState<UsersScreen> {
  final _searchController = TextEditingController();
  Timer? _debounce;

  List<AdminUser> _items = [];
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
        '/admin/users',
        params: {
          'page': append ? _page + 1 : 1,
          'pageSize': 20,
          'search': _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
        },
      );
      final result = Paginated.fromJson(json, AdminUser.fromJson);
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

  Future<void> _createUser() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => const _UserFormDialog(),
    );
    if (result == true) {
      if (mounted) showAppSnackBar(context, 'User saved');
      _load();
    }
  }

  Future<void> _editUser(AdminUser user) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => _UserFormDialog(user: user),
    );
    if (result == true) {
      if (mounted) showAppSnackBar(context, 'User saved');
      _load();
    }
  }

  Future<void> _resetPassword(AdminUser user) async {
    final controller = TextEditingController();
    var obscure = true;
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('Reset password for ${user.name}'),
          content: TextField(
            controller: controller,
            obscureText: obscure,
            autofocus: true,
            onChanged: (_) => setDialogState(() {}),
            decoration: InputDecoration(
              labelText: 'New password (min 8 characters)',
              suffixIcon: IconButton(
                icon: Icon(obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                tooltip: obscure ? 'Show password' : 'Hide password',
                onPressed: () => setDialogState(() => obscure = !obscure),
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(
              onPressed: controller.text.trim().length >= 8 ? () => Navigator.pop(ctx, true) : null,
              child: const Text('Reset password'),
            ),
          ],
        ),
      ),
    );
    if (result != true) return;
    final password = controller.text.trim();
    if (password.length < 8) return;
    try {
      final api = ref.read(apiClientProvider);
      await api.patch<dynamic>('/admin/users/${user.id}/password', data: {'password': password});
      if (mounted) showAppSnackBar(context, 'Password reset — the user must sign in again');
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Could not reset password — $e', error: true);
    }
  }

  Future<void> _deleteUser(AdminUser user) async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Delete ${user.name}?',
      message: 'This will permanently remove their account. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    );
    if (!confirmed) return;
    try {
      final api = ref.read(apiClientProvider);
      await api.delete('/admin/users/${user.id}');
      if (mounted) {
        setState(() => _items.removeWhere((i) => i.id == user.id));
        showAppSnackBar(context, 'User deleted');
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Delete failed — $e', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final can = ref.read(authControllerProvider.notifier).can;
    final canWrite = can('users.write');
    final myId = ref.watch(authControllerProvider).user?.id;

    return RefreshIndicator(
      onRefresh: _load,
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
            sliver: SliverToBoxAdapter(
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                runSpacing: 12,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Users', style: theme.textTheme.headlineMedium),
                      const SizedBox(height: 4),
                      Text(
                        'Who can sign in here, and as what. What each role may do is spelled out under Roles & permissions.',
                        style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                  if (canWrite)
                    FilledButton.icon(
                      onPressed: _createUser,
                      icon: const Icon(Icons.add_rounded, size: 18),
                      label: const Text('New user'),
                      style: FilledButton.styleFrom(
                        backgroundColor: theme.colorScheme.primary,
                        foregroundColor: theme.colorScheme.onPrimary,
                      ),
                    ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            sliver: SliverToBoxAdapter(
              child: TextField(
                controller: _searchController,
                onChanged: _onSearchChanged,
                decoration: const InputDecoration(
                  hintText: 'Search by name or email…',
                  prefixIcon: Icon(Icons.search_rounded),
                  isDense: true,
                ),
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
                icon: Icons.people_alt_outlined,
                title: 'No users yet',
                message: 'Invite your team to the portal.',
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
              sliver: SliverList.separated(
                itemCount: _items.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, i) => _UserRow(
                  user: _items[i],
                  canWrite: canWrite,
                  isSelf: _items[i].id == myId,
                  onEdit: () => _editUser(_items[i]),
                  onResetPassword: () => _resetPassword(_items[i]),
                  onDelete: () => _deleteUser(_items[i]),
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

class _UserRow extends StatelessWidget {
  const _UserRow({
    required this.user,
    required this.canWrite,
    required this.isSelf,
    required this.onEdit,
    required this.onResetPassword,
    required this.onDelete,
  });

  final AdminUser user;
  final bool canWrite;
  final bool isSelf;
  final VoidCallback onEdit;
  final VoidCallback onResetPassword;
  final VoidCallback onDelete;

  String _roleLabel(String role) => role
      .split('-')
      .map((w) => w.isEmpty ? w : w[0].toUpperCase() + w.substring(1))
      .join(' ');

  String _lastLogin() {
    if (user.lastLoginAt == null || user.lastLoginAt!.isEmpty) return 'Never signed in';
    try {
      final date = DateTime.parse(user.lastLoginAt!).toLocal();
      return 'Last seen ${DateFormat('d MMM yyyy, h:mm a').format(date)}';
    } catch (_) {
      return 'Never signed in';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.7)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      user.name,
                      style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    if (isSelf)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.secondaryContainer,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          'you',
                          style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSecondaryContainer),
                        ),
                      ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(_roleLabel(user.role), style: theme.textTheme.labelSmall),
                    ),
                    if (!user.active)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.error.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          'Inactive',
                          style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.error),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(user.email, style: theme.textTheme.bodySmall),
                const SizedBox(height: 2),
                Text(_lastLogin(), style: theme.textTheme.bodySmall),
              ],
            ),
          ),
          if (canWrite)
            PopupMenuButton<String>(
              onSelected: (value) {
                switch (value) {
                  case 'edit':
                    onEdit();
                    break;
                  case 'reset':
                    onResetPassword();
                    break;
                  case 'delete':
                    onDelete();
                    break;
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(value: 'edit', child: Text('Edit')),
                const PopupMenuItem(value: 'reset', child: Text('Reset password')),
                // The account you're signed in as can't delete itself — matches
                // the web app, which never renders this option for `me`.
                if (!isSelf) const PopupMenuItem(value: 'delete', child: Text('Delete')),
              ],
            ),
        ],
      ),
    );
  }
}

class _UserFormDialog extends ConsumerStatefulWidget {
  const _UserFormDialog({this.user});

  final AdminUser? user;

  @override
  ConsumerState<_UserFormDialog> createState() => _UserFormDialogState();
}

class _UserFormDialogState extends ConsumerState<_UserFormDialog> {
  late final _nameController = TextEditingController(text: widget.user?.name ?? '');
  late final _emailController = TextEditingController(text: widget.user?.email ?? '');
  final _passwordController = TextEditingController();
  late String _role = widget.user?.role ?? 'editor';
  late bool _active = widget.user?.active ?? true;
  bool _saving = false;
  bool _obscurePassword = true;
  String? _error;

  bool get _isEdit => widget.user != null;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    if (name.isEmpty || email.isEmpty) {
      setState(() => _error = 'Please fill in all required fields.');
      return;
    }
    if (!_isEdit && _passwordController.text.length < 8) {
      setState(() => _error = 'Password must be at least 8 characters.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      if (_isEdit) {
        await api.patch<dynamic>(
          '/admin/users/${widget.user!.id}',
          data: {'name': name, 'email': email, 'role': _role, 'active': _active},
        );
      } else {
        await api.post<dynamic>(
          '/admin/users',
          data: {
            'name': name,
            'email': email,
            'password': _passwordController.text,
            'role': _role,
            'active': _active,
          },
        );
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() {
        _error = 'Could not save — $e';
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(_isEdit ? 'Edit user' : 'New user'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Name')),
            const SizedBox(height: 12),
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'Email'),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            if (!_isEdit) ...[
              TextField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                decoration: InputDecoration(
                  labelText: 'Password (min 8 characters)',
                  suffixIcon: IconButton(
                    icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    tooltip: _obscurePassword ? 'Show password' : 'Hide password',
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
            DropdownButtonFormField<String>(
              initialValue: _role,
              decoration: const InputDecoration(labelText: 'Role'),
              items: kUserRoles
                  .map((r) => DropdownMenuItem(
                        value: r,
                        child: Text(r.split('-').map((w) => w[0].toUpperCase() + w.substring(1)).join(' ')),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _role = v ?? _role),
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Active'),
              value: _active,
              onChanged: (v) => setState(() => _active = v),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: _saving ? null : () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(
          onPressed: _saving ? null : _submit,
          child: _saving
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : Text(_isEdit ? 'Save' : 'Create'),
        ),
      ],
    );
  }
}
