import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../constants/app_config.dart';
import 'api_exception.dart';
import 'token_storage.dart';

/// Typed access to the DEO CRM REST API.
///
/// Attaches the stored JWT to every request and surfaces failures as
/// [ApiException]. Kept as a plain class (no code-gen) so feature
/// datasources stay decoupled from DI.
class ApiClient {
  ApiClient(this._dio);

  final Dio _dio;

  static ApiClient build({TokenStorage? tokenStorage, Dio? dio}) {
    final client = dio ??
        Dio(
          BaseOptions(
            baseUrl: AppConfig.apiBaseUrl,
            connectTimeout: const Duration(seconds: 8),
            receiveTimeout: const Duration(seconds: 15),
            headers: {'Content-Type': 'application/json'},
          ),
        );

    client.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = tokenStorage?.accessToken;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401 && tokenStorage != null) {
            await tokenStorage.clear();
          }
          handler.next(error);
        },
      ),
    );

    client.interceptors.add(
      LogInterceptor(
        requestBody: false,
        responseBody: false,
        logPrint: (object) => _log(object.toString()),
      ),
    );

    return ApiClient(client);
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final response = await _request(
      () => _dio.get(path, queryParameters: queryParameters),
    );
    return _asMap(response.data);
  }

  Future<List<dynamic>> getList(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final response = await _request(
      () => _dio.get(path, queryParameters: queryParameters),
    );
    return _asList(response.data);
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    final response = await _request(
      () => _dio.post(path, data: data, queryParameters: queryParameters),
    );
    return _asMap(response.data);
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    Object? data,
  }) async {
    final response = await _request(() => _dio.patch(path, data: data));
    return _asMap(response.data);
  }

  Future<Map<String, dynamic>> put(String path, {Object? data}) async {
    final response = await _request(() => _dio.put(path, data: data));
    return _asMap(response.data);
  }

  Future<void> delete(String path) async {
    await _request(() => _dio.delete(path));
  }

  Future<Response<dynamic>> _request(
    Future<Response<dynamic>> Function() action,
  ) async {
    try {
      return await action();
    } on DioException catch (error) {
      throw mapError(error);
    }
  }

  Map<String, dynamic> _asMap(dynamic data) {
    if (data is Map<String, dynamic>) {
      return data;
    }
    return const <String, dynamic>{};
  }

  List<dynamic> _asList(dynamic data) {
    if (data is List) {
      return data;
    }
    return const <dynamic>[];
  }

  static void _log(String message) {
    // Lighter than the default printer to keep console output clean.
  }
}

/// Provides a configured [ApiClient] to the Riverpod graph.
/// Overridden with a real [TokenStorage] in `main()`.
final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(tokenStorageProvider);
  return ApiClient.build(tokenStorage: storage);
});

final tokenStorageProvider = Provider<TokenStorage>(
  (ref) => throw UnimplementedError('tokenStorageProvider must be overridden'),
);
