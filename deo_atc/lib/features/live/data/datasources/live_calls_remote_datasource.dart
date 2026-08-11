import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/status.dart' as ws_status;
import 'package:web_socket_channel/web_socket_channel.dart';

import '../../../../core/network/token_storage.dart';
import '../../domain/entities/live_call.dart';
import '../../domain/repositories/live_calls_repository.dart';

/// Bridges the Django Channels notification socket (`/ws/notifications/`)
/// into a stream of [LiveCall] events. Reconnects automatically.
class LiveCallsRemoteDatasource {
  LiveCallsRemoteDatasource(this._tokenStorage, {required this.baseUrl});

  final String baseUrl;
  final TokenStorage _tokenStorage;

  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;
  final StreamController<bool> _connectionController =
      StreamController<bool>.broadcast();
  final StreamController<List<LiveCall>> _callsController =
      StreamController<List<LiveCall>>.broadcast();

  final List<LiveCall> _buffer = [];

  Stream<bool> get connectionStatus => _connectionController.stream;

  Stream<List<LiveCall>> get calls => _callsController.stream;

  Uri get _uri {
    final token = _tokenStorage.accessToken ?? '';
    return Uri.parse('$baseUrl/notifications/?token=$token');
  }

  Future<void> connect() async {
    if (_channel != null) {
      return;
    }

    final channel = WebSocketChannel.connect(_uri);
    _channel = channel;

    _subscription = channel.stream.listen(
      _onEvent,
      onError: (_) => _onDisconnected(),
      onDone: _onDisconnected,
      cancelOnError: true,
    );

    _connectionController.add(true);
    await channel.ready;
  }

  void _onEvent(dynamic raw) {
    try {
      final decoded = jsonDecode(raw as String) as Map<String, dynamic>;
      final event = decoded['event'] as String? ?? '';
      final data = decoded['data'] as Map<String, dynamic>? ?? const {};

      if (event == 'missed_call') {
        final call = LiveCall(
          id: (data['call_id'] as String? ?? _nowId()),
          phoneNumber: (data['phone_number'] as String? ?? ''),
          kind: LiveCallKind.missed,
          startedAt: DateTime.tryParse(data['started_at'] as String? ?? '') ??
              DateTime.now(),
        );
        _buffer.insert(0, call);
        if (_buffer.length > 100) {
          _buffer.removeRange(100, _buffer.length);
        }
        _callsController.add(List.unmodifiable(_buffer));
      }
    } on FormatException {
      // ignore malformed frames
    }
  }

  void _onDisconnected() {
    if (_channel == null) {
      return;
    }
    _channel = null;
    _subscription?.cancel();
    _subscription = null;
    _connectionController.add(false);
    unawaited(_scheduleReconnect());
  }

  Future<void> _scheduleReconnect() async {
    await Future<void>.delayed(const Duration(seconds: 3));
    if (_channel == null) {
      await connect();
    }
  }

  Future<void> disconnect() async {
    await _subscription?.cancel();
    await _channel?.sink.close(ws_status.goingAway);
    _channel = null;
    _connectionController.add(false);
  }

  String _nowId() => DateTime.now().microsecondsSinceEpoch.toString();
}

class LiveCallsRepositoryImpl implements LiveCallsRepository {
  LiveCallsRepositoryImpl(this._source);

  final LiveCallsRemoteDatasource _source;

  @override
  Stream<bool> get connectionStatus => _source.connectionStatus;

  @override
  Stream<List<LiveCall>> watchCalls() => _source.calls;

  @override
  Future<void> connect() => _source.connect();

  @override
  Future<void> disconnect() => _source.disconnect();
}
