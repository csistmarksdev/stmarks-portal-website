import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../widgets/app_surface.dart';

/// Landing page for the Church module — three navigation tiles to the
/// singleton-document editors (service timings, pastor's message, weekly
/// verse).
class ChurchLandingScreen extends ConsumerWidget {
  const ChurchLandingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, appPageTop(context), 20, kFloatingDockHeight + 24),
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
                icon: LucideIcons.clock,
                title: 'Service timings',
                subtitle: 'Weekly service days, times and venues',
                onTap: () => context.push('/church/service-timings'),
              ),
              const SizedBox(height: 14),
              _ChurchTile(
                icon: LucideIcons.messageSquare,
                title: "Pastor's message",
                subtitle: "The pastor's welcome message and photo",
                onTap: () => context.push('/church/pastor-message'),
              ),
              const SizedBox(height: 14),
              _ChurchTile(
                icon: LucideIcons.bookOpen,
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
      shape: appSquircle(
        AppRadii.card,
        side: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.7)),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        customBorder: appSquircle(AppRadii.card),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: ShapeDecoration(
                  color: theme.colorScheme.secondary,
                  shape: appSquircle(AppRadii.md),
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
              Icon(LucideIcons.chevronRight, color: theme.colorScheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}
