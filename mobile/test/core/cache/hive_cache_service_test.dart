import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:deo_crm_mobile/core/cache/hive_cache_service.dart';

void main() {
  late HiveCacheService cache;

  setUp(() async {
    // Use a temp directory for Hive in tests to avoid path_provider dependency
    final tempDir = Directory.systemTemp.createTempSync('hive_test_');
    cache = HiveCacheService.instance;
    await cache.init(path: tempDir.path);
  });

  tearDown(() async {
    await cache.clearAll();
  });

  group('HiveCacheService', () {
    test('stores and retrieves raw JSON data', () async {
      final data = {'name': 'Test', 'value': 42};

      await cache.putRaw('/test/', data);
      final result = cache.getRaw('/test/', ttl: const Duration(hours: 1));

      expect(result, isNotNull);
      expect(result['name'], 'Test');
      expect(result['value'], 42);
    });

    test('returns null for missing key', () async {
      final result = cache.getRaw('/nonexistent/');
      expect(result, isNull);
    });

    test('respects TTL expiry', () async {
      cache.putRaw('/ttl-test/', {'data': 'fresh'}, ttl: const Duration(milliseconds: 1));

      // Wait for TTL to expire
      await Future.delayed(const Duration(milliseconds: 10));

      final result = cache.getRaw('/ttl-test/', ttl: const Duration(milliseconds: 1));
      expect(result, isNull);
    });

    test('getRawWithStatus returns valid for fresh data', () async {
      await cache.putRaw('/fresh/', {'data': 'fresh'}, ttl: const Duration(hours: 1));

      final result = cache.getRawWithStatus('/fresh/', ttl: const Duration(hours: 1));

      expect(result.found, isTrue);
      expect(result.isValid, isTrue);
      expect(result.isStaleButAvailable, isFalse);
      expect(result.data['data'], 'fresh');
    });

    test('getRawWithStatus returns stale data after TTL', () async {
      cache.putRaw('/stale-test/', {'data': 'stale'}, ttl: const Duration(milliseconds: 1));

      await Future.delayed(const Duration(milliseconds: 10));

      final result = cache.getRawWithStatus('/stale-test/', ttl: const Duration(milliseconds: 1));

      expect(result.found, isTrue);
      expect(result.isValid, isFalse);
      expect(result.isStaleButAvailable, isTrue);
      expect(result.data['data'], 'stale');
    });

    test('clearAll removes all data', () async {
      await cache.putRaw('/item1/', 'data1');
      await cache.putRaw('/item2/', 'data2');

      await cache.clearAll();

      expect(cache.getRaw('/item1/'), isNull);
      expect(cache.getRaw('/item2/'), isNull);
    });

    test('clearByPrefix removes matching entries only', () async {
      await cache.putRaw('/projects/list/', 'project data');
      await cache.putRaw('/tasks/list/', 'task data');
      await cache.putRaw('/clients/list/', 'client data');

      await cache.clearByPrefix('/projects/');

      expect(cache.getRaw('/projects/list/'), isNull);
      expect(cache.getRaw('/tasks/list/'), isNotNull);
      expect(cache.getRaw('/clients/list/'), isNotNull);
    });

    test('stores and retrieves list data', () async {
      final data = ['item1', 'item2', 'item3'];

      await cache.putRaw('/list-test/', data);
      final result = cache.getRaw('/list-test/', ttl: const Duration(hours: 1));

      expect(result, isNotNull);
      expect((result as List).length, 3);
      expect(result[0], 'item1');
    });

    test('stores and retrieves nested data', () async {
      final data = {
        'users': [
          {'name': 'Alice', 'age': 30},
          {'name': 'Bob', 'age': 25},
        ],
        'total': 2,
      };

      await cache.putRaw('/nested/', data);
      final result = cache.getRaw('/nested/', ttl: const Duration(hours: 1));

      expect(result['total'], 2);
      expect((result['users'] as List).length, 2);
      expect(result['users'][0]['name'], 'Alice');
    });

    test('remove deletes specific key', () async {
      await cache.putRaw('/remove-test/', 'test data');

      await cache.remove('/remove-test/');

      expect(cache.getRaw('/remove-test/'), isNull);
    });
  });
}
