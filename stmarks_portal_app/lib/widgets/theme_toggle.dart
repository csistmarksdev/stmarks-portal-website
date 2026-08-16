import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/providers/providers.dart';

/// Three-way Light/Dark/Auto pill control — mirrors the web app's
/// `ThemeToggle`. "Auto" (system) is the default.
class ThemeToggle extends ConsumerWidget {
  const ThemeToggle({super.key});

  static const _options = [
    (value: 'light', label: 'Light', icon: LucideIcons.sun),
    (value: 'dark', label: 'Dark', icon: LucideIcons.moon),
    (value: 'system', label: 'Auto', icon: LucideIcons.monitor),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final current = ref.watch(themeModeProvider);

    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(color: theme.colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(999)),
      child: Row(
        children: [
          for (final option in _options)
            Expanded(
              child: _Segment(
                label: option.label,
                icon: option.icon,
                active: current == option.value,
                onTap: () {
                  ref.read(themeModeProvider.notifier).state = option.value;
                  ref.read(localStoreProvider).setThemeMode(option.value);
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _Segment extends StatelessWidget {
  const _Segment({required this.label, required this.icon, required this.active, required this.onTap});

  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: active ? theme.colorScheme.surface : Colors.transparent,
      borderRadius: BorderRadius.circular(999),
      elevation: active ? 1 : 0,
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 7),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 15, color: active ? theme.colorScheme.onSurface : theme.colorScheme.onSurfaceVariant),
              const SizedBox(height: 2),
              Text(
                label,
                style: theme.textTheme.labelSmall?.copyWith(
                  letterSpacing: 0,
                  fontSize: 10,
                  color: active ? theme.colorScheme.onSurface : theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
