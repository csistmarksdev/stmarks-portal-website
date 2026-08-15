// Basic smoke test — verifies the app boots to the "connect to server"
// screen when no API URL has been configured yet, without throwing.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:csi_portal/app.dart';
import 'package:csi_portal/core/providers/providers.dart';
import 'package:csi_portal/core/storage/local_store.dart';

void main() {
  testWidgets('App boots to the connect screen when unconfigured', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    final store = await LocalStore.instance();

    await tester.pumpWidget(
      ProviderScope(overrides: [localStoreProvider.overrideWithValue(store)], child: const PortalApp()),
    );
    await tester.pumpAndSettle();

    expect(find.text('Connect to your Portal'), findsOneWidget);
  });
}
