import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:deo_crm_mobile/features/auth/data/auth_providers.dart';
import 'package:deo_crm_mobile/core/api/auth_api.dart';
import 'package:deo_crm_mobile/entities/user.dart';

@GenerateMocks([AuthApi])
import 'auth_providers_test.mocks.dart';

void main() {
  late MockAuthApi mockAuthApi;
  late ProviderContainer container;

  setUp(() {
    mockAuthApi = MockAuthApi();

    container = ProviderContainer(overrides: [
      authApiProvider.overrideWithValue(mockAuthApi),
    ]);
  });

  tearDown(() {
    container.dispose();
  });

  group('AuthNotifier', () {
    test('initial state is data(null)', () {
      final state = container.read(authStateProvider);
      expect(state.valueOrNull, isNull);
    });

    test('login sets user on success', () async {
      final user = User(
        id: 'user-uuid-1',
        email: 'test@deostudio.com',
        firstName: 'Иван',
        lastName: 'Петров',
      );

      when(mockAuthApi.login('test@deostudio.com', 'pass123'))
          .thenAnswer((_) async => LoginResponse(
                access: 'access-token',
                refresh: 'refresh-token',
                user: user,
              ));

      await container.read(authStateProvider.notifier).login('test@deostudio.com', 'pass123');

      final state = container.read(authStateProvider);
      expect(state.valueOrNull?.email, 'test@deostudio.com');
      expect(state.valueOrNull?.firstName, 'Иван');
    });

    test('login sets error on failure', () async {
      when(mockAuthApi.login('wrong@email.com', 'wrongpass'))
          .thenThrow(Exception('Неверные учетные данные'));

      await container.read(authStateProvider.notifier).login('wrong@email.com', 'wrongpass');

      final state = container.read(authStateProvider);
      expect(state.hasError, isTrue);
      expect(state.valueOrNull, isNull);
    });

    test('logout clears user', () async {
      // First login
      final user = User(
        id: 'user-uuid-1',
        email: 'test@deostudio.com',
        firstName: 'Иван',
        lastName: 'Петров',
      );

      when(mockAuthApi.login('test@deostudio.com', 'pass123'))
          .thenAnswer((_) async => LoginResponse(
                access: 'token',
                refresh: 'refresh',
                user: user,
              ));
      when(mockAuthApi.logout()).thenAnswer((_) async => {});

      await container.read(authStateProvider.notifier).login('test@deostudio.com', 'pass123');
      expect(container.read(authStateProvider).valueOrNull, isNotNull);

      // Then logout
      await container.read(authStateProvider.notifier).logout();

      final state = container.read(authStateProvider);
      expect(state.valueOrNull, isNull);
    });

    test('loadUser loads user when authenticated', () async {
      when(mockAuthApi.isAuthenticated()).thenAnswer((_) async => true);
      when(mockAuthApi.getMe()).thenAnswer((_) async => User(
        id: 'user-uuid-1',
        email: 'test@deostudio.com',
        firstName: 'Иван',
        lastName: 'Петров',
      ));

      await container.read(authStateProvider.notifier).loadUser();

      final state = container.read(authStateProvider);
      expect(state.valueOrNull?.email, 'test@deostudio.com');
    });

    test('loadUser sets null when not authenticated', () async {
      when(mockAuthApi.isAuthenticated()).thenAnswer((_) async => false);

      await container.read(authStateProvider.notifier).loadUser();

      final state = container.read(authStateProvider);
      expect(state.valueOrNull, isNull);
    });

    test('updateProfile updates user data', () async {
      // First login to have user
      final user = User(
        id: 'user-uuid-1',
        email: 'test@deostudio.com',
        firstName: 'Иван',
        lastName: 'Петров',
      );

      when(mockAuthApi.login('test@deostudio.com', 'pass123'))
          .thenAnswer((_) async => LoginResponse(
                access: 'token',
                refresh: 'refresh',
                user: user,
              ));
      await container.read(authStateProvider.notifier).login('test@deostudio.com', 'pass123');

      // Then update
      final updatedUser = User(
        id: 'user-uuid-1',
        email: 'test@deostudio.com',
        firstName: 'Иван',
        lastName: 'Петров',
        phone: '+996700123456',
      );

      when(mockAuthApi.updateProfile({'phone': '+996700123456'}))
          .thenAnswer((_) async => updatedUser);

      await container.read(authStateProvider.notifier).updateProfile({'phone': '+996700123456'});

      final state = container.read(authStateProvider);
      expect(state.valueOrNull?.phone, '+996700123456');
    });
  });
}
