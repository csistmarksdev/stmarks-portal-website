import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';

/// The app's one card shape: a rounded *superellipse* — the continuous
/// "squircle" curve Apple uses, where the corner flows into the edge instead
/// of meeting it at a visible seam. Every panel, tile and sheet in the portal
/// is cut with this so the whole surface family reads as one system.
ShapeBorder appSquircle(double radius, {BorderSide side = BorderSide.none}) =>
    RoundedSuperellipseBorder(borderRadius: BorderRadius.circular(radius), side: side);

/// How much a surface is lifted off the page.
enum SurfaceElevation {
  /// Sits flat on the background — grouped rows, inset lists.
  flat,

  /// The default for content cards: a hairline border and the faintest lift.
  resting,

  /// Detached chrome — floating docks, popovers.
  floating,
}

/// A squircle panel with the portal's border, fill and shadow already
/// resolved. Prefer this over hand-rolling a [Container] + [BoxDecoration]:
/// it keeps corner radius, hairline colour and shadow depth identical
/// everywhere, which is most of what makes a set of cards look designed
/// rather than assembled.
class AppSurface extends StatelessWidget {
  const AppSurface({
    super.key,
    required this.child,
    this.radius = AppRadii.card,
    this.padding,
    this.color,
    this.elevation = SurfaceElevation.resting,
    this.bordered = true,
    this.borderColor,
    this.onTap,
    this.clipContents = false,
    this.width,
  });

  final Widget child;
  final double radius;
  final EdgeInsetsGeometry? padding;
  final Color? color;
  final SurfaceElevation elevation;
  final bool bordered;
  final Color? borderColor;
  final VoidCallback? onTap;

  /// Clip the child to the squircle. Only needed when the child paints to the
  /// edge (a banner image); clipping costs a save layer, so it's off by default.
  final bool clipContents;
  final double? width;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fill = color ?? theme.colorScheme.surface;
    final side = bordered
        ? BorderSide(color: borderColor ?? theme.colorScheme.outline.withValues(alpha: 0.7))
        : BorderSide.none;
    final shape = appSquircle(radius, side: side);

    final shadows = switch (elevation) {
      SurfaceElevation.flat => const <BoxShadow>[],
      SurfaceElevation.resting => restingShadow(context),
      SurfaceElevation.floating => floatingShadow(context),
    };

    Widget content = padding == null ? child : Padding(padding: padding!, child: child);

    Widget surface = Material(
      color: fill,
      shape: shape,
      // Clipping is a per-frame path clip, so it is spent only where a child
      // actually paints to the edge. A tap alone does not need it: InkWell's
      // `customBorder` already keeps the splash inside the squircle.
      clipBehavior: clipContents ? Clip.antiAlias : Clip.none,
      child: onTap == null ? content : InkWell(customBorder: shape, onTap: onTap, child: content),
    );

    if (shadows.isNotEmpty) {
      surface = DecoratedBox(
        decoration: ShapeDecoration(shape: shape, shadows: shadows),
        child: surface,
      );
    }

    return width == null ? surface : SizedBox(width: width, child: surface);
  }
}

/// A hairline divider for use *inside* an [AppSurface] — lighter than the
/// panel's own border so nested structure doesn't compete with the edge.
class AppInsetDivider extends StatelessWidget {
  const AppInsetDivider({super.key, this.indent = 0});

  final double indent;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(left: indent),
      child: Divider(
        height: 1,
        thickness: 1,
        color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.45),
      ),
    );
  }
}
