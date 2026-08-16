import 'package:flutter/foundation.dart';
import 'package:flutter_displaymode/flutter_displaymode.dart';

/// Opts the app into the panel's highest refresh rate on Android.
///
/// Flutter does not request a display mode of its own, so the app inherits
/// whatever the OEM's policy decides. On phones with an adaptive panel —
/// Samsung's "motion smoothness" being the common case — that policy quietly
/// runs apps that never asked at 60Hz, even when the display is capable of
/// 120. Naming a preferred mode is what takes the app off that default.
///
/// iOS needs no equivalent: ProMotion is opt-in via `CADisableMinimumFrameDuration`
/// in Info.plist, which is a build-time flag rather than a runtime call.
class RefreshRate {
  RefreshRate._();

  /// The mode the app ended up on, for diagnostics. Null until [apply] runs,
  /// and on any platform without switchable modes.
  static DisplayMode? active;

  /// Picks the highest refresh rate available *at the current resolution*.
  ///
  /// Deliberately not `setHighRefreshRate()`, which sorts by refresh rate
  /// alone: on a phone offering 1080p120 and 1440p60 that helper is fine, but
  /// on one offering 720p144 and 1080p120 it would quietly drop the user to a
  /// lower resolution to win 24Hz. Resolution is the user's choice; frame rate
  /// is ours to ask for.
  static Future<void> apply() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;

    try {
      final modes = await FlutterDisplayMode.supported;
      if (modes.isEmpty) return;

      final current = await FlutterDisplayMode.active;
      final sameResolution = modes
          .where((m) => m.width == current.width && m.height == current.height)
          .toList();
      final candidates = sameResolution.isEmpty ? modes : sameResolution;

      candidates.sort((a, b) => b.refreshRate.compareTo(a.refreshRate));
      final best = candidates.first;

      if (best.refreshRate > current.refreshRate) {
        await FlutterDisplayMode.setPreferredMode(best);
      }
      active = await FlutterDisplayMode.active;
      debugPrint(
        'Display: ${active!.width}x${active!.height} @ '
        '${active!.refreshRate.toStringAsFixed(1)}Hz '
        '(offered: ${modes.map((m) => m.refreshRate.round()).toSet().join('/')}Hz)',
      );
    } catch (e) {
      // Emulators and some OEMs have no mode list at all. Running at the
      // system default is a perfectly good outcome, not an error.
      debugPrint('Could not set a display mode: $e');
    }
  }
}
