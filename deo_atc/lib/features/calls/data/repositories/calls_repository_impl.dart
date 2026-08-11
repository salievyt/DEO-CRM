import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/call_enums.dart';
import '../../domain/entities/call_record.dart';
import '../../domain/entities/call_stats.dart';
import '../../domain/repositories/calls_repository.dart';
import '../datasources/calls_remote_datasource.dart';

class CallsRepositoryImpl implements CallsRepository {
  CallsRepositoryImpl(this._remote);

  final CallsRemoteDatasource _remote;

  @override
  Future<List<CallRecord>> getRecentCalls({
    int limit = 50,
    CallDirection? direction,
    CallStatus? status,
  }) async {
    final models = await _remote.fetchRecentCalls(
      limit: limit,
      direction: direction,
      status: status,
    );
    return models.map((model) => model.toEntity()).toList();
  }

  @override
  Future<CallStats> getStats({
    CallDirection? direction,
    CallStatus? status,
  }) async {
    final model = await _remote.fetchStats(direction: direction, status: status);
    return model.toEntity();
  }
}

final callsRepositoryProvider = Provider<CallsRepository>((ref) {
  return CallsRepositoryImpl(ref.watch(callsRemoteDatasourceProvider));
});
