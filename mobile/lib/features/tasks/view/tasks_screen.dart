import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../entities/task.dart';
import '../data/tasks_providers.dart';

final _currentFilterProvider = StateProvider.autoDispose<TasksFilter>((ref) => const TasksFilter());

class TasksScreen extends ConsumerWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(_currentFilterProvider);
    final tasksAsync = ref.watch(tasksListProvider(filter));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Задачи'),
        actions: [
          IconButton(icon: const Icon(Icons.add), onPressed: () {}),
        ],
      ),
      body: Column(
        children: [
          // Filters
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _FilterChip(
                  label: 'Все',
                  isSelected: filter.filter == TasksFilterType.all,
                  onSelected: () => ref.read(_currentFilterProvider.notifier).state = const TasksFilter(filter: TasksFilterType.all),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Мои',
                  isSelected: filter.filter == TasksFilterType.my,
                  onSelected: () => ref.read(_currentFilterProvider.notifier).state = const TasksFilter(filter: TasksFilterType.my),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Предстоящие',
                  isSelected: filter.filter == TasksFilterType.upcoming,
                  onSelected: () => ref.read(_currentFilterProvider.notifier).state = const TasksFilter(filter: TasksFilterType.upcoming),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Tasks list
          Expanded(
            child: tasksAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: Color(0xFFEF4444)),
                    const SizedBox(height: 12),
                    const Text('Ошибка загрузки'),
                    OutlinedButton(onPressed: () => ref.refresh(tasksListProvider(filter)), child: const Text('Повторить')),
                  ],
                ),
              ),
              data: (tasks) {
                if (tasks.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.check_circle_outline, size: 64, color: Color(0xFFCBD5E1)),
                        SizedBox(height: 16),
                        Text('Задач нет', style: TextStyle(color: Color(0xFF64748B))),
                      ],
                    ),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: tasks.length,
                  itemBuilder: (context, index) => _TaskCard(task: tasks[index]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onSelected;

  const _FilterChip({required this.label, required this.isSelected, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => onSelected(),
        selectedColor: const Color(0xFF6366F1).withValues(alpha: 0.1),
        checkmarkColor: const Color(0xFF6366F1),
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  final Task task;

  const _TaskCard({required this.task});

  @override
  Widget build(BuildContext context) {
    final isHigh = task.priorityName?.toLowerCase() == 'высокий' || task.priorityName?.toLowerCase() == 'critical';
    final isOverdue = task.deadline != null && task.deadline!.isBefore(DateTime.now());
    final isCompleted = task.statusName?.toLowerCase() == 'выполнена' || task.statusName?.toLowerCase() == 'completed';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    task.title,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                      decoration: isCompleted ? TextDecoration.lineThrough : null,
                      color: isCompleted ? const Color(0xFF94A3B8) : null,
                    ),
                  ),
                ),
                if (task.priorityName != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: (isHigh ? const Color(0xFFEF4444) : const Color(0xFFF59E0B)).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      task.priorityName!,
                      style: TextStyle(
                        color: isHigh ? const Color(0xFFEF4444) : const Color(0xFFF59E0B),
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.folder_outlined, size: 14, color: Color(0xFF94A3B8)),
                const SizedBox(width: 4),
                Text(
                  task.projectName ?? 'Без проекта',
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                ),
                const Spacer(),
                if (task.assigneeName != null) ...[
                  const Icon(Icons.person_outlined, size: 14, color: Color(0xFF94A3B8)),
                  const SizedBox(width: 4),
                  Text(
                    task.assigneeName!,
                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.access_time, size: 14, color: Color(0xFF94A3B8)),
                const SizedBox(width: 4),
                Text(
                  task.deadline != null
                      ? '${task.deadline!.day}.${task.deadline!.month}.${task.deadline!.year}'
                      : 'Без срока',
                  style: TextStyle(
                    color: isOverdue ? const Color(0xFFEF4444) : const Color(0xFF64748B),
                    fontSize: 13,
                  ),
                ),
                const Spacer(),
                if (task.statusName != null)
                  Text(
                    task.statusName!,
                    style: const TextStyle(
                      color: Color(0xFF6366F1),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
