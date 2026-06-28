import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/analytics_api.dart';
import '../../../entities/analytics.dart';

final summaryMetricsProvider = FutureProvider.autoDispose<SummaryMetrics>((ref) async {
  final api = ref.read(analyticsApiProvider);
  return await api.getSummary();
});

final salesMetricsProvider = FutureProvider.autoDispose<SalesMetrics>((ref) async {
  final api = ref.read(analyticsApiProvider);
  return await api.getSalesMetrics();
});

final taskMetricsProvider = FutureProvider.autoDispose<TaskMetrics>((ref) async {
  final api = ref.read(analyticsApiProvider);
  return await api.getTaskMetrics();
});

final analyticsDataProvider = FutureProvider.autoDispose<AnalyticsData>((ref) async {
  final results = await Future.wait([
    ref.read(summaryMetricsProvider.future),
    ref.read(salesMetricsProvider.future),
    ref.read(taskMetricsProvider.future),
  ]);

  return AnalyticsData(
    summary: results[0] as SummaryMetrics,
    sales: results[1] as SalesMetrics,
    tasks: results[2] as TaskMetrics,
  );
});

class AnalyticsData {
  final SummaryMetrics summary;
  final SalesMetrics sales;
  final TaskMetrics tasks;

  AnalyticsData({required this.summary, required this.sales, required this.tasks});
}
