import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:deo_crm_mobile/core/api/auth_api.dart';
import 'package:deo_crm_mobile/core/api/api_service.dart';
import 'package:deo_crm_mobile/entities/user.dart';

// Generate mocks
@GenerateMocks([Dio, FlutterSecureStorage])
import 'auth_api_test.mocks.dart';

void main() {
  late MockDio mockDio;
  late MockFlutterSecureStorage mockStorage;
  late ProviderContainer container;
  late AuthApi authApi;

  setUp(() {
    mockDio = MockDio();
    mockStorage = MockFlutterSecureStorage();

    container = ProviderContainer(overrides: [
      dioProvider.overrideWithValue(mockDio as Dio),
      secureStorageProvider.overrideWithValue(mockStorage),
    ]);

    authApi = container.read(authApiProvider);
  });

  tearDown(() {
    container.dispose();
  });

  group('AuthApi.login', () {
    test('returns LoginResponse on success', () async {
      final responseData = {
        'access': 'access-token-123',
        'refresh': 'refresh-token-456',
        'user': {
          'id': 'user-uuid-1',
          'email': 'test@deostudio.com',
          'first_name': 'Иван',
          'last_name': 'Петров',
        },
      };

      when(mockDio.post(
        any,
        data: anyNamed('data'),
        options: anyNamed('options'),
        queryParameters: anyNamed('queryParameters'),
        cancelToken: anyNamed('cancelToken'),
        onSendProgress: anyNamed('onSendProgress'),
        onReceiveProgress: anyNamed('onReceiveProgress'),
      )).thenAnswer((_) async => Response(
        requestOptions: RequestOptions(path: '/auth/login/'),
        data: responseData,
        statusCode: 200,
      ));

      when(mockStorage.write(key: anyNamed('key'), value: anyNamed('value')))
          .thenAnswer((_) async => {});

      final result = await authApi.login('test@deostudio.com', 'securePass123');

      expect(result.access, 'access-token-123');
      expect(result.refresh, 'refresh-token-456');
      expect(result.user.email, 'test@deostudio.com');
      expect(result.user.firstName, 'Иван');
      verify(mockStorage.write(key: 'access_token', value: 'access-token-123')).called(1);
      verify(mockStorage.write(key: 'refresh_token', value: 'refresh-token-456')).called(1);
    });

    test('throws on invalid credentials', () async {
      when(mockDio.post(
        any,
        data: anyNamed('data'),
      )).thenThrow(DioException(
        requestOptions: RequestOptions(path: '/auth/login/'),
        response: Response(
          requestOptions: RequestOptions(path: '/auth/login/'),
          statusCode: 401,
          data: {'detail': 'Неверные учетные данные'},
        ),
      ));

      expect(
        () => authApi.login('wrong@email.com', 'wrong'),
        throwsA(isA<DioException>()),
      );
    });
  });

  group('AuthApi.getMe', () {
    test('returns current user', () async {
      final responseData = {
        'id': 'user-uuid-1',
        'email': 'test@deostudio.com',
        'first_name': 'Иван',
        'last_name': 'Петров',
        'role_name': 'admin',
        'is_active': true,
      };

      when(mockDio.get(
        any,
        options: anyNamed('options'),
        queryParameters: anyNamed('queryParameters'),
        cancelToken: anyNamed('cancelToken'),
        onReceiveProgress: anyNamed('onReceiveProgress'),
      )).thenAnswer((_) async => Response(
        requestOptions: RequestOptions(path: '/auth/me/'),
        data: responseData,
        statusCode: 200,
      ));

      final user = await authApi.getMe();

      expect(user.id, 'user-uuid-1');
      expect(user.email, 'test@deostudio.com');
      expect(user.roleName, 'admin');
    });
  });

  group('AuthApi.logout', () {
    test('clears tokens on logout', () async {
      when(mockStorage.read(key: 'refresh_token'))
          .thenAnswer((_) async => 'refresh-token-456');

      when(mockDio.post(
        any,
        data: anyNamed('data'),
      )).thenAnswer((_) async => Response(
        requestOptions: RequestOptions(path: '/auth/logout/'),
        data: {},
        statusCode: 200,
      ));

      when(mockStorage.deleteAll()).thenAnswer((_) async => {});

      await authApi.logout();

      verify(mockStorage.deleteAll()).called(1);
    });

    test('handles logout when no refresh token', () async {
      when(mockStorage.read(key: 'refresh_token'))
          .thenAnswer((_) async => null);

      when(mockStorage.deleteAll()).thenAnswer((_) async => {});

      await authApi.logout();

      verify(mockStorage.deleteAll()).called(1);
    });
  });

  group('AuthApi.isAuthenticated', () {
    test('returns true when token exists', () async {
      when(mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => 'valid-token');

      final result = await authApi.isAuthenticated();

      expect(result, isTrue);
    });

    test('returns false when no token', () async {
      when(mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => null);

      final result = await authApi.isAuthenticated();

      expect(result, isFalse);
    });
  });
}
