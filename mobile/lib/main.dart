import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'core/cache/hive_cache_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await initializeDateFormatting('ru');

  // Initialize Hive for offline caching
  await HiveCacheService.instance.init();

  runApp(const ProviderScope(child: DeoCrmApp()));
}
