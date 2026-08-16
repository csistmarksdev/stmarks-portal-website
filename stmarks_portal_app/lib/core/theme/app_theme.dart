import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_theme_extension.dart';

/// Curve borrowed from the web app's `--ease-out-expo`.
const Curve appEaseOutExpo = Cubic(0.16, 1, 0.3, 1);

class AppRadii {
  AppRadii._();
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const card = 24.0; // rounded-3xl
  static const pill = 999.0;
}

/// Vertical space the mobile shell's floating dock occupies, including the
/// gap it keeps from the bottom edge. Scrollable pages end with at least this
/// much slack so their last row never comes to rest under the dock.
const double kFloatingDockHeight = 78;

/// Top inset a scrollable page leaves before its first row.
///
/// On mobile the page scrolls *underneath* the floating top bar, so the shell
/// publishes the bar's height as `MediaQuery.padding.top` and this puts the
/// first row to rest just below it. On the desktop and tablet shells the
/// surrounding `SafeArea` has already eaten the inset, so this collapses to
/// the plain [gutter].
double appPageTop(BuildContext context, [double gutter = 16]) =>
    MediaQuery.paddingOf(context).top + gutter;

/// Shared motion durations, so the shells stay in step with one another
/// instead of each picking its own timing.
class AppDurations {
  AppDurations._();
  static const fast = Duration(milliseconds: 150);
  static const medium = Duration(milliseconds: 260);
  static const slow = Duration(milliseconds: 420);
}

class AppTheme {
  AppTheme._();

  static const _fontDisplay = 'Fraunces';
  static const _fontSans = 'Inter';

  /// Neither Inter nor Fraunces contains a single Tamil glyph, and half this
  /// app's content is Tamil. Naming the fallback explicitly means the platform
  /// resolves a known Tamil face rather than whatever its default chain
  /// happens to reach for first.
  static const _fontFallback = <String>['Noto Sans Tamil', 'Noto Sans', 'sans-serif'];

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final isDark = brightness == Brightness.dark;

    final background = isDark ? AppColors.darkBackground : AppColors.sand50;
    final card = isDark ? AppColors.darkCard : Colors.white;
    final cardForeground = isDark ? AppColors.darkForeground : AppColors.sand900;
    final muted = isDark ? AppColors.darkMuted : AppColors.sand100;
    final mutedForeground = isDark ? AppColors.darkMutedForeground : AppColors.sand600;
    final border = isDark ? AppColors.darkBorder : AppColors.sand200;
    final primary = isDark ? AppColors.brand400 : AppColors.brand700;
    final primaryForeground = isDark ? AppColors.darkBackground : Colors.white;
    final secondary = isDark ? AppColors.darkSecondary : AppColors.brand50;
    final secondaryForeground = isDark ? AppColors.brand200 : AppColors.brand800;
    final destructive = isDark ? AppColors.crimson400 : AppColors.crimson600;
    final ring = isDark ? AppColors.brand400 : AppColors.brand500;

    final colorScheme = ColorScheme(
      brightness: brightness,
      primary: primary,
      onPrimary: primaryForeground,
      secondary: secondary,
      onSecondary: secondaryForeground,
      error: destructive,
      onError: isDark ? AppColors.darkBackground : Colors.white,
      errorContainer: isDark ? const Color(0xFF3A0F1B) : AppColors.brand50,
      onErrorContainer: destructive,
      surface: card,
      onSurface: cardForeground,
      // Four rungs of surface so nested panels read as depth rather than as
      // the same flat card drawn twice.
      surfaceDim: isDark ? AppColors.darkBackground : AppColors.sand100,
      surfaceBright: isDark ? AppColors.darkMuted : Colors.white,
      surfaceContainerLowest: isDark ? AppColors.darkBackground : Colors.white,
      surfaceContainerLow: isDark ? AppColors.darkCardWash : AppColors.sand50,
      surfaceContainer: isDark ? AppColors.darkCard : AppColors.sand50,
      surfaceContainerHigh: isDark ? AppColors.darkMuted : AppColors.sand100,
      surfaceContainerHighest: muted,
      onSurfaceVariant: mutedForeground,
      outline: border,
      outlineVariant: isDark ? AppColors.darkBorder : AppColors.sand200,
      shadow: isDark ? Colors.black : AppColors.brand950,
      scrim: isDark ? Colors.black : AppColors.sand950,
      inverseSurface: isDark ? AppColors.sand50 : AppColors.sand900,
      onInverseSurface: isDark ? AppColors.sand900 : AppColors.sand50,
      inversePrimary: isDark ? AppColors.brand700 : AppColors.brand300,
      primaryContainer: secondary,
      onPrimaryContainer: secondaryForeground,
      // Kept distinct from `primaryContainer` so `FilledButton.tonal` reads as
      // a neutral secondary action, not a second brand-tinted primary.
      secondaryContainer: muted,
      onSecondaryContainer: cardForeground,
      tertiary: isDark ? AppColors.accent300 : AppColors.accent700,
      onTertiary: isDark ? AppColors.darkBackground : Colors.white,
      tertiaryContainer: isDark ? const Color(0xFF3A2416) : AppColors.accent50,
      onTertiaryContainer: isDark ? AppColors.accent300 : AppColors.accent800,
    );

    final textTheme = _textTheme(cardForeground, mutedForeground);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      canvasColor: background,
      fontFamily: _fontSans,
      fontFamilyFallback: _fontFallback,
      textTheme: textTheme,
      splashFactory: InkRipple.splashFactory,
      dividerTheme: DividerThemeData(color: border, thickness: 1, space: 1),
      extensions: [isDark ? AppSemanticColors.dark : AppSemanticColors.light],
      appBarTheme: AppBarTheme(
        backgroundColor: card.withValues(alpha: 0.72),
        foregroundColor: cardForeground,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: textTheme.titleLarge,
        iconTheme: IconThemeData(color: cardForeground),
      ),
      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        shape: RoundedSuperellipseBorder(
          borderRadius: BorderRadius.circular(AppRadii.card),
          side: BorderSide(color: border.withValues(alpha: 0.7)),
        ),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? AppColors.darkMuted : Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: BorderSide(color: ring, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: BorderSide(color: destructive),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: BorderSide(color: destructive, width: 2),
        ),
        labelStyle: TextStyle(color: mutedForeground),
        hintStyle: TextStyle(color: mutedForeground.withValues(alpha: 0.7)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: primaryForeground,
          disabledBackgroundColor: muted,
          disabledForegroundColor: mutedForeground,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontFamily: _fontSans, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: cardForeground,
          side: BorderSide(color: border),
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontFamily: _fontSans, fontWeight: FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontFamily: _fontSans, fontWeight: FontWeight.w600),
        ),
      ),
      // Deliberately leaves the colours to Material's own defaults so that
      // `FilledButton` is the solid brand call-to-action and
      // `FilledButton.tonal` is the neutral one — the same theme data feeds
      // both variants, so naming a background here would flatten them into a
      // single look.
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontFamily: _fontSans, fontWeight: FontWeight.w600),
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          foregroundColor: cardForeground,
          shape: const StadiumBorder(),
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: primary,
        foregroundColor: primaryForeground,
        elevation: 2,
        shape: const StadiumBorder(),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: muted,
        labelStyle: TextStyle(color: cardForeground, fontSize: 13, fontWeight: FontWeight.w600),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        shape: const StadiumBorder(),
        side: BorderSide.none,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: card,
        surfaceTintColor: Colors.transparent,
        shape: RoundedSuperellipseBorder(borderRadius: BorderRadius.circular(28)),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: card,
        modalBackgroundColor: card,
        surfaceTintColor: Colors.transparent,
        modalBarrierColor: (isDark ? Colors.black : AppColors.sand950).withValues(alpha: 0.45),
        elevation: 0,
        modalElevation: 0,
        dragHandleColor: border,
        dragHandleSize: const Size(36, 4),
        showDragHandle: true,
        clipBehavior: Clip.antiAlias,
        shape: const RoundedSuperellipseBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
        ),
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: card,
        surfaceTintColor: Colors.transparent,
        elevation: 8,
        shadowColor: (isDark ? Colors.black : AppColors.brand950).withValues(alpha: 0.22),
        shape: RoundedSuperellipseBorder(
          borderRadius: BorderRadius.circular(AppRadii.lg),
          side: BorderSide(color: border),
        ),
        textStyle: textTheme.bodyMedium,
      ),
      menuTheme: MenuThemeData(
        style: MenuStyle(
          backgroundColor: WidgetStatePropertyAll(card),
          surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
          shape: WidgetStatePropertyAll(
            RoundedSuperellipseBorder(
              borderRadius: BorderRadius.circular(AppRadii.lg),
              side: BorderSide(color: border),
            ),
          ),
        ),
      ),
      listTileTheme: ListTileThemeData(
        iconColor: mutedForeground,
        textColor: cardForeground,
        titleTextStyle: textTheme.bodyMedium,
        subtitleTextStyle: textTheme.bodySmall,
        shape: RoundedSuperellipseBorder(borderRadius: BorderRadius.circular(AppRadii.md)),
        minVerticalPadding: 10,
      ),
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: isDark ? AppColors.sand100 : AppColors.sand900,
          borderRadius: BorderRadius.circular(AppRadii.sm),
        ),
        textStyle: TextStyle(
          fontFamily: _fontSans,
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: isDark ? AppColors.sand900 : AppColors.sand50,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        waitDuration: const Duration(milliseconds: 500),
      ),
      scrollbarTheme: ScrollbarThemeData(
        thumbColor: WidgetStatePropertyAll(mutedForeground.withValues(alpha: 0.35)),
        radius: const Radius.circular(AppRadii.pill),
        thickness: const WidgetStatePropertyAll(6),
        crossAxisMargin: 2,
      ),
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: primary,
        selectionColor: primary.withValues(alpha: 0.22),
        selectionHandleColor: primary,
      ),
      checkboxTheme: CheckboxThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
        side: BorderSide(color: border, width: 1.5),
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? primary : Colors.transparent,
        ),
        checkColor: WidgetStatePropertyAll(primaryForeground),
      ),
      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? primary : border,
        ),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: SegmentedButton.styleFrom(
          backgroundColor: card,
          foregroundColor: mutedForeground,
          selectedBackgroundColor: secondary,
          selectedForegroundColor: secondaryForeground,
          side: BorderSide(color: border),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontFamily: _fontSans, fontWeight: FontWeight.w600, fontSize: 13),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: isDark ? AppColors.sand50 : AppColors.sand900,
        contentTextStyle: TextStyle(color: isDark ? AppColors.sand900 : AppColors.sand50),
        behavior: SnackBarBehavior.floating,
        shape: RoundedSuperellipseBorder(borderRadius: BorderRadius.circular(AppRadii.lg)),
        insetPadding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: card,
        indicatorColor: secondary,
        useIndicator: true,
        indicatorShape: const StadiumBorder(),
        selectedIconTheme: IconThemeData(color: primary, size: 22),
        unselectedIconTheme: IconThemeData(color: mutedForeground, size: 22),
        selectedLabelTextStyle: TextStyle(
          fontFamily: _fontSans,
          fontSize: 11,
          color: primary,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelTextStyle: TextStyle(fontFamily: _fontSans, fontSize: 11, color: mutedForeground),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? primary : mutedForeground,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? secondary : muted,
        ),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: primary),
      dataTableTheme: DataTableThemeData(
        headingRowColor: WidgetStateProperty.all(muted),
        dataRowColor: WidgetStateProperty.all(card),
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: FadeUpwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
    );
  }

  static TextTheme _textTheme(Color foreground, Color muted) {
    return TextTheme(
      displayLarge: TextStyle(
        fontFamily: _fontDisplay,
        fontWeight: FontWeight.w600,
        fontSize: 40,
        letterSpacing: -0.5,
        height: 1.1,
        color: foreground,
      ),
      displayMedium: TextStyle(
        fontFamily: _fontDisplay,
        fontWeight: FontWeight.w600,
        fontSize: 32,
        letterSpacing: -0.4,
        height: 1.15,
        color: foreground,
      ),
      headlineLarge: TextStyle(
        fontFamily: _fontDisplay,
        fontWeight: FontWeight.w600,
        fontSize: 28,
        letterSpacing: -0.3,
        height: 1.15,
        color: foreground,
      ),
      headlineMedium: TextStyle(
        fontFamily: _fontDisplay,
        fontWeight: FontWeight.w600,
        fontSize: 24,
        letterSpacing: -0.3,
        height: 1.2,
        color: foreground,
      ),
      headlineSmall: TextStyle(
        fontFamily: _fontDisplay,
        fontWeight: FontWeight.w600,
        fontSize: 20,
        letterSpacing: -0.2,
        color: foreground,
      ),
      titleLarge: TextStyle(
        fontFamily: _fontDisplay,
        fontWeight: FontWeight.w600,
        fontSize: 18,
        letterSpacing: -0.2,
        color: foreground,
      ),
      titleMedium: TextStyle(
        fontFamily: _fontSans,
        fontWeight: FontWeight.w600,
        fontSize: 16,
        color: foreground,
      ),
      titleSmall: TextStyle(
        fontFamily: _fontSans,
        fontWeight: FontWeight.w600,
        fontSize: 14,
        color: foreground,
      ),
      bodyLarge: TextStyle(fontFamily: _fontSans, fontSize: 16, color: foreground, height: 1.5),
      bodyMedium: TextStyle(fontFamily: _fontSans, fontSize: 14, color: foreground, height: 1.5),
      bodySmall: TextStyle(fontFamily: _fontSans, fontSize: 13, color: muted, height: 1.4),
      labelLarge: TextStyle(
        fontFamily: _fontSans,
        fontWeight: FontWeight.w600,
        fontSize: 14,
        color: foreground,
      ),
      labelMedium: TextStyle(
        fontFamily: _fontSans,
        fontWeight: FontWeight.w600,
        fontSize: 11,
        letterSpacing: 1.5,
        color: muted,
      ),
      labelSmall: TextStyle(
        fontFamily: _fontSans,
        fontWeight: FontWeight.w600,
        fontSize: 10,
        letterSpacing: 1.5,
        color: muted,
      ),
    );
  }
}

/// Warm, magenta-tinted card shadow — mirrors `--shadow-card` from the web
/// app rather than a flat black shadow.
List<BoxShadow> cardShadow(BuildContext context) {
  final isDark = Theme.of(context).brightness == Brightness.dark;
  if (isDark) {
    return [
      BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 3, offset: const Offset(0, 1)),
      BoxShadow(color: Colors.black.withValues(alpha: 0.35), blurRadius: 12, offset: const Offset(0, 4)),
    ];
  }
  return [
    BoxShadow(color: AppColors.brand950.withValues(alpha: 0.06), blurRadius: 3, offset: const Offset(0, 1)),
    BoxShadow(color: AppColors.brand950.withValues(alpha: 0.05), blurRadius: 14, offset: const Offset(0, 4)),
  ];
}

/// A barely-there lift for resting surfaces (list cards, stat tiles). Softer
/// than [cardShadow] so a grid of cards doesn't read as a grid of buttons.
List<BoxShadow> restingShadow(BuildContext context) {
  final isDark = Theme.of(context).brightness == Brightness.dark;
  if (isDark) {
    return [BoxShadow(color: Colors.black.withValues(alpha: 0.28), blurRadius: 10, offset: const Offset(0, 3))];
  }
  return [
    BoxShadow(color: AppColors.brand950.withValues(alpha: 0.04), blurRadius: 2, offset: const Offset(0, 1)),
    BoxShadow(color: AppColors.brand950.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 4)),
  ];
}

/// The deep, wide shadow that lets the floating dock and other detached
/// chrome sit convincingly *above* the page rather than on it.
List<BoxShadow> floatingShadow(BuildContext context) {
  final isDark = Theme.of(context).brightness == Brightness.dark;
  if (isDark) {
    return [
      BoxShadow(color: Colors.black.withValues(alpha: 0.55), blurRadius: 28, offset: const Offset(0, 10)),
      BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 6, offset: const Offset(0, 2)),
    ];
  }
  return [
    BoxShadow(color: AppColors.brand950.withValues(alpha: 0.12), blurRadius: 28, offset: const Offset(0, 10)),
    BoxShadow(color: AppColors.brand950.withValues(alpha: 0.07), blurRadius: 6, offset: const Offset(0, 2)),
  ];
}
