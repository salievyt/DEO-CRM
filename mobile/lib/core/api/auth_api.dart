import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../entities/user.dart';
import 'api_service.dart';

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
    final response = await _api.post('/auth/login/', data: {
      'email': email,
      'password': password,
    });
    final data = response.data as Map<String, dynamic>;
    final loginResponse = LoginResponse.fromJson(data);

    await _storage.write(key: 'access_token', value: loginResponse.access);
    await _storage.write(key: 'refresh_token', value: loginResponse.refresh);

    return loginResponse;
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
    await _api.post('/auth/change-password/', data: {
      'old_password': oldPassword,
      'new_password': newPassword,
    });
  }

  Future<void> logout() async {
    final refresh = await _storage.read(key: 'refresh_token');
    if (refresh != null) {
      try {
        await _api.post('/auth/logout/', data: {'refresh': refresh});
      } catch (_) {}
    }
    await _storage.deleteAll();
  }

  Future<bool> isAuthenticated() async {
    final token = await _storage.read(key: 'access_token');
    return token != null && token.isNotEmpty;
  }

  Future<String?> getAccessToken() async {
    return await _storage.read(key: 'access_token');
  }
}
