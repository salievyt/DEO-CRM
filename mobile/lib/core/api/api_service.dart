import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';
import '../cache/cache_interceptor.dart';
import '../cache/hive_cache_service.dart';
import '../../features/auth/data/auth_providers.dart';

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  dio.interceptors.add(AuthInterceptor(ref));
  dio.interceptors.add(
    CacheInterceptor(
      defaultTtl: const Duration(minutes: 5),
      excludePrefixes: ['/auth/', '/token', '/ai/generate', '/focus/'],
    ),
  );

  return dio;
});

class AuthInterceptor extends Interceptor {
  final Ref _ref;

  AuthInterceptor(this._ref);

  Future<String>? _refreshing;

  Future<String> _refresh() async {
    final storage = _ref.read(secureStorageProvider);
    final refresh = await storage.read(key: 'refresh_token');
    if (refresh == null || refresh.isEmpty) {
      throw StateError('Сессия завершена');
    }
    final response = await Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: ApiConfig.connectTimeout,
        receiveTimeout: ApiConfig.timeout,
      ),
    ).post('/auth/refresh/', data: {'refresh': refresh});
    final token = response.data['access'] as String;
    await storage.write(key: 'access_token', value: token);
    if (response.data['refresh'] is String) {
      await storage.write(
        key: 'refresh_token',
        value: response.data['refresh'] as String,
      );
    }
    return token;
  }

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final storage = _ref.read(secureStorageProvider);
    final token = await storage.read(key: 'access_token');
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 &&
        ![
          '/auth/login/',
          '/auth/login/2fa/',
          '/auth/register/',
          '/auth/refresh/',
          '/auth/logout/',
        ].contains(err.requestOptions.path) &&
        err.requestOptions.extra['retried'] != true) {
      try {
        final storage = _ref.read(secureStorageProvider);
        final currentToken = await storage.read(key: 'access_token');
        final sentToken = err.requestOptions.headers['Authorization'];
        String token;
        if (currentToken != null && sentToken != 'Bearer $currentToken') {
          token = currentToken;
        } else {
          final pending = _refreshing ??= _refresh();
          try {
            token = await pending;
          } finally {
            if (identical(_refreshing, pending)) _refreshing = null;
          }
        }
        final options = err.requestOptions;
        options.extra['retried'] = true;
        if (options.data is FormData) {
          options.data = (options.data as FormData).clone();
        }
        options.headers['Authorization'] = 'Bearer $token';
        final retry = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));
        handler.resolve(await retry.fetch(options));
        return;
      } catch (error) {
        final expired =
            error is StateError ||
            (error is DioException &&
                [400, 401, 403].contains(error.response?.statusCode));
        if (expired) {
          await _ref.read(secureStorageProvider).deleteAll();
          await HiveCacheService.instance.clearAll();
          _ref.read(authStateProvider.notifier).clearSession();
        }
      }
    }
    handler.next(err);
  }
}

class ApiService {
  final Dio _dio;

  ApiService(Ref ref) : _dio = ref.read(dioProvider);

  Future<Response> get(String path, {Map<String, dynamic>? params}) =>
      _dio.get(path, queryParameters: params);

  Future<Response> post(String path, {dynamic data}) =>
      _dio.post(path, data: data);

  Future<Response> patch(String path, {dynamic data}) =>
      _dio.patch(path, data: data);

  Future<Response> delete(String path) => _dio.delete(path);

  Future<Response> upload(String path, FormData data) => _dio.post(
    path,
    data: data,
    options: Options(headers: {'Content-Type': 'multipart/form-data'}),
  );
}
