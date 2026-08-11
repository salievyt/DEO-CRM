import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_client.dart';
import '../../domain/entities/call_enums.dart';
import '../models/call_record_model.dart';
import '../models/call_stats_model.dart';

/// Remote source of call records and stats (REST).
class CallsRemoteDatasource {
  CallsRemoteDatasource(this._api);

  final ApiClient _api;

  Future<List<CallRecordModel>> fetchRecentCalls({
    int limit = 50,
    CallDirection? direction,
    CallStatus? status,
  }) async {
    final data = await _api.getList(
      '/calls/records/',
      queryParameters: {
        'limit': limit,
        if (direction != null && direction != CallDirection.unknown)
          'direction': direction.name,
        if (status != null && status != CallStatus.unknown) 'status': status.name,
      },
    );
    return data
        .map((item) => CallRecordModel.fromJson(_asMap(item)))
        .toList();
  }

  Future<CallStatsModel> fetchStats({
    CallDirection? direction,
    CallStatus? status,
  }) async {
    final data = await _api.get(
      '/calls/stats/',
      queryParameters: {
        if (direction != null && direction != CallDirection.unknown)
          'direction': direction.name,
        if (status != null && status != CallStatus.unknown) 'status': status.name,
      },
    );
    return CallStatsModel.fromJson(data);
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    return const <String, dynamic>{};
  }
}

final callsRemoteDatasourceProvider = Provider<CallsRemoteDatasource>((ref) {
  return CallsRemoteDatasource(ref.watch(apiClientProvider));
});
