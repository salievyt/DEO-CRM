import 'package:freezed_annotation/freezed_annotation.dart';

import '../../domain/entities/call_stats.dart';

part 'call_stats_model.freezed.dart';
part 'call_stats_model.g.dart';

@freezed
abstract class CallStatsModel with _$CallStatsModel {
  const factory CallStatsModel({
    required int total,
    required int incoming,
    required int outgoing,
    required int missed,
    required int answered,
    @JsonKey(name: 'total_duration_seconds') required int totalDurationSeconds,
  }) = _CallStatsModel;

  factory CallStatsModel.fromJson(Map<String, dynamic> json) =>
      _$CallStatsModelFromJson(json);

  const CallStatsModel._();

  CallStats toEntity() => CallStats(
        total: total,
        incoming: incoming,
        outgoing: outgoing,
        missed: missed,
        answered: answered,
        totalDurationSeconds: totalDurationSeconds,
      );
}
