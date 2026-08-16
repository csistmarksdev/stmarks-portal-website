import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Device notifications for the portal.
///
/// These are *local* notifications raised by the app itself. The Portal server
/// has no push infrastructure — no FCM, no web-push, no websocket — so nothing
/// can wake the app from the outside. What this can do is alert the person
/// holding the phone while the app is running; see [ContactWatcher] for the
/// polling that drives it.
class NotificationService {
  NotificationService._();

  static final NotificationService instance = NotificationService._();

  final _plugin = FlutterLocalNotificationsPlugin();
  bool _ready = false;

  /// Set by the router bridge so a tapped notification can navigate.
  void Function(String route)? onOpenRoute;

  static const _contactChannel = AndroidNotificationChannel(
    'contact_messages',
    'Contact messages',
    description: 'When someone writes in through the parish contact form.',
    importance: Importance.high,
  );

  Future<void> init() async {
    if (_ready) return;

    const settings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(
        // Asked for explicitly in [requestPermission] instead, so the prompt
        // arrives with the rest of the app on screen rather than at launch.
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
      ),
    );

    try {
      await _plugin.initialize(
        settings: settings,
        onDidReceiveNotificationResponse: (response) {
          final route = response.payload;
          if (route != null && route.isNotEmpty) onOpenRoute?.call(route);
        },
      );
      await _plugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_contactChannel);
      _ready = true;
    } catch (e, stack) {
      // A device that refuses to set up notifications must not take the app
      // down with it — everything else still works without them.
      debugPrint('Notifications unavailable: $e\n$stack');
    }
  }

  /// Asks for permission. Android 13+ and iOS both require this, and both
  /// return false rather than throwing if the user declines.
  Future<bool> requestPermission() async {
    if (!_ready) await init();
    if (!_ready) return false;
    try {
      final android = _plugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      if (android != null) {
        return await android.requestNotificationsPermission() ?? false;
      }
      final ios =
          _plugin.resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>();
      if (ios != null) {
        return await ios.requestPermissions(alert: true, badge: true, sound: true) ?? false;
      }
    } catch (e) {
      debugPrint('Notification permission request failed: $e');
    }
    return false;
  }

  Future<void> showContactMessage({
    required int id,
    required String title,
    required String body,
    required int unreadTotal,
  }) async {
    if (!_ready) return;
    try {
      await _plugin.show(
        id: id,
        title: title,
        body: body,
        payload: '/contact-messages',
        notificationDetails: NotificationDetails(
          android: AndroidNotificationDetails(
            _contactChannel.id,
            _contactChannel.name,
            channelDescription: _contactChannel.description,
            importance: Importance.high,
            priority: Priority.high,
            // Several messages arriving at once should stack into one entry
            // in the shade rather than a column of near-identical rows.
            groupKey: _contactChannel.id,
            number: unreadTotal,
            styleInformation: BigTextStyleInformation(body),
          ),
          iOS: const DarwinNotificationDetails(threadIdentifier: 'contact_messages'),
        ),
      );
    } catch (e) {
      debugPrint('Could not show notification: $e');
    }
  }

  Future<void> cancelAll() async {
    if (!_ready) return;
    try {
      await _plugin.cancelAll();
    } catch (_) {}
  }
}
