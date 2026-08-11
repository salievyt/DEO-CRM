// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'call_record_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CallRecordModel _$CallRecordModelFromJson(Map<String, dynamic> json) =>
    _CallRecordModel(
      id: json['id'] as String,
      connection: json['connection'] as String?,
      externalCallId: json['externalCallId'] as String?,
      directionRaw: json['direction'] as String?,
      statusRaw: json['status'] as String?,
      callTypeRaw: json['call_type'] as String?,
      phoneNumber: json['phone_number'] as String?,
      client: json['client'] as String?,
      clientName: json['client_name'] as String?,
      employee: json['employee'] as String?,
      employeeName: json['employee_name'] as String?,
      durationSeconds: (json['duration_seconds'] as num?)?.toInt(),
      startedAt: json['started_at'] == null
          ? null
          : DateTime.parse(json['started_at'] as String),
      endedAt: json['ended_at'] == null
          ? null
          : DateTime.parse(json['ended_at'] as String),
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
    );

Map<String, dynamic> _$CallRecordModelToJson(_CallRecordModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'connection': instance.connection,
      'externalCallId': instance.externalCallId,
      'direction': instance.directionRaw,
      'status': instance.statusRaw,
      'call_type': instance.callTypeRaw,
      'phone_number': instance.phoneNumber,
      'client': instance.client,
      'client_name': instance.clientName,
      'employee': instance.employee,
      'employee_name': instance.employeeName,
      'duration_seconds': instance.durationSeconds,
      'started_at': instance.startedAt?.toIso8601String(),
      'ended_at': instance.endedAt?.toIso8601String(),
      'created_at': instance.createdAt?.toIso8601String(),
    };
