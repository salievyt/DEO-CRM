import '../entities/call_enums.dart';
import '../entities/call_record.dart';
import '../entities/call_stats.dart';

/// Contract for the calls feature — implemented by the data layer,
/// consumed by the presentation layer.
abstract interface class CallsRepository {
  Future<List<CallRecord>> getRecentCalls({
    int limit = 50,
    CallDirection? direction,
    CallStatus? status,
  });

  Future<CallStats> getStats({
    CallDirection? direction,
    CallStatus? status,
  });
}
