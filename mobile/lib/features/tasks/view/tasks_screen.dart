import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  int _selectedFilter = 0;
  final filters = ['Все', 'Мои', 'Просрочено', 'Сегодня'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Задачи'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          // Filters
          SizedBox(
            height: 48,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: filters.length,
              itemBuilder: (context, index) {
                final isSelected = _selectedFilter == index;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(filters[index]),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() => _selectedFilter = index);
                    },
                    selectedColor: AppColors.brandLight.withValues(alpha: 0.1),
                    checkmarkColor: AppColors.brand,
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 8),

          // Tasks list
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: 8,
              itemBuilder: (context, index) {
                return _TaskCard(
                  title: 'Задача ${index + 1}',
                  project: 'Проект ${index % 3 + 1}',
                  priority: index % 3 == 0 ? 'Высокий' : 'Средний',
                  deadline: DateTime.now().add(Duration(days: index * 2)),
                  assignedTo: 'Иван',
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  final String title;
  final String project;
  final String priority;
  final DateTime deadline;
  final String assignedTo;

  const _TaskCard({
    required this.title,
    required this.project,
    required this.priority,
    required this.deadline,
    required this.assignedTo,
  });

  @override
  Widget build(BuildContext context) {
    final isHigh = priority == 'Высокий';
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
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: isHigh
                        ? AppColors.danger.withValues(alpha: 0.1)
                        : AppColors.warning.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    priority,
                    style: TextStyle(
                      color: isHigh ? AppColors.danger : AppColors.warning,
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
                const Icon(Icons.folder_outlined, size: 14, color: AppColors.surface400),
                const SizedBox(width: 4),
                Text(
                  project,
                  style: const TextStyle(
                    color: AppColors.surface500,
                    fontSize: 13,
                  ),
                ),
                const Spacer(),
                const Icon(Icons.person_outlined, size: 14, color: AppColors.surface400),
                const SizedBox(width: 4),
                Text(
                  assignedTo,
                  style: const TextStyle(
                    color: AppColors.surface500,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.access_time, size: 14, color: AppColors.surface400),
                const SizedBox(width: 4),
                Text(
                  '${deadline.day}.${deadline.month}.${deadline.year}',
                  style: TextStyle(
                    color: deadline.isBefore(DateTime.now())
                        ? AppColors.danger
                        : AppColors.surface500,
                    fontSize: 13,
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
