import 'package:flutter/material.dart';

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
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 32, color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            Text(title, style: theme.textTheme.titleMedium, textAlign: TextAlign.center),
            if (message != null) ...[
              const SizedBox(height: 6),
              Text(
                message!,
                style: theme.textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.add_rounded, size: 18),
                label: Text(actionLabel!),
                style: FilledButton.styleFrom(
                  backgroundColor: theme.colorScheme.primary,
                  foregroundColor: theme.colorScheme.onPrimary,
                ),
              ),
            ],
          ],
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
          decoration: BoxDecoration(
            color: theme.colorScheme.error.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: theme.colorScheme.error.withValues(alpha: 0.3), style: BorderStyle.solid),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: theme.colorScheme.error.withValues(alpha: 0.1), shape: BoxShape.circle),
                child: Icon(Icons.wifi_off_rounded, size: 20, color: theme.colorScheme.error),
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
                    : const Icon(Icons.refresh_rounded, size: 18),
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
  const LoadingListSkeleton({super.key, this.count = 6});

  final int count;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: count,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, i) => Container(
        height: 88,
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(20),
        ),
      ),
    );
  }
}
