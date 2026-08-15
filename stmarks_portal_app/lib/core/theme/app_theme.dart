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

class AppTheme {
  AppTheme._();

  static const _fontDisplay = 'Fraunces';
  static const _fontSans = 'Inter';

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
      surface: card,
      onSurface: cardForeground,
      surfaceContainerHighest: muted,
      onSurfaceVariant: mutedForeground,
      outline: border,
      outlineVariant: border,
      inverseSurface: isDark ? AppColors.sand50 : AppColors.sand900,
      onInverseSurface: isDark ? AppColors.sand900 : AppColors.sand50,
      primaryContainer: secondary,
      onPrimaryContainer: secondaryForeground,
      tertiary: isDark ? AppColors.accent300 : AppColors.accent700,
      onTertiary: isDark ? AppColors.darkBackground : Colors.white,
    );

    final textTheme = _textTheme(cardForeground, mutedForeground);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      canvasColor: background,
      fontFamily: _fontSans,
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
        shape: RoundedRectangleBorder(
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
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: secondary,
          foregroundColor: secondaryForeground,
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
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.card)),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: card,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadii.card)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: isDark ? AppColors.sand50 : AppColors.sand900,
        contentTextStyle: TextStyle(color: isDark ? AppColors.sand900 : AppColors.sand50),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.md)),
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: card,
        indicatorColor: secondary,
        selectedIconTheme: IconThemeData(color: primary),
        unselectedIconTheme: IconThemeData(color: mutedForeground),
        selectedLabelTextStyle: TextStyle(color: primary, fontWeight: FontWeight.w600),
        unselectedLabelTextStyle: TextStyle(color: mutedForeground),
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
