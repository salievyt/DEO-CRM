import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../entities/project.dart';
import '../data/projects_providers.dart';

class ProjectsScreen extends ConsumerWidget {
  const ProjectsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectsAsync = ref.watch(projectsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Проекты'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {},
          ),
        ],
      ),
      body: projectsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Color(0xFFEF4444)),
              const SizedBox(height: 16),
              const Text('Не удалось загрузить проекты'),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => ref.refresh(projectsListProvider),
                child: const Text('Повторить'),
              ),
            ],
          ),
        ),
        data: (projects) {
          if (projects.isEmpty) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.folder_open, size: 64, color: Color(0xFFCBD5E1)),
                  SizedBox(height: 16),
                  Text('Нет проектов', style: TextStyle(color: Color(0xFF64748B))),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: projects.length,
            itemBuilder: (context, index) {
              final project = projects[index];
              return _ProjectCard(
                project: project,
                onTap: () => context.go('/projects/${project.id}'),
              );
            },
          );
        },
      ),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  final Project project;
  final VoidCallback onTap;

  const _ProjectCard({required this.project, required this.onTap});

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase() ?? '') {
      case 'завершён':
      case 'завершен':
        return const Color(0xFF22C55E);
      case 'разработка':
      case 'в работе':
        return const Color(0xFF6366F1);
      case 'дизайн':
        return const Color(0xFF3B82F6);
      case 'тестирование':
        return const Color(0xFFF59E0B);
      case 'приостановлен':
        return const Color(0xFF64748B);
      default:
        return const Color(0xFF6366F1);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      project.name,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getStatusColor(project.statusName).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      project.statusName ?? 'Активен',
                      style: TextStyle(
                        color: _getStatusColor(project.statusName),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              if (project.clientName != null && project.clientName!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  project.clientName!,
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                ),
              ],
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: project.progress / 100.0,
                  backgroundColor: const Color(0xFFE2E8F0),
                  color: project.progress >= 100
                      ? const Color(0xFF22C55E)
                      : const Color(0xFF6366F1),
                  minHeight: 6,
                ),
              ),
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  '${project.progress}%',
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
