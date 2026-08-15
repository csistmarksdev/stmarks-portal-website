import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/providers/providers.dart';
import 'core/storage/local_store.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final store = await LocalStore.instance();
  runApp(ProviderScope(overrides: [localStoreProvider.overrideWithValue(store)], child: const PortalApp()));
}
