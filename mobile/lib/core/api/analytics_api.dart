import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../entities/analytics.dart';
import 'api_service.dart';

final analyticsApiProvider = Provider<AnalyticsApi>((ref) => AnalyticsApi(ref));

class AnalyticsApi {
  final ApiService _api;

  AnalyticsApi(Ref ref) : _api = ApiService(ref);

  Future<SummaryMetrics> getSummary() async {
    final response = await _api.get('/analytics/metrics/summary/');
    return SummaryMetrics.fromJson(response.data as Map<String, dynamic>);
  }

  Future<SalesMetrics> getSalesMetrics() async {
    final response = await _api.get('/analytics/metrics/sales/');
    return SalesMetrics.fromJson(response.data as Map<String, dynamic>);
  }

  Future<TaskMetrics> getTaskMetrics() async {
    final response = await _api.get('/analytics/metrics/tasks/');
    return TaskMetrics.fromJson(response.data as Map<String, dynamic>);
  }
}
