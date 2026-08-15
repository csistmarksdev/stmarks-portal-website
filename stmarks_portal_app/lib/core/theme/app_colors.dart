import 'package:flutter/material.dart';

/// Brand palette, converted 1:1 from the Portal web app's OKLCH design
/// tokens (`frontend/src/app/globals.css`) so the Flutter app matches the
/// website precisely. Derived from the parish seal: magenta cross (brand),
/// flame lotus (accent), warm parchment neutrals (sand).
class AppColors {
  AppColors._();

  // Brand (magenta)
  static const brand50 = Color(0xFFFFF3F8);
  static const brand100 = Color(0xFFFFE2EE);
  static const brand200 = Color(0xFFFFC8DE);
  static const brand300 = Color(0xFFFA9DC5);
  static const brand400 = Color(0xFFED74A8);
  static const brand500 = Color(0xFFDE528E);
  static const brand600 = Color(0xFFBF2A6D);
  static const brand700 = Color(0xFFA01053);
  static const brand800 = Color(0xFF7E053E);
  static const brand900 = Color(0xFF60022C);
  static const brand950 = Color(0xFF3A0017);

  // Accent (flame)
  static const accent50 = Color(0xFFFFF4ED);
  static const accent100 = Color(0xFFFFE6D9);
  static const accent200 = Color(0xFFFFCCB7);
  static const accent300 = Color(0xFFFFAE8F);
  static const accent400 = Color(0xFFFF8E67);
  static const accent500 = Color(0xFFF96F42);
  static const accent600 = Color(0xFFE24614);
  static const accent700 = Color(0xFFB03316);
  static const accent800 = Color(0xFF862717);
  static const accent900 = Color(0xFF671F14);
  static const accent950 = Color(0xFF46110B);

  // Crimson (destructive only)
  static const crimson400 = Color(0xFFEC5F6B);
  static const crimson500 = Color(0xFFD7364E);
  static const crimson600 = Color(0xFFBC163C);
  static const crimson700 = Color(0xFF9B0730);

  // Sand (warm neutrals)
  static const sand50 = Color(0xFFF8F7F4);
  static const sand100 = Color(0xFFEDEBE7);
  static const sand200 = Color(0xFFDAD7D2);
  static const sand300 = Color(0xFFC1BDB7);
  static const sand400 = Color(0xFFA9A49C);
  static const sand500 = Color(0xFF8E8881);
  static const sand600 = Color(0xFF756F68);
  static const sand700 = Color(0xFF5C5751);
  static const sand800 = Color(0xFF46413C);
  static const sand900 = Color(0xFF312D29);
  static const sand950 = Color(0xFF191512);

  // Semantic (light)
  static const successLight = Color(0xFF14874E);
  static const successSoftLight = Color(0xFFD2F6DD);

  // Semantic (dark ground — near-black with a whisper of magenta)
  static const darkBackground = Color(0xFF0B0506);
  static const darkForeground = Color(0xFFF1EDEE);
  static const darkCard = Color(0xFF170D10);
  static const darkCardWash = Color(0xFF11090B);
  static const darkMuted = Color(0xFF211619);
  static const darkMutedForeground = Color(0xFFABA2A4);
  static const darkBorder = Color(0xFF302226);
  static const darkBorderStrong = Color(0xFF47353A);
  static const darkSecondary = Color(0xFF351A23);
  static const successDark = Color(0xFF4EBE7D);
  static const successSoftDark = Color(0xFF0F3620);
}
