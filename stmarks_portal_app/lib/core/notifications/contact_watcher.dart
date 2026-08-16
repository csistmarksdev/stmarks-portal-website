import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/admin.dart';
import '../models/common.dart';
import '../providers/providers.dart';
import 'notification_service.dart';

/// How often the inbox is checked while the app is in the foreground.
///
/// The server offers no push channel, so this is a poll. Ninety seconds is a
/// compromise: fast enough that someone watching for a reply is not left
/// waiting, slow enough that a phone left open on this screen all morning
/// makes forty requests, not four thousand.
const Duration kContactPollInterval = Duration(seconds: 90);

/// The unread count, published for the badges.
final unreadContactCountProvider = StateProvider<int>((ref) => 0);

/// Watches the contact inbox and raises a device notification when a message
/// arrives that this device has not already announced.
///
/// **What this does not do:** fire when the app is closed. Local notifications
/// need the app's isolate to be alive, and nothing on the server can wake it.
/// Real background delivery needs a push service the backend does not have
/// yet — see the class docs on [NotificationService].
class ContactWatcher with WidgetsBindingObserver {
  ContactWatcher(this._ref);

  final Ref _ref;
  Timer? _timer;

  /// Ids already announced, so a message is never notified twice — a plain
  /// count would re-fire every poll for as long as the message stayed unread.
  final Set<String> _announced = {};

  /// The first poll of a session only learns the current state. Without this,
  /// signing in with eleven unread messages would fire eleven notifications
  /// for mail that has been sitting there for a week.
  bool _primed = false;

  void start() {
    WidgetsBinding.instance.addObserver(this);
    _schedule();
    unawaited(_poll());
  }

  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Polling a backgrounded app is a battery cost with no reader at the other
    // end; the check on resume catches anything missed.
    if (state == AppLifecycleState.resumed) {
      _schedule();
      unawaited(_poll());
    } else {
      _timer?.cancel();
    }
  }

  void _schedule() {
    _timer?.cancel();
    _timer = Timer.periodic(kContactPollInterval, (_) => _poll());
  }

  /// Forgets what has been announced — called on sign-out so the next person
  /// to use this device is not silently denied alerts for the same messages.
  void reset() {
    _announced.clear();
    _primed = false;
    _ref.read(unreadContactCountProvider.notifier).state = 0;
  }

  Future<void> _poll() async {
    final auth = _ref.read(authControllerProvider);
    if (!auth.isAuthenticated) return;
    // Someone who cannot open the inbox should not be told there is post in it.
    if (!roleHasPermission(auth.user?.role, 'contact.read')) return;

    final api = _ref.read(apiClientProvider);
    if (!api.isConfigured) return;

    try {
      final json = await api.get<Map<String, dynamic>>(
        '/admin/contact-messages',
        params: {'page': 1, 'pageSize': 10, 'unread': true},
      );
      final page = Paginated.fromJson(json, ContactMessage.fromJson);
      final unread = page.total;
      _ref.read(unreadContactCountProvider.notifier).state = unread;

      if (!_primed) {
        _announced.addAll(page.items.map((m) => m.id));
        _primed = true;
        return;
      }

      final fresh = page.items.where((m) => !_announced.contains(m.id)).toList();
      if (fresh.isEmpty) return;
      _announced.addAll(fresh.map((m) => m.id));

      if (fresh.length == 1) {
        final m = fresh.first;
        await NotificationService.instance.showContactMessage(
          id: m.id.hashCode & 0x7fffffff,
          title: 'New message from ${m.name}',
          body: m.subject.isNotEmpty ? m.subject : m.message,
          unreadTotal: unread,
        );
      } else {
        await NotificationService.instance.showContactMessage(
          id: 0,
          title: '${fresh.length} new contact messages',
          body: fresh.map((m) => m.name).take(3).join(', '),
          unreadTotal: unread,
        );
      }
    } catch (e) {
      // A failed poll is not worth surfacing: the inbox screen reports its own
      // errors, and this runs unattended in the background of every screen.
      debugPrint('Contact poll failed: $e');
    }
  }
}

final contactWatcherProvider = Provider<ContactWatcher>((ref) {
  final watcher = ContactWatcher(ref);
  ref.onDispose(watcher.dispose);
  return watcher;
});
