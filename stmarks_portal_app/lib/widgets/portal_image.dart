import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
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
    final placeholderColor = theme.colorScheme.surfaceContainerHighest;

    Widget placeholder() => Container(
      color: placeholderColor,
      alignment: Alignment.center,
      child: Icon(icon ?? Icons.image_outlined, color: theme.colorScheme.onSurfaceVariant, size: 28),
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
        placeholder: (_, _) => Container(color: placeholderColor),
        errorWidget: (_, _, _) => placeholder(),
      );
    }

    if (borderRadius != null) {
      return ClipRRect(borderRadius: borderRadius!, child: content);
    }
    return content;
  }
}
