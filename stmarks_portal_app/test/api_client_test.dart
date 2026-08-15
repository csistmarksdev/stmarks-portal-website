import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:csi_portal/core/api/api_client.dart';
import 'package:csi_portal/core/api/api_exception.dart';
import 'package:csi_portal/core/storage/local_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ApiClient', () {
    late LocalStore store;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      store = await LocalStore.instance();
    });

    test('isConfigured is false when apiBaseUrl is empty', () {
      final client = ApiClient(store: store);
      expect(client.isConfigured, isFalse);
      expect(client.baseUrl, '');
    });

    test('baseUrl strips trailing slashes', () async {
      await store.setApiBaseUrl('http://192.168.1.10:4000/v1///');
      final client = ApiClient(store: store);
      expect(client.isConfigured, isTrue);
      expect(client.baseUrl, 'http://192.168.1.10:4000/v1');
    });

    test('absoluteUrl resolves relative paths and strips /v1 or /api prefix', () async {
      await store.setApiBaseUrl('http://192.168.1.10:4000/v1');
      final client = ApiClient(store: store);

      expect(client.absoluteUrl('/uploads/image.png'), 'http://192.168.1.10:4000/uploads/image.png');
      expect(client.absoluteUrl('uploads/image.png'), 'http://192.168.1.10:4000/uploads/image.png');
      expect(client.absoluteUrl('https://cdn.example.com/asset.png'), 'https://cdn.example.com/asset.png');
    });

    test('unconfigured client throws ApiException on request', () {
      final client = ApiClient(store: store);
      expect(() => client.get('/test'), throwsA(isA<ApiException>()));
    });
  });
}
