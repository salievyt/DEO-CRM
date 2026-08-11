import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_config.dart';
import '../../../../core/network/api_client.dart';
import '../../data/datasources/live_calls_remote_datasource.dart';
import '../../domain/entities/live_call.dart';
import '../../domain/repositories/live_calls_repository.dart';

final liveCallsDataSourceProvider = Provider<LiveCallsRemoteDatasource>((ref) {
  return LiveCallsRemoteDatasource(
    ref.watch(tokenStorageProvider),
    baseUrl: AppConfig.wsBaseUrl,
  );
});

final liveCallsRepositoryProvider = Provider<LiveCallsRepository>((ref) {
  return LiveCallsRepositoryImpl(ref.watch(liveCallsDataSourceProvider));
});

/// Holds the latest snapshot of live call events and the channel health.
class LiveCallsNotifier extends Notifier<AsyncValue<List<LiveCall>>> {
  bool _connected = false;

  bool get isConnected => _connected;

  @override
  AsyncValue<List<LiveCall>> build() {
    final repository = ref.watch(liveCallsRepositoryProvider);
    repository.watchCalls().listen((calls) {
      state = AsyncValue.data(calls);
    });
    repository.connectionStatus.listen((connected) {
      _connected = connected;
      state = AsyncValue.data(state.value ?? const <LiveCall>[]);
    });
    return const AsyncValue.data(<LiveCall>[]);
  }

  Future<void> connect() async {
    await ref.read(liveCallsRepositoryProvider).connect();
  }

  Future<void> disconnect() async {
    await ref.read(liveCallsRepositoryProvider).disconnect();
  }
}

final liveCallsProvider =
    NotifierProvider<LiveCallsNotifier, AsyncValue<List<LiveCall>>>(
  LiveCallsNotifier.new,
);
