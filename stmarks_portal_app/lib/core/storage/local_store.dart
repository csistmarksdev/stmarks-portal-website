import 'package:shared_preferences/shared_preferences.dart';

/// Thin wrapper over [SharedPreferences] for the handful of persisted keys
/// the app needs — API base URL, tokens, theme choice. Mirrors what the web
/// app keeps in `localStorage`.
class LocalStore {
  LocalStore._(this._prefs);

  final SharedPreferences _prefs;

  static LocalStore? _instance;

  static Future<LocalStore> instance() async {
    if (_instance != null) return _instance!;
    final prefs = await SharedPreferences.getInstance();
    _instance = LocalStore._(prefs);
    return _instance!;
  }

  static const _kApiBaseUrl = 'portal.apiBaseUrl';
  static const _kAccessToken = 'portal.accessToken';
  static const _kRefreshToken = 'portal.refreshToken';
  static const _kThemeMode = 'portal.theme';
  static const _kLocale = 'portal.locale';

  String? get apiBaseUrl => _prefs.getString(_kApiBaseUrl);
  Future<void> setApiBaseUrl(String? value) async {
    if (value == null || value.isEmpty) {
      await _prefs.remove(_kApiBaseUrl);
    } else {
      await _prefs.setString(_kApiBaseUrl, value);
    }
  }

  String? get accessToken => _prefs.getString(_kAccessToken);
  String? get refreshToken => _prefs.getString(_kRefreshToken);

  Future<void> setTokens({required String accessToken, required String refreshToken}) async {
    await _prefs.setString(_kAccessToken, accessToken);
    await _prefs.setString(_kRefreshToken, refreshToken);
  }

  Future<void> clearTokens() async {
    await _prefs.remove(_kAccessToken);
    await _prefs.remove(_kRefreshToken);
  }

  String get themeMode => _prefs.getString(_kThemeMode) ?? 'system';
  Future<void> setThemeMode(String value) => _prefs.setString(_kThemeMode, value);

  String get locale => _prefs.getString(_kLocale) ?? 'en';
  Future<void> setLocale(String value) => _prefs.setString(_kLocale, value);
}
