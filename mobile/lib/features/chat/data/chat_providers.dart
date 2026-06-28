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
final wsChatProvider = StateNotifierProvider.family<WsChatNotifier, AsyncValue<List<Message>>, String>((ref, chatId) {
  return WsChatNotifier(ref, chatId);
});

/// Typing indicator state
final typingIndicatorProvider = StateProvider.family<bool, String>((ref, chatId) => false);

class WsChatNotifier extends StateNotifier<AsyncValue<List<Message>>> {
  final Ref _ref;
  final String _chatId;
  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  List<Message> _messages = [];
  Timer? _typingTimer;
  int _reconnectAttempts = 0;
  bool _disposed = false;

  WsChatNotifier(this._ref, this._chatId) : super(const AsyncValue.loading()) {
    _init();
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
      final message = Message(
        id: data['id'] as String? ?? DateTime.now().millisecondsSinceEpoch.toString(),
        chatId: _chatId,
        senderId: data['sender_id'] as String? ?? '',
        senderName: data['sender_name'] as String?,
        senderAvatar: data['sender_avatar'] as String?,
        content: data['message'] as String? ?? '',
        createdAt: data['created_at'] != null ? DateTime.parse(data['created_at'] as String) : DateTime.now(),
      );
      _messages = [message, ..._messages];
      state = AsyncValue.data([..._messages]);
    } else if (type == 'typing') {
      _ref.read(typingIndicatorProvider(_chatId).notifier).state = true;
      _typingTimer?.cancel();
      _typingTimer = Timer(const Duration(seconds: 2), () {
        _ref.read(typingIndicatorProvider(_chatId).notifier).state = false;
      });
    }
  }

  Future<void> sendMessage(String content) async {
    if (content.trim().isEmpty) return;
    try {
      final api = _ref.read(chatApiProvider);
      await api.sendMessage(_chatId, content);
    } catch (e) {
      if (_channel != null) {
        _channel!.sink.add(jsonEncode({'type': 'message', 'message': content}));
      }
    }
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
    _subscription?.cancel();
    _channel?.sink.close();
    super.dispose();
  }
}
