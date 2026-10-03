import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../entities/user.dart';
import 'api_service.dart';
import '../cache/hive_cache_service.dart';

class TwoFactorRequired implements Exception {
  final String challenge;
  TwoFactorRequired(this.challenge);
}

final authApiProvider = Provider<AuthApi>((ref) => AuthApi(ref));

class AuthApi {
  final Ref _ref;
  late final ApiService _api;
  late final FlutterSecureStorage _storage;

  AuthApi(this._ref) {
    _api = ApiService(_ref);
    _storage = _ref.read(secureStorageProvider);
  }

  Future<LoginResponse> login(String email, String password) async {
    final response = await _api.post(
      '/auth/login/',
      data: {'email': email, 'password': password},
    );
    final data = response.data as Map<String, dynamic>;
    if (data['requires_2fa'] == true) {
      throw TwoFactorRequired(data['challenge'] as String);
    }
    return _saveLogin(data);
  }

  Future<LoginResponse> verifyLogin(String challenge, String code) async {
    final response = await _api.post(
      '/auth/login/2fa/',
      data: {'challenge': challenge, 'code': code},
    );
    return _saveLogin(response.data as Map<String, dynamic>);
  }

  Future<LoginResponse> _saveLogin(Map<String, dynamic> data) async {
    await HiveCacheService.instance.clearAll();
    final access = data['access'] as String;
    final refresh = data['refresh'] as String;
    await _storage.write(key: 'access_token', value: access);
    await _storage.write(key: 'refresh_token', value: refresh);
    try {
      final user = data['user'] is Map
          ? User.fromJson(Map<String, dynamic>.from(data['user'] as Map))
          : await getMe();
      return LoginResponse(access: access, refresh: refresh, user: user);
    } catch (_) {
      await _storage.deleteAll();
      rethrow;
    }
  }

  Future<User> register(RegisterRequest request) async {
    final response = await _api.post('/auth/register/', data: request.toJson());
    return User.fromJson(response.data as Map<String, dynamic>);
  }

  Future<User> getMe() async {
    final response = await _api.get('/auth/me/');
    return User.fromJson(response.data as Map<String, dynamic>);
  }

  Future<User> updateProfile(Map<String, dynamic> data) async {
    final response = await _api.patch('/auth/me/', data: data);
    return User.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> changePassword(String oldPassword, String newPassword) async {
    await _api.post(
      '/auth/change-password/',
      data: {'old_password': oldPassword, 'new_password': newPassword},
    );
  }

  Future<void> logout() async {
    final refresh = await _storage.read(key: 'refresh_token');
    if (refresh != null) {
      try {
        await _api.post('/auth/logout/', data: {'refresh': refresh});
      } catch (_) {}
    }
    await _storage.deleteAll();
    await HiveCacheService.instance.clearAll();
  }

  Future<bool> isAuthenticated() async {
    final token = await _storage.read(key: 'access_token');
    return token != null && token.isNotEmpty;
  }

  Future<String?> getAccessToken() async {
    return await _storage.read(key: 'access_token');
  }
}
