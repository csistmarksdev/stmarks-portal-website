import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:csi_portal/core/providers/providers.dart';
import 'package:csi_portal/core/storage/local_store.dart';
import 'package:csi_portal/core/theme/app_theme.dart';
import 'package:csi_portal/widgets/brand_mark.dart';
import 'package:csi_portal/widgets/empty_state.dart';
import 'package:csi_portal/widgets/status_badge.dart';
import 'package:csi_portal/widgets/theme_toggle.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('BrandMark & Lockup', () {
    testWidgets('BrandLockup renders church title and diocesan elements', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: const Scaffold(
            body: BrandLockup(),
          ),
        ),
      );

      expect(find.text("StMarksChurch"), findsOneWidget);
      expect(find.text('CSI MADIPAKKAM'), findsOneWidget);
    });
  });

  group('StatusBadge Widget', () {
    testWidgets('renders Published badge correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: const Scaffold(
            body: StatusBadge(status: 'published'),
          ),
        ),
      );

      expect(find.text('Published'), findsOneWidget);
    });

    testWidgets('renders Archived badge correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: const Scaffold(
            body: StatusBadge(status: 'archived'),
          ),
        ),
      );

      expect(find.text('Archived'), findsOneWidget);
    });

    testWidgets('renders Draft badge for default/draft status', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: const Scaffold(
            body: StatusBadge(status: 'draft'),
          ),
        ),
      );

      expect(find.text('Draft'), findsOneWidget);
    });
  });

  group('EmptyState Widget', () {
    testWidgets('renders title, message, and optional action button', (tester) async {
      bool actionTapped = false;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: Scaffold(
            body: EmptyState(
              icon: Icons.inbox_outlined,
              title: 'No Items Found',
              message: 'Try adding a new item.',
              actionLabel: 'Add Item',
              onAction: () => actionTapped = true,
            ),
          ),
        ),
      );

      expect(find.text('No Items Found'), findsOneWidget);
      expect(find.text('Try adding a new item.'), findsOneWidget);
      expect(find.text('Add Item'), findsOneWidget);

      await tester.tap(find.text('Add Item'));
      expect(actionTapped, isTrue);
    });
  });

  group('ThemeToggle Widget', () {
    testWidgets('renders Light, Dark, Auto segments and switches theme', (tester) async {
      SharedPreferences.setMockInitialValues({});
      final store = await LocalStore.instance();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [localStoreProvider.overrideWithValue(store)],
          child: MaterialApp(
            theme: AppTheme.light(),
            home: const Scaffold(
              body: ThemeToggle(),
            ),
          ),
        ),
      );

      expect(find.text('Light'), findsOneWidget);
      expect(find.text('Dark'), findsOneWidget);
      expect(find.text('Auto'), findsOneWidget);

      await tester.tap(find.text('Dark'));
      await tester.pump();

      expect(store.themeMode, 'dark');
    });
  });
}
