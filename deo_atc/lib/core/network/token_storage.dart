import 'package:shared_preferences/shared_preferences.dart';

import '../constants/app_config.dart';

/// Thin persistence wrapper around auth tokens.
class TokenStorage {
  TokenStorage(this._prefs);

  final SharedPreferences _prefs;

  static Future<TokenStorage> create() async {
    final prefs = await SharedPreferences.getInstance();
    return TokenStorage(prefs);
  }

  String? get accessToken => _prefs.getString(AppConfig.accessTokenKey);

  Future<void> saveTokens({
    required String access,
    String? refresh,
  }) async {
    await _prefs.setString(AppConfig.accessTokenKey, access);
    if (refresh != null) {
      await _prefs.setString(AppConfig.refreshTokenKey, refresh);
    }
  }

  Future<void> clear() async {
    await _prefs.remove(AppConfig.accessTokenKey);
    await _prefs.remove(AppConfig.refreshTokenKey);
  }
}
