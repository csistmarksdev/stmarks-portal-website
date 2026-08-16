import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/providers/providers.dart';
import 'core/storage/local_store.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Edge-to-edge: the page (and the floating dock's blur) runs under the
  // status and gesture bars instead of stopping at a grey strip.
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  final store = await LocalStore.instance();
  runApp(ProviderScope(overrides: [localStoreProvider.overrideWithValue(store)], child: const PortalApp()));
}
