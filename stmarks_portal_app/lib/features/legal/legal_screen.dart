import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_theme.dart';
import '../../widgets/app_surface.dart';
import 'legal_documents.dart';

/// Renders a [LegalDocument] as a reading screen: one large title, then each
/// section on its own panel. Long-form text gets a narrower measure than the
/// rest of the app — a policy is read in paragraphs, not scanned in cards.
class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key, required this.document});

  final LegalDocument document;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, appPageTop(context), 20, kFloatingDockHeight + 24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 680),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  IconButton(
                    icon: const Icon(LucideIcons.arrowLeft),
                    tooltip: 'Back',
                    onPressed: () => Navigator.of(context).maybePop(),
                  ),
                  const SizedBox(width: 4),
                  Expanded(child: Text(document.title, style: theme.textTheme.headlineMedium)),
                ],
              ),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      document.summary,
                      style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Last updated ${document.lastUpdated}',
                      style: theme.textTheme.labelMedium?.copyWith(letterSpacing: 0.4),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              for (final section in document.sections) ...[
                _SectionPanel(section: section),
                const SizedBox(height: 12),
              ],
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  'This document describes the CSI St. Mark\'s Portal app. It does not cover the parish '
                  'website itself, or any other service the parish runs.',
                  style: theme.textTheme.bodySmall,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionPanel extends StatelessWidget {
  const _SectionPanel({required this.section});

  final LegalSection section;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppSurface(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(section.heading, style: theme.textTheme.titleMedium),
          for (final paragraph in section.body) ...[
            const SizedBox(height: 10),
            Text(
              paragraph,
              style: theme.textTheme.bodyMedium?.copyWith(height: 1.55, color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
          for (final bullet in section.bullets) ...[
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 8, left: 2, right: 11),
                  child: Container(
                    width: 5,
                    height: 5,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: theme.colorScheme.primary),
                  ),
                ),
                Expanded(
                  child: Text(
                    bullet,
                    style: theme.textTheme.bodyMedium
                        ?.copyWith(height: 1.55, color: theme.colorScheme.onSurfaceVariant),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
