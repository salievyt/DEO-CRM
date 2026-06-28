import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';
import '../cache/cache_interceptor.dart';

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: ApiConfig.baseUrl,
    connectTimeout: ApiConfig.connectTimeout,
    receiveTimeout: ApiConfig.timeout,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  ));

  dio.interceptors.add(AuthInterceptor(ref));
  dio.interceptors.add(CacheInterceptor(
    defaultTtl: const Duration(minutes: 5),
    excludePrefixes: ['/auth/', '/token', '/ai/generate'],
  ));
  dio.interceptors.add(LogInterceptor(
    requestBody: true,
    responseBody: true,
    logPrint: (obj) => debugPrint('[DIO] $obj'),
  ));

  return dio;
});

class AuthInterceptor extends Interceptor {
  final Ref _ref;

  AuthInterceptor(this._ref);

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
  void onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401) {
      try {
        final storage = _ref.read(secureStorageProvider);
        final refreshToken = await storage.read(key: 'refresh_token');
        if (refreshToken != null && refreshToken.isNotEmpty) {
          final dio = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));
          final response = await dio.post('/auth/refresh/', data: {
            'refresh': refreshToken,
          });
          final newToken = response.data['access'] as String;
          await storage.write(key: 'access_token', value: newToken);

          final retryOptions = err.requestOptions;
          retryOptions.headers['Authorization'] = 'Bearer $newToken';
          final retryDio = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));
          final retryResponse = await retryDio.fetch(retryOptions);
          handler.resolve(retryResponse);
          return;
        }
      } catch (e) {
        final storage = _ref.read(secureStorageProvider);
        await storage.deleteAll();
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

  Future<Response> delete(String path) =>
      _dio.delete(path);

  Future<Response> upload(String path, FormData data) =>
      _dio.post(path, data: data, options: Options(
        headers: {'Content-Type': 'multipart/form-data'},
      ));
}
