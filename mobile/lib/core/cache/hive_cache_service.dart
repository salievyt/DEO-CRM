import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';

/// Thread-safe generic cache service using Hive with Time-To-Live support.
/// Stores raw JSON-serializable data (maps, lists, strings, nums) only.
class HiveCacheService {
  static const String _boxName = 'app_cache';
  static const Duration _defaultTtl = Duration(minutes: 5);

  static HiveCacheService? _instance;
  late Box<String> _box;
  bool _initialized = false;

  HiveCacheService._();

  static HiveCacheService get instance {
    _instance ??= HiveCacheService._();
    return _instance!;
  }

  /// Must be called once before any cache operations (e.g. in main())
  /// If [path] is provided, Hive uses it directly instead of path_provider.
  Future<void> init({String? path}) async {
    if (_initialized) return;
    if (path != null) {
      Hive.init(path);
    } else {
      await Hive.initFlutter();
    }
    _box = await Hive.openBox<String>(_boxName);
    _initialized = true;
    debugPrint('[Cache] Hive initialized with ${_box.length} cached items');
  }

  String _dataKey(String endpoint) => 'data:$endpoint';
  String _tsKey(String endpoint) => 'ts:$endpoint';

  /// Store a JSON-serializable value in cache.
  /// [data] must be a Map, List, String, num, or bool (jsonEncode-compatible).
  Future<void> putRaw(String endpoint, dynamic data, {Duration? ttl}) async {
    if (!_initialized) return;
    try {
      final jsonString = jsonEncode(data);
      await _box.put(_dataKey(endpoint), jsonString);
      await _box.put(_tsKey(endpoint), DateTime.now().millisecondsSinceEpoch.toString());
    } catch (e) {
      debugPrint('[Cache] Write error for $endpoint: $e');
    }
  }

  /// Read raw cached data. Returns null if missing or TTL expired.
  dynamic getRaw(String endpoint, {Duration? ttl}) {
    if (!_initialized) return null;
    try {
      final jsonString = _box.get(_dataKey(endpoint));
      final timestampStr = _box.get(_tsKey(endpoint));
      if (jsonString == null || timestampStr == null) return null;

      if (ttl != null) {
        final timestamp = int.tryParse(timestampStr) ?? 0;
        final age = DateTime.now().millisecondsSinceEpoch - timestamp;
        if (age > ttl.inMilliseconds) return null;
      }

      return jsonDecode(jsonString);
    } catch (e) {
      debugPrint('[Cache] Read error for $endpoint: $e');
      return null;
    }
  }

  /// Read with staleness info — returns stale data if TTL expired.
  CacheResult getRawWithStatus(String endpoint, {Duration? ttl}) {
    if (!_initialized) return CacheResult.notFound();
    try {
      final jsonString = _box.get(_dataKey(endpoint));
      final timestampStr = _box.get(_tsKey(endpoint));
      if (jsonString == null || timestampStr == null) {
        return CacheResult.notFound();
      }

      final timestamp = int.tryParse(timestampStr) ?? 0;
      final age = DateTime.now().millisecondsSinceEpoch - timestamp;
      final effectiveTtl = ttl ?? _defaultTtl;
      final isStale = age > effectiveTtl.inMilliseconds;
      final decoded = jsonDecode(jsonString);

      return CacheResult(data: decoded, stale: isStale);
    } catch (e) {
      return CacheResult.notFound();
    }
  }

  /// Remove a specific endpoint from cache
  Future<void> remove(String endpoint) async {
    if (!_initialized) return;
    await _box.delete(_dataKey(endpoint));
    await _box.delete(_tsKey(endpoint));
  }

  /// Clear all cached data
  Future<void> clearAll() async {
    if (!_initialized) return;
    await _box.clear();
    debugPrint('[Cache] All cache cleared');
  }

  /// Remove all entries matching a prefix
  Future<void> clearByPrefix(String prefix) async {
    if (!_initialized) return;
    final keysToDelete = <String>[];
    for (final key in _box.keys) {
      final strKey = key as String;
      if (strKey.startsWith('data:$prefix') || strKey.startsWith('ts:$prefix')) {
        keysToDelete.add(strKey);
      }
    }
    for (final key in keysToDelete) {
      await _box.delete(key);
    }
  }

  int get cacheSize => _box.length;
}

/// Result of a cache lookup with staleness metadata
class CacheResult {
  final dynamic data;
  final bool found;
  final bool stale;

  const CacheResult({this.data, this.found = true, this.stale = false});

  factory CacheResult.notFound() => const CacheResult(found: false);

  bool get isValid => found && data != null && !stale;
  bool get isStaleButAvailable => found && data != null && stale;
}
