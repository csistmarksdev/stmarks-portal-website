import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../core/theme/app_theme.dart';
import 'app_surface.dart';
import 'portal_image.dart';

/// Shared list-card shell: optional 16:9 banner, title, meta rows, footer
/// action bar. Mirrors the web app's list-card pattern used across
/// Events/Blog/Gallery/Announcements/Downloads/Fellowships.
class ContentCard extends StatelessWidget {
  const ContentCard({
    super.key,
    this.imageUrl,
    this.imageIcon,
    required this.title,
    this.badges = const [],
    this.metaRows = const [],
    required this.onEdit,
    required this.onDelete,
    this.statusMenu,
    this.onTap,
    this.footerExtra,
  });

  final String? imageUrl;
  final IconData? imageIcon;
  final String title;
  final List<Widget> badges;
  final List<Widget> metaRows;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final Widget? statusMenu;
  final VoidCallback? onTap;
  final Widget? footerExtra;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasImage = (imageUrl != null && imageUrl!.trim().isNotEmpty) || imageIcon != null;

    return AppSurface(
      radius: AppRadii.card,
      clipContents: true,
      onTap: onTap ?? onEdit,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (hasImage)
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  PortalImage(url: imageUrl, icon: imageIcon),
                  // A scrim under the badges so a light photograph can't wash
                  // a "Draft" pill out to nothing.
                  if (badges.isNotEmpty)
                    Positioned(
                      left: 0,
                      right: 0,
                      top: 0,
                      height: 72,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Colors.black.withValues(alpha: 0.3), Colors.transparent],
                          ),
                        ),
                      ),
                    ),
                  if (badges.isNotEmpty)
                    Positioned(
                      left: 12,
                      top: 12,
                      child: Wrap(spacing: 6, runSpacing: 4, children: badges),
                    ),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!hasImage && badges.isNotEmpty) ...[
                  Wrap(spacing: 6, runSpacing: 4, children: badges),
                  const SizedBox(height: 10),
                ],
                Text(
                  title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.15,
                    height: 1.3,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (metaRows.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  ...metaRows.map(
                    (m) => Padding(padding: const EdgeInsets.only(bottom: 5), child: m),
                  ),
                ],
              ],
            ),
          ),
          const AppInsetDivider(),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
            child: Row(
              children: [
                ?statusMenu,
                if (footerExtra case final fe?) ...[const SizedBox(width: 6), fe],
                const Spacer(),
                TextButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(LucideIcons.pencil, size: 15),
                  label: const Text('Edit'),
                  style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    // Naming a bare TextStyle here would replace the theme's
                    // button style outright and drop back to the platform
                    // font, so the family is restated.
                    textStyle: theme.textTheme.labelLarge?.copyWith(fontSize: 12.5),
                  ),
                ),
                IconButton(
                  icon: Icon(LucideIcons.trash2, size: 18, color: theme.colorScheme.error),
                  tooltip: 'Delete',
                  visualDensity: VisualDensity.compact,
                  onPressed: onDelete,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class MetaRow extends StatelessWidget {
  const MetaRow({super.key, required this.icon, required this.text, this.label});
  final IconData icon;
  final String text;

  /// Field label shown before the value (e.g. "Starts"), matching the web
  /// app's labelled `<dt>/<dd>` meta rows. Optional — omit for a plain
  /// icon + value row.
  final String? label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Icon(icon, size: 13, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(width: 5),
        if (label != null) ...[
          Text('$label  ', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        ],
        Expanded(
          child: Text(
            text,
            style: theme.textTheme.bodySmall,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: label != null ? TextAlign.right : TextAlign.left,
          ),
        ),
      ],
    );
  }
}
