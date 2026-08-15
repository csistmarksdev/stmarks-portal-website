import 'package:flutter/material.dart';

import '../core/theme/app_theme_extension.dart';

/// Maps `draft|published|archived` to a soft colour-wash pill — mirrors the
/// web app's `StatusBadge`.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final semantic = context.semanticColors;

    late final Color bg;
    late final Color fg;
    late final String label;
    switch (status) {
      case 'published':
        bg = semantic.successSoft;
        fg = semantic.success;
        label = 'Published';
        break;
      case 'archived':
        bg = theme.colorScheme.surfaceContainerHighest;
        fg = theme.colorScheme.onSurfaceVariant;
        label = 'Archived';
        break;
      default:
        bg = semantic.warningSoft;
        fg = semantic.accentForeground;
        label = 'Draft';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: theme.textTheme.labelSmall?.copyWith(color: fg, letterSpacing: 0.3, fontSize: 11)),
    );
  }
}
