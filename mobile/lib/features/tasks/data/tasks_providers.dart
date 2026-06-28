import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/tasks_api.dart';
import '../../../entities/task.dart';

final tasksListProvider = FutureProvider.autoDispose.family<List<Task>, TasksFilter>((ref, filter) async {
  final api = ref.read(tasksApiProvider);
  final params = <String, dynamic>{};

  if (filter.projectId != null) params['project'] = filter.projectId;
  if (filter.status != null) params['status'] = filter.status;
  if (filter.assignee != null) params['assignee'] = filter.assignee;
  params['page_size'] = '50';

  if (filter.filter == TasksFilterType.my) {
    return await api.my();
  } else if (filter.filter == TasksFilterType.upcoming) {
    return await api.upcoming();
  }
  return await api.list(params: params);
});

class TasksFilter {
  final TasksFilterType filter;
  final String? projectId;
  final String? status;
  final String? assignee;

  const TasksFilter({
    this.filter = TasksFilterType.all,
    this.projectId,
    this.status,
    this.assignee,
  });

  TasksFilter copyWith({TasksFilterType? filter, String? projectId, String? status, String? assignee}) {
    return TasksFilter(
      filter: filter ?? this.filter,
      projectId: projectId ?? this.projectId,
      status: status ?? this.status,
      assignee: assignee ?? this.assignee,
    );
  }
}

enum TasksFilterType { all, my, upcoming, overdue }
