import 'package:flutter/material.dart';

/// The parish crest (Church of South India seal) — mirrors
/// `frontend/public/Logo1.svg`, square aspect.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 48});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Image.asset('assets/images/logo1.png', width: size, height: size, fit: BoxFit.contain);
  }
}

/// The diocesan arms — mirrors `frontend/public/Logo2.svg`, taller aspect
/// (523:860). Always paired next to [BrandMark], never shown alone.
class DiocesanArms extends StatelessWidget {
  const DiocesanArms({super.key, this.height = 48});

  final double height;

  @override
  Widget build(BuildContext context) {
    return Image.asset('assets/images/logo2.png', height: height, fit: BoxFit.contain);
  }
}

/// Crest + name + arms, exactly as the web Portal's sidebar header pairs
/// them — the parish crest and diocesan arms balanced across the church name.
class BrandLockup extends StatelessWidget {
  const BrandLockup({super.key, this.markSize = 36, this.showName = true});

  final double markSize;
  final bool showName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        BrandMark(size: markSize),
        if (showName) ...[
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text(
                  "StMarksChurch",
                  style: theme.textTheme.titleSmall,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  'CSI MADIPAKKAM',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.tertiary,
                    fontSize: 9,
                    letterSpacing: 1.4,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
        ] else
          const SizedBox(width: 8),
        DiocesanArms(height: markSize),
      ],
    );
  }
}
