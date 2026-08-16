import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../core/theme/app_theme.dart';
import 'app_surface.dart';

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String? message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 76,
                height: 76,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      theme.colorScheme.surfaceContainerHighest,
                      theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.35),
                    ],
                  ),
                  border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.6)),
                ),
                child: Icon(icon, size: 31, color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 18),
              Text(title, style: theme.textTheme.titleMedium, textAlign: TextAlign.center),
              if (message != null) ...[
                const SizedBox(height: 7),
                Text(message!, style: theme.textTheme.bodySmall, textAlign: TextAlign.center),
              ],
              if (actionLabel != null && onAction != null) ...[
                const SizedBox(height: 22),
                FilledButton.icon(
                  onPressed: onAction,
                  icon: const Icon(LucideIcons.plus, size: 18),
                  label: Text(actionLabel!),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Shown when a query fails — mirrors the web app's `ErrorState`. Kept
/// visually and textually distinct from [EmptyState] on purpose: "nothing
/// here yet" and "we could not reach the server" look identical if you only
/// check for an absence of rows, and confusing the two makes an outage look
/// like data loss.
class ErrorRetryState extends StatelessWidget {
  const ErrorRetryState({super.key, this.title = "Couldn't load this", this.message, required this.onRetry, this.busy = false});

  final String title;
  final String? message;
  final VoidCallback onRetry;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
          constraints: const BoxConstraints(maxWidth: 420),
          decoration: ShapeDecoration(
            color: theme.colorScheme.error.withValues(alpha: 0.05),
            shape: appSquircle(
              AppRadii.card,
              side: BorderSide(color: theme.colorScheme.error.withValues(alpha: 0.3)),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: theme.colorScheme.error.withValues(alpha: 0.1), shape: BoxShape.circle),
                child: Icon(LucideIcons.wifiOff, size: 20, color: theme.colorScheme.error),
              ),
              const SizedBox(height: 12),
              Text(title, style: theme.textTheme.titleMedium, textAlign: TextAlign.center),
              const SizedBox(height: 6),
              Text(
                message ?? 'The portal could not reach the server. Your content is safe; this is a connection problem.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall,
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: busy ? null : onRetry,
                icon: busy
                    ? const SizedBox(height: 14, width: 14, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(LucideIcons.refreshCw, size: 18),
                label: Text(busy ? 'Retrying…' : 'Try again'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class LoadingListSkeleton extends StatelessWidget {
  const LoadingListSkeleton({super.key, this.count = 5});

  final int count;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
      itemCount: count,
      physics: const NeverScrollableScrollPhysics(),
      separatorBuilder: (_, _) => const SizedBox(height: 14),
      itemBuilder: (context, i) => Shimmer(
        // Each row starts its sweep a beat after the one above it, so the
        // list reads as loading top-down rather than pulsing as one slab.
        delay: Duration(milliseconds: i * 90),
        child: Container(
          height: 84,
          padding: const EdgeInsets.all(14),
          decoration: ShapeDecoration(
            color: Theme.of(context).colorScheme.surface,
            shape: appSquircle(
              AppRadii.card,
              side: BorderSide(color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.7)),
            ),
          ),
          child: const Row(
            children: [
              _Bone(width: 56, height: 56, radius: AppRadii.md),
              SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _Bone(width: double.infinity, height: 13),
                    SizedBox(height: 9),
                    _Bone(width: 140, height: 11),
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

class _Bone extends StatelessWidget {
  const _Bone({required this.width, required this.height, this.radius = AppRadii.sm});

  final double width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: ShapeDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        shape: appSquircle(radius),
      ),
    );
  }
}

/// Sweeps a soft highlight across its subtree. Used for loading placeholders,
/// where a moving surface reads as "still working" and a static grey block
/// reads as "this is the content, and it's broken".
class Shimmer extends StatefulWidget {
  const Shimmer({super.key, required this.child, this.delay = Duration.zero});

  final Widget child;
  final Duration delay;

  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );

  @override
  void initState() {
    super.initState();
    if (widget.delay == Duration.zero) {
      _controller.repeat();
    } else {
      Future<void>.delayed(widget.delay, () {
        if (mounted) _controller.repeat();
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final highlight = (isDark ? Colors.white : Colors.white).withValues(alpha: isDark ? 0.06 : 0.55);

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) => ShaderMask(
        blendMode: BlendMode.srcATop,
        shaderCallback: (bounds) => LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [Colors.transparent, highlight, Colors.transparent],
          stops: const [0.0, 0.5, 1.0],
          transform: _SlideGradient(_controller.value),
        ).createShader(bounds),
        child: child,
      ),
      child: widget.child,
    );
  }
}

/// Slides the gradient from fully off the left edge to fully off the right.
class _SlideGradient extends GradientTransform {
  const _SlideGradient(this.progress);

  final double progress;

  @override
  Matrix4 transform(Rect bounds, {TextDirection? textDirection}) =>
      Matrix4.translationValues(bounds.width * (progress * 2 - 1), 0, 0);
}
