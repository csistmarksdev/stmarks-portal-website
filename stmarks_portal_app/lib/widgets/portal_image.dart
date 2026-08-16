import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/providers/providers.dart';

/// Resolves the Portal's (often relative) media URLs against the configured
/// API origin and renders them with a graceful loading/broken-image state —
/// mirrors the web app's `CardBanner` fallback behaviour.
class PortalImage extends ConsumerWidget {
  const PortalImage({super.key, required this.url, this.fit = BoxFit.cover, this.borderRadius, this.icon});

  final String? url;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  final IconData? icon;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    // A flat grey rectangle at 16:9 is a lot of dead card. A soft diagonal
    // wash with a centred glyph reads as "no picture yet" rather than as a
    // hole in the layout.
    Widget wash({Widget? child}) => DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            theme.colorScheme.surfaceContainerHighest,
            theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
          ],
        ),
      ),
      child: child == null ? null : Center(child: child),
    );

    Widget placeholder() => wash(
      child: Icon(
        icon ?? LucideIcons.image,
        color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.55),
        size: 30,
      ),
    );

    Widget content;
    if (url == null || url!.isEmpty) {
      content = placeholder();
    } else {
      final api = ref.watch(apiClientProvider);
      final resolved = api.absoluteUrl(url!);
      content = CachedNetworkImage(
        imageUrl: resolved,
        fit: fit,
        fadeInDuration: const Duration(milliseconds: 220),
        placeholder: (_, _) => wash(),
        errorWidget: (_, _, _) => placeholder(),
      );
    }

    if (borderRadius != null) {
      return ClipRRect(borderRadius: borderRadius!, child: content);
    }
    return content;
  }
}
