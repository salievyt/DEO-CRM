import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../../core/api/auth_api.dart';
import '../../../core/api/chat_api.dart';
import '../../../entities/chat.dart';

/// Provider for chat list (cached automatically by CacheInterceptor)
final chatListProvider = FutureProvider.autoDispose<List<Chat>>((ref) async {
  return await ref.read(chatApiProvider).getChats();
});

/// WebSocket connection state for a specific chat
final wsChatProvider = StateNotifierProvider.autoDispose
    .family<WsChatNotifier, AsyncValue<List<Message>>, String>((ref, chatId) {
      return WsChatNotifier(ref, chatId);
    });

/// Typing indicator state
final typingIndicatorProvider = StateProvider.autoDispose.family<bool, String>(
  (ref, chatId) => false,
);

class WsChatNotifier extends StateNotifier<AsyncValue<List<Message>>> {
  final Ref _ref;
  final String _chatId;
  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  List<Message> _messages = [];
  Timer? _typingTimer;
  Timer? _pollTimer;
  bool _polling = false;
  int _reconnectAttempts = 0;
  bool _disposed = false;

  WsChatNotifier(this._ref, this._chatId) : super(const AsyncValue.loading()) {
    _init();
    _pollTimer = Timer.periodic(const Duration(seconds: 15), (_) => _poll());
  }

  Future<void> _init() async {
    try {
      final api = _ref.read(chatApiProvider);
      _messages = await api.getMessages(_chatId, params: {'page_size': '50'});
      state = AsyncValue.data([..._messages]);
      await _connectWebSocket();
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> _poll() async {
    if (_disposed || _polling) return;
    _polling = true;
    try {
      final messages = await _ref
          .read(chatApiProvider)
          .getMessages(_chatId, params: {'page_size': '50'});
      if (!_disposed) {
        final merged = {
          for (final message in _messages) message.id: message,
          for (final message in messages) message.id: message,
        }.values.toList()..sort((a, b) => b.createdAt.compareTo(a.createdAt));
        _messages = merged.take(50).toList();
        state = AsyncValue.data([..._messages]);
      }
    } catch (_) {
      // Preserve loaded messages while the server or network is unavailable.
    } finally {
      _polling = false;
    }
  }

  Future<void> _connectWebSocket() async {
    _subscription?.cancel();
    _channel?.sink.close();

    try {
      final authApi = _ref.read(authApiProvider);
      final token = await authApi.getAccessToken();
      if (token == null || _disposed) return;

      final api = _ref.read(chatApiProvider);
      final wsUrl = api.wsUrlFor(_chatId);
      final uri = Uri.parse('$wsUrl?token=$token');

      _channel = WebSocketChannel.connect(uri);
      _subscription = _channel!.stream.listen(
        (data) {
          _reconnectAttempts = 0;
          final jsonData = jsonDecode(data as String) as Map<String, dynamic>;
          _handleWsMessage(jsonData);
        },
        onError: (error) {
          debugPrint('[WS Error] $error');
          _scheduleReconnect();
        },
        onDone: () {
          debugPrint('[WS Done] Connection closed');
          _scheduleReconnect();
        },
      );
    } catch (e) {
      debugPrint('[WS Init Error] $e');
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_disposed) return;
    _reconnectAttempts++;
    final delay = Duration(seconds: (_reconnectAttempts * 2).clamp(1, 30));
    Future.delayed(delay, () {
      if (!_disposed) _connectWebSocket();
    });
  }

  void _handleWsMessage(Map<String, dynamic> data) {
    final type = data['type'] as String?;

    if (type == 'message') {
      if (data['message'] is! Map) return;
      final message = Message.fromJson(
        Map<String, dynamic>.from(data['message'] as Map),
      );
      _messages = [
        message,
        ..._messages.where((item) => item.id != message.id),
      ];
      state = AsyncValue.data([..._messages]);
    } else if (type == 'typing') {
      _ref.read(typingIndicatorProvider(_chatId).notifier).state =
          data['is_typing'] != false;
      _typingTimer?.cancel();
      _typingTimer = Timer(const Duration(seconds: 2), () {
        _ref.read(typingIndicatorProvider(_chatId).notifier).state = false;
      });
    }
  }

  Future<void> sendMessage(String content) async {
    if (content.trim().isEmpty) return;
    final api = _ref.read(chatApiProvider);
    final message = await api.sendMessage(_chatId, content);
    if (_disposed) return;
    _messages = [message, ..._messages.where((item) => item.id != message.id)];
    state = AsyncValue.data([..._messages]);
  }

  void sendTyping() {
    if (_channel != null) {
      _channel!.sink.add(jsonEncode({'type': 'typing'}));
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _typingTimer?.cancel();
    _pollTimer?.cancel();
    _subscription?.cancel();
    _channel?.sink.close();
    super.dispose();
  }
}
