import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';
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

    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(AppRadii.card),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap ?? onEdit,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.card),
            border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.7)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (hasImage)
                AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Stack(
                    children: [
                      Positioned.fill(child: PortalImage(url: imageUrl, icon: imageIcon)),
                      if (badges.isNotEmpty)
                        Positioned(
                          left: 10,
                          top: 10,
                          child: Wrap(spacing: 6, runSpacing: 4, children: badges),
                        ),
                    ],
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (!hasImage && badges.isNotEmpty) ...[
                      Wrap(spacing: 6, runSpacing: 4, children: badges),
                      const SizedBox(height: 8),
                    ],
                    Text(
                      title,
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (metaRows.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      ...metaRows.map(
                        (m) => Padding(padding: const EdgeInsets.only(bottom: 4), child: m),
                      ),
                    ],
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.35),
                  border: Border(
                    top: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.3)),
                  ),
                ),
                child: Row(
                  children: [
                    ?statusMenu,
                    if (footerExtra case final fe?) ...[const SizedBox(width: 6), fe],
                    const Spacer(),
                    FilledButton.tonalIcon(
                      onPressed: onEdit,
                      icon: const Icon(Icons.edit_outlined, size: 15),
                      label: const Text('Edit'),
                      style: FilledButton.styleFrom(
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                        textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                      ),
                    ),
                    const SizedBox(width: 6),
                    IconButton(
                      icon: Icon(Icons.delete_outline_rounded, size: 18, color: theme.colorScheme.error),
                      tooltip: 'Delete',
                      visualDensity: VisualDensity.compact,
                      onPressed: onDelete,
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
