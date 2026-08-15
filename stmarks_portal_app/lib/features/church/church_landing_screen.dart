import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

/// Landing page for the Church module — three navigation tiles to the
/// singleton-document editors (service timings, pastor's message, weekly
/// verse).
class ChurchLandingScreen extends ConsumerWidget {
  const ChurchLandingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Church content', style: theme.textTheme.headlineSmall),
              const SizedBox(height: 6),
              Text(
                "Content shown on the church's public pages.",
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 24),
              _ChurchTile(
                icon: Icons.schedule_rounded,
                title: 'Service timings',
                subtitle: 'Weekly service days, times and venues',
                onTap: () => context.push('/church/service-timings'),
              ),
              const SizedBox(height: 14),
              _ChurchTile(
                icon: Icons.chat_bubble_outline_rounded,
                title: "Pastor's message",
                subtitle: "The pastor's welcome message and photo",
                onTap: () => context.push('/church/pastor-message'),
              ),
              const SizedBox(height: 14),
              _ChurchTile(
                icon: Icons.menu_book_rounded,
                title: 'Verse of the week',
                subtitle: 'The Bible verse shown on the dashboard and website',
                onTap: () => context.push('/church/weekly-verse'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChurchTile extends StatelessWidget {
  const _ChurchTile({required this.icon, required this.title, required this.subtitle, required this.onTap});

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(AppRadii.card),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.card),
            border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.7)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.secondary,
                  borderRadius: BorderRadius.circular(AppRadii.md),
                ),
                child: Icon(icon, color: theme.colorScheme.onSecondary, size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: theme.textTheme.titleMedium),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: theme.colorScheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}
