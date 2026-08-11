/// Kind of an event surfaced on the live screen.
enum LiveCallKind {
  active,
  ringing,
  missed,
}

/// A call event pushed in realtime (missed-call notifications, etc.).
class LiveCall {
  const LiveCall({
    required this.id,
    required this.phoneNumber,
    required this.kind,
    required this.startedAt,
  });

  final String id;
  final String phoneNumber;
  final LiveCallKind kind;
  final DateTime startedAt;

  bool get isMissed => kind == LiveCallKind.missed;
}
