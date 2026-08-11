// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'call_stats_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CallStatsModel _$CallStatsModelFromJson(Map<String, dynamic> json) =>
    _CallStatsModel(
      total: (json['total'] as num).toInt(),
      incoming: (json['incoming'] as num).toInt(),
      outgoing: (json['outgoing'] as num).toInt(),
      missed: (json['missed'] as num).toInt(),
      answered: (json['answered'] as num).toInt(),
      totalDurationSeconds: (json['total_duration_seconds'] as num).toInt(),
    );

Map<String, dynamic> _$CallStatsModelToJson(_CallStatsModel instance) =>
    <String, dynamic>{
      'total': instance.total,
      'incoming': instance.incoming,
      'outgoing': instance.outgoing,
      'missed': instance.missed,
      'answered': instance.answered,
      'total_duration_seconds': instance.totalDurationSeconds,
    };
