import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../entities/chat.dart';
import '../config/api_config.dart';
import 'api_service.dart';

final chatApiProvider = Provider<ChatApi>((ref) => ChatApi(ref));

class ChatApi {
  final ApiService _api;

  ChatApi(Ref ref) : _api = ApiService(ref);

  Future<List<Chat>> getChats() async {
    final response = await _api.get('/messenger/chats/');
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => Chat.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Chat> getChat(String id) async {
    final response = await _api.get('/messenger/chats/$id/');
    return Chat.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<Message>> getMessages(String chatId, {Map<String, dynamic>? params}) async {
    final response = await _api.get('/messenger/chats/$chatId/messages/', params: params);
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => Message.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Message> sendMessage(String chatId, String content) async {
    final response = await _api.post('/messenger/chats/$chatId/messages/', data: {
      'content': content,
    });
    return Message.fromJson(response.data as Map<String, dynamic>);
  }

  Future<int> getUnreadCount() async {
    final response = await _api.get('/messenger/unread/');
    final data = response.data as Map<String, dynamic>;
    return (data['count'] as num?)?.toInt() ?? 0;
  }

  /// Build WebSocket URL for a specific chat from ApiConfig
  String wsUrlFor(String chatId) {
    final base = ApiConfig.baseUrl;
    final wsBase = base.startsWith('https')
        ? base.replaceFirst('https://', 'wss://')
        : base.replaceFirst('http://', 'ws://');
    final serverBase = wsBase.replaceAll('/api/v1', '').replaceAll('/api/', '');
    return '$serverBase/ws/chat/$chatId/';
  }
}
