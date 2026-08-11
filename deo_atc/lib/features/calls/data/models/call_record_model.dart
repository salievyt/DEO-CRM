import 'package:freezed_annotation/freezed_annotation.dart';

import '../../domain/entities/call_enums.dart';
import '../../domain/entities/call_record.dart';

part 'call_record_model.freezed.dart';
part 'call_record_model.g.dart';

@freezed
abstract class CallRecordModel with _$CallRecordModel {
  const factory CallRecordModel({
    required String id,
    String? connection,
    String? externalCallId,
    @JsonKey(name: 'direction') String? directionRaw,
    @JsonKey(name: 'status') String? statusRaw,
    @JsonKey(name: 'call_type') String? callTypeRaw,
    @JsonKey(name: 'phone_number') String? phoneNumber,
    String? client,
    @JsonKey(name: 'client_name') String? clientName,
    String? employee,
    @JsonKey(name: 'employee_name') String? employeeName,
    @JsonKey(name: 'duration_seconds') int? durationSeconds,
    @JsonKey(name: 'started_at') DateTime? startedAt,
    @JsonKey(name: 'ended_at') DateTime? endedAt,
    @JsonKey(name: 'created_at') DateTime? createdAt,
  }) = _CallRecordModel;

  factory CallRecordModel.fromJson(Map<String, dynamic> json) =>
      _$CallRecordModelFromJson(json);

  const CallRecordModel._();

  CallRecord toEntity() {
    return CallRecord(
      id: id,
      direction: CallDirection.fromApi(directionRaw),
      status: CallStatus.fromApi(statusRaw),
      scope: CallScope.fromApi(callTypeRaw),
      phoneNumber: phoneNumber ?? '',
      clientName: clientName,
      employeeName: employeeName,
      durationSeconds: durationSeconds ?? 0,
      startedAt: startedAt,
      endedAt: endedAt,
    );
  }
}
