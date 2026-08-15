import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/confirm_dialog.dart';

/// Settings — account, password, appearance, server connection and sign out.
/// Each concern lives in its own rounded-24 card, mirroring the visual
/// convention used across the rest of the CMS (see `ResourceFormPage`).
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Settings', style: theme.textTheme.headlineSmall),
              const SizedBox(height: 4),
              Text(
                'Your account, appearance and connection.',
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 24),
              const _AccountCard(),
              const SizedBox(height: 20),
              const _PasswordCard(),
              const SizedBox(height: 20),
              const _AppearanceCard(),
              const SizedBox(height: 20),
              const _ServerCard(),
              const SizedBox(height: 20),
              const _SignOutCard(),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Shared card chrome
// ---------------------------------------------------------------------------

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppRadii.card),
        border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.7)),
        boxShadow: cardShadow(context),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title, style: theme.textTheme.titleMedium),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// (a) Account
// ---------------------------------------------------------------------------

class _AccountCard extends ConsumerStatefulWidget {
  const _AccountCard();

  @override
  ConsumerState<_AccountCard> createState() => _AccountCardState();
}

class _AccountCardState extends ConsumerState<_AccountCard> {
  final _nameController = TextEditingController();
  bool _saving = false;
  String? _seededFor;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      showAppSnackBar(context, 'Enter a display name.', error: true);
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(authControllerProvider.notifier).updateName(name);
      if (mounted) showAppSnackBar(context, 'Name updated.');
    } catch (e) {
      if (mounted) {
        showAppSnackBar(context, e is ApiException ? e.message : 'Could not update your name.', error: true);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = ref.watch(authControllerProvider).user;

    // Seed the editable field once per user id so it doesn't clobber
    // in-progress edits on unrelated rebuilds.
    if (user != null && _seededFor != user.id) {
      _nameController.text = user.name;
      _seededFor = user.id;
    }

    return _SectionCard(
      title: 'Account',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _ReadOnlyRow(label: 'Email', value: user?.email ?? '—'),
          const SizedBox(height: 10),
          _ReadOnlyRow(label: 'Role', value: user?.role ?? '—'),
          const SizedBox(height: 18),
          Text('Display name', style: theme.textTheme.labelLarge),
          const SizedBox(height: 8),
          TextField(
            controller: _nameController,
            textInputAction: TextInputAction.done,
            decoration: const InputDecoration(hintText: 'Your name'),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: FilledButton(
              onPressed: _saving ? null : _save,
              style: FilledButton.styleFrom(
                backgroundColor: theme.colorScheme.primary,
                foregroundColor: theme.colorScheme.onPrimary,
              ),
              child: _saving
                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReadOnlyRow extends StatelessWidget {
  const _ReadOnlyRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        SizedBox(width: 90, child: Text(label, style: theme.textTheme.labelMedium)),
        Expanded(child: Text(value, style: theme.textTheme.bodyMedium, overflow: TextOverflow.ellipsis)),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// (b) Change password
// ---------------------------------------------------------------------------

class _PasswordCard extends ConsumerStatefulWidget {
  const _PasswordCard();

  @override
  ConsumerState<_PasswordCard> createState() => _PasswordCardState();
}

class _PasswordCardState extends ConsumerState<_PasswordCard> {
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _obscure = true;
  bool _saving = false;

  @override
  void dispose() {
    _currentController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final current = _currentController.text;
    final next = _newController.text;
    final confirm = _confirmController.text;

    if (current.isEmpty || next.isEmpty) {
      showAppSnackBar(context, 'Fill in all password fields.', error: true);
      return;
    }
    if (next != confirm) {
      showAppSnackBar(context, 'New password and confirmation do not match.', error: true);
      return;
    }

    setState(() => _saving = true);
    try {
      await ref.read(authControllerProvider.notifier).changePassword(
            currentPassword: current,
            newPassword: next,
          );
      if (mounted) {
        showAppSnackBar(context, 'Password updated.');
        _currentController.clear();
        _newController.clear();
        _confirmController.clear();
      }
    } catch (e) {
      if (mounted) {
        showAppSnackBar(context, e is ApiException ? e.message : 'Could not update your password.', error: true);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return _SectionCard(
      title: 'Change password',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _currentController,
            obscureText: _obscure,
            decoration: const InputDecoration(labelText: 'Current password'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _newController,
            obscureText: _obscure,
            decoration: const InputDecoration(labelText: 'New password'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _confirmController,
            obscureText: _obscure,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _saving ? null : _submit(),
            decoration: const InputDecoration(labelText: 'Confirm new password'),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Checkbox(value: !_obscure, onChanged: (v) => setState(() => _obscure = !(v ?? false))),
              Text('Show passwords', style: theme.textTheme.bodySmall),
            ],
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: FilledButton(
              onPressed: _saving ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: theme.colorScheme.primary,
                foregroundColor: theme.colorScheme.onPrimary,
              ),
              child: _saving
                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Update password'),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// (c) Appearance
// ---------------------------------------------------------------------------

class _AppearanceCard extends ConsumerWidget {
  const _AppearanceCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);

    void select(String value) {
      ref.read(themeModeProvider.notifier).state = value;
      ref.read(localStoreProvider).setThemeMode(value);
    }

    return _SectionCard(
      title: 'Appearance',
      child: SegmentedButton<String>(
        segments: const [
          ButtonSegment(value: 'light', label: Text('Light'), icon: Icon(Icons.light_mode_outlined, size: 16)),
          ButtonSegment(value: 'dark', label: Text('Dark'), icon: Icon(Icons.dark_mode_outlined, size: 16)),
          ButtonSegment(value: 'system', label: Text('System'), icon: Icon(Icons.brightness_auto_outlined, size: 16)),
        ],
        selected: {mode},
        onSelectionChanged: (s) => select(s.first),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// (d) Server
// ---------------------------------------------------------------------------

class _ServerCard extends ConsumerWidget {
  const _ServerCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final baseUrl = ref.read(localStoreProvider).apiBaseUrl ?? 'Not set';

    return _SectionCard(
      title: 'Server',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(AppRadii.md),
            ),
            child: Row(
              children: [
                Icon(Icons.dns_rounded, size: 18, color: theme.colorScheme.onSurfaceVariant),
                const SizedBox(width: 10),
                Expanded(child: Text(baseUrl, style: theme.textTheme.bodyMedium, overflow: TextOverflow.ellipsis)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton(
              onPressed: () => context.push('/connect'),
              child: const Text('Change server'),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// (e) Sign out
// ---------------------------------------------------------------------------

class _SignOutCard extends ConsumerWidget {
  const _SignOutCard();

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Sign out?',
      message: "You'll need to sign in again to keep managing the portal.",
      confirmLabel: 'Sign out',
      destructive: true,
    );
    if (!confirmed) return;
    await ref.read(authControllerProvider.notifier).logout();
    if (context.mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return _SectionCard(
      title: 'Sign out',
      child: Align(
        alignment: Alignment.centerLeft,
        child: FilledButton.icon(
          onPressed: () => _confirmLogout(context, ref),
          icon: const Icon(Icons.logout_rounded, size: 18),
          label: const Text('Sign out'),
          style: FilledButton.styleFrom(
            backgroundColor: theme.colorScheme.error,
            foregroundColor: theme.colorScheme.onError,
          ),
        ),
      ),
    );
  }
}
