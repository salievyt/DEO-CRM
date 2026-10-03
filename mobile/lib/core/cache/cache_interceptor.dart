import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'hive_cache_service.dart';

/// Dio interceptor that automatically caches successful GET responses.
/// Stores raw JSON data keyed by the request path.
///
/// On network error, serves stale cached data if available (offline fallback).
class CacheInterceptor extends Interceptor {
  final HiveCacheService _cache;

  /// Default TTL for cached responses
  final Duration defaultTtl;

  /// List of URL prefixes to exclude from caching (e.g., ['/auth/'])
  final List<String> excludePrefixes;

  CacheInterceptor({
    HiveCacheService? cache,
    this.defaultTtl = const Duration(minutes: 5),
    this.excludePrefixes = const ['/auth/', '/token'],
  }) : _cache = cache ?? HiveCacheService.instance;

  bool _shouldCache(RequestOptions options) {
    if (options.method != 'GET') return false;
    final path = options.path;
    for (final prefix in excludePrefixes) {
      if (path.startsWith(prefix)) return false;
    }
    return true;
  }

  String _cacheKey(RequestOptions options) {
    // Use full URL + query params as cache key
    final uri = options.uri;
    var identity = 'anonymous';
    final authorization = options.headers['Authorization']?.toString();
    if (authorization != null) {
      try {
        final payload = authorization.split(' ').last.split('.')[1];
        final claims =
            jsonDecode(
                  utf8.decode(base64Url.decode(base64Url.normalize(payload))),
                )
                as Map;
        identity = '${claims['user_id'] ?? claims['sub']}';
      } catch (_) {
        identity = 'invalid-session';
      }
    }
    return '$identity:${uri.origin}${uri.path}?${uri.query}';
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    if (response.requestOptions.method != 'GET' &&
        (response.statusCode ?? 500) < 400) {
      _cache.clearAll();
    }
    // Cache successful GET responses
    if (_shouldCache(response.requestOptions) &&
        response.statusCode == 200 &&
        response.data != null) {
      final key = _cacheKey(response.requestOptions);
      _cache.putRaw(key, response.data, ttl: defaultTtl);
      debugPrint('[Cache] Stored: $key');
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    // On network error, try to serve stale cached data
    if (err.type == DioExceptionType.connectionError ||
        err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout) {
      final options = err.requestOptions;
      if (_shouldCache(options)) {
        final key = _cacheKey(options);
        final cached = _cache.getRawWithStatus(
          key,
          ttl: const Duration(days: 30),
        );
        if (cached.found && cached.data != null) {
          debugPrint('[Cache] Serving stale for: $key (offline fallback)');
          handler.resolve(
            Response(
              requestOptions: options,
              data: cached.data,
              statusCode: 200,
              statusMessage: 'Cached (offline)',
            ),
          );
          return;
        }
      }
    }
    handler.next(err);
  }
}
