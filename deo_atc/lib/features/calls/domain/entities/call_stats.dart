/// Aggregated call statistics (backend `CallStatsView`).
class CallStats {
  const CallStats({
    required this.total,
    required this.incoming,
    required this.outgoing,
    required this.missed,
    required this.answered,
    required this.totalDurationSeconds,
  });

  final int total;
  final int incoming;
  final int outgoing;
  final int missed;
  final int answered;
  final int totalDurationSeconds;

  int get missedRate => total == 0 ? 0 : (missed * 100 / total).round();
}
