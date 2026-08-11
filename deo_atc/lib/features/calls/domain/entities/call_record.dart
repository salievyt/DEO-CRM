import 'call_enums.dart';

/// Domain entity for a single call record from the CDR log.
class CallRecord {
  const CallRecord({
    required this.id,
    required this.direction,
    required this.status,
    required this.scope,
    required this.phoneNumber,
    required this.clientName,
    required this.employeeName,
    required this.durationSeconds,
    required this.startedAt,
    required this.endedAt,
  });

  final String id;
  final CallDirection direction;
  final CallStatus status;
  final CallScope scope;
  final String phoneNumber;
  final String? clientName;
  final String? employeeName;
  final int durationSeconds;
  final DateTime? startedAt;
  final DateTime? endedAt;

  String get displayName =>
      (clientName != null && clientName!.isNotEmpty)
          ? clientName!
          : employeeName ?? '';

  String get phone => phoneNumber.isEmpty ? 'Без номера' : phoneNumber;
}
