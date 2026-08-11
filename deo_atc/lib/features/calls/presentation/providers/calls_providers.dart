import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/calls_repository_impl.dart';
import '../../domain/entities/call_enums.dart';
import '../../domain/entities/call_record.dart';
import '../../domain/entities/call_stats.dart';

/// Current list filter applied to the calls log and stats.
enum CallsFilterKind { all, incoming, outgoing, missed }

class CallsFilter {
  const CallsFilter({this.kind = CallsFilterKind.all});

  final CallsFilterKind kind;

  CallDirection? get direction => switch (kind) {
        CallsFilterKind.incoming => CallDirection.incoming,
        CallsFilterKind.outgoing => CallDirection.outgoing,
        _ => null,
      };

  CallStatus? get status =>
      kind == CallsFilterKind.missed ? CallStatus.missed : null;

  CallsFilter copyWith({CallsFilterKind? kind}) =>
      CallsFilter(kind: kind ?? this.kind);
}

class CallsFilterNotifier extends Notifier<CallsFilter> {
  @override
  CallsFilter build() => const CallsFilter();

  void apply(CallsFilterKind kind) {
    state = CallsFilter(kind: kind);
  }
}

final callsFilterProvider =
    NotifierProvider<CallsFilterNotifier, CallsFilter>(CallsFilterNotifier.new);

final recentCallsProvider = FutureProvider.autoDispose<List<CallRecord>>((ref) {
  final filter = ref.watch(callsFilterProvider);
  return ref
      .watch(callsRepositoryProvider)
      .getRecentCalls(limit: 100, direction: filter.direction, status: filter.status);
});

final callStatsProvider = FutureProvider.autoDispose<CallStats>((ref) {
  final filter = ref.watch(callsFilterProvider);
  return ref
      .watch(callsRepositoryProvider)
      .getStats(direction: filter.direction, status: filter.status);
});
