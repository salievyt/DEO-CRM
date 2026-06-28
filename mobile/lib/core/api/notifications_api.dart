import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../entities/notification.dart';
import 'api_service.dart';

final notificationsApiProvider = Provider<NotificationsApi>((ref) => NotificationsApi(ref));

class NotificationsApi {
  final ApiService _api;

  NotificationsApi(Ref ref) : _api = ApiService(ref);

  Future<List<AppNotification>> list() async {
    final response = await _api.get('/notifications/');
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => AppNotification.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> markAllRead() async {
    await _api.post('/notifications/mark-all-read/');
  }

  Future<int> getUnreadCount() async {
    try {
      final response = await _api.get('/notifications/unread-count/');
      return (response.data['count'] as num?)?.toInt() ?? 0;
    } catch (_) {
      return 0;
    }
  }
}
