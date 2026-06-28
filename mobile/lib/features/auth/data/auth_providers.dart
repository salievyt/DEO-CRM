import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/auth_api.dart';
import '../../../entities/user.dart';

final authStateProvider = StateNotifierProvider<AuthNotifier, AsyncValue<User?>>((ref) {
  return AuthNotifier(ref);
});

class AuthNotifier extends StateNotifier<AsyncValue<User?>> {
  final Ref _ref;

  AuthNotifier(this._ref) : super(const AsyncValue.data(null));

  AuthApi get _auth => _ref.read(authApiProvider);

  Future<void> login(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      final response = await _auth.login(email, password);
      state = AsyncValue.data(response.user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> register(RegisterRequest request) async {
    state = const AsyncValue.loading();
    try {
      final user = await _auth.register(request);
      state = AsyncValue.data(user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> loadUser() async {
    try {
      final isAuth = await _auth.isAuthenticated();
      if (!isAuth) {
        state = const AsyncValue.data(null);
        return;
      }
      final user = await _auth.getMe();
      state = AsyncValue.data(user);
    } catch (e, st) {
      state = const AsyncValue.data(null);
    }
  }

  Future<void> logout() async {
    await _auth.logout();
    state = const AsyncValue.data(null);
  }

  Future<void> updateProfile(Map<String, dynamic> data) async {
    try {
      final user = await _auth.updateProfile(data);
      state = AsyncValue.data(user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}
