import '../entities/live_call.dart';

/// Contract for realtime call events.
abstract interface class LiveCallsRepository {
  /// Connection state of the realtime channel (true = connected).
  Stream<bool> get connectionStatus;

  /// Live call events. Emits the current snapshot on each change.
  Stream<List<LiveCall>> watchCalls();

  Future<void> connect();
  Future<void> disconnect();
}
