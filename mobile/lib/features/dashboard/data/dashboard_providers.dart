import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/analytics_api.dart';
import '../../../core/api/projects_api.dart';
import '../../../core/api/tasks_api.dart';
import '../../../entities/analytics.dart';
import '../../../entities/project.dart';
import '../../../entities/task.dart';

final dashboardProvider = FutureProvider.autoDispose<DashboardData>((ref) async {
  final analytics = ref.read(analyticsApiProvider);
  final projectsApi = ref.read(projectsApiProvider);
  final tasksApi = ref.read(tasksApiProvider);

  final results = await Future.wait([
    analytics.getSummary(),
    projectsApi.list(params: {'ordering': '-created_at', 'page_size': '5'}),
    tasksApi.my(),
    tasksApi.upcoming(),
  ]);

  return DashboardData(
    summary: results[0] as SummaryMetrics,
    recentProjects: results[1] as List<Project>,
    myTasks: results[2] as List<Task>,
    upcomingTasks: results[3] as List<Task>,
  );
});

class DashboardData {
  final SummaryMetrics summary;
  final List<Project> recentProjects;
  final List<Task> myTasks;
  final List<Task> upcomingTasks;

  DashboardData({
    required this.summary,
    required this.recentProjects,
    required this.myTasks,
    required this.upcomingTasks,
  });
}
