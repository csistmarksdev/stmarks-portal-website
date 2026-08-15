import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Semantic surfaces that don't map onto Material's [ColorScheme] slots —
/// mirrors the Portal web app's CSS custom properties (`--card-wash`,
/// `--success`, `--hover-tint`, `--accent-fg`, ...).
class AppSemanticColors extends ThemeExtension<AppSemanticColors> {
  const AppSemanticColors({
    required this.cardWash,
    required this.success,
    required this.successSoft,
    required this.hoverTint,
    required this.accentForeground,
    required this.warningSoft,
    required this.mutedSoft,
  });

  final Color cardWash;
  final Color success;
  final Color successSoft;
  final Color hoverTint;
  final Color accentForeground;
  final Color warningSoft;
  final Color mutedSoft;

  static const light = AppSemanticColors(
    cardWash: AppColors.sand50,
    success: AppColors.successLight,
    successSoft: AppColors.successSoftLight,
    hoverTint: AppColors.brand50,
    accentForeground: AppColors.accent700,
    warningSoft: AppColors.accent100,
    mutedSoft: AppColors.sand100,
  );

  static const dark = AppSemanticColors(
    cardWash: AppColors.darkCardWash,
    success: AppColors.successDark,
    successSoft: AppColors.successSoftDark,
    hoverTint: Color(0xFF251A1E),
    accentForeground: AppColors.accent300,
    warningSoft: Color(0xFF3A2416),
    mutedSoft: AppColors.darkMuted,
  );

  @override
  AppSemanticColors copyWith({
    Color? cardWash,
    Color? success,
    Color? successSoft,
    Color? hoverTint,
    Color? accentForeground,
    Color? warningSoft,
    Color? mutedSoft,
  }) {
    return AppSemanticColors(
      cardWash: cardWash ?? this.cardWash,
      success: success ?? this.success,
      successSoft: successSoft ?? this.successSoft,
      hoverTint: hoverTint ?? this.hoverTint,
      accentForeground: accentForeground ?? this.accentForeground,
      warningSoft: warningSoft ?? this.warningSoft,
      mutedSoft: mutedSoft ?? this.mutedSoft,
    );
  }

  @override
  AppSemanticColors lerp(ThemeExtension<AppSemanticColors>? other, double t) {
    if (other is! AppSemanticColors) return this;
    return AppSemanticColors(
      cardWash: Color.lerp(cardWash, other.cardWash, t)!,
      success: Color.lerp(success, other.success, t)!,
      successSoft: Color.lerp(successSoft, other.successSoft, t)!,
      hoverTint: Color.lerp(hoverTint, other.hoverTint, t)!,
      accentForeground: Color.lerp(accentForeground, other.accentForeground, t)!,
      warningSoft: Color.lerp(warningSoft, other.warningSoft, t)!,
      mutedSoft: Color.lerp(mutedSoft, other.mutedSoft, t)!,
    );
  }
}

extension AppSemanticColorsX on BuildContext {
  AppSemanticColors get semanticColors =>
      Theme.of(this).extension<AppSemanticColors>() ?? AppSemanticColors.light;
}
