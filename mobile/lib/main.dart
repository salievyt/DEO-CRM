import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'core/cache/hive_cache_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive for offline caching
  await HiveCacheService.instance.init();

  runApp(
    const ProviderScope(
      child: DeoCrmApp(),
    ),
  );
}
