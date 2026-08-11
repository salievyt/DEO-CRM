import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/projects_providers.dart';

class ProjectDetailScreen extends ConsumerWidget {
  final String projectId;

  const ProjectDetailScreen({super.key, required this.projectId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(projectDetailProvider(projectId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Детали проекта'),
      ),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Color(0xFFEF4444)),
              const SizedBox(height: 16),
              const Text('Не удалось загрузить проект'),
              OutlinedButton(
                onPressed: () => ref.refresh(projectDetailProvider(projectId)),
                child: const Text('Повторить'),
              ),
            ],
          ),
        ),
        data: (detail) => SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Project info card
              Card(
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
                              detail.project.name,
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xFF6366F1).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              detail.project.statusName ?? 'Активен',
                              style: const TextStyle(color: Color(0xFF6366F1), fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _buildProgress(detail.project.progress),
                      const SizedBox(height: 16),
                      _InfoRow(label: 'Клиент', value: detail.project.clientName ?? '—'),
                      _InfoRow(label: 'Бюджет', value: detail.project.budget != null ? '${detail.project.budget!.toStringAsFixed(0)} ₽' : '—'),
                      if (detail.project.deadline != null)
                        _InfoRow(
                          label: 'Срок',
                          value: '${detail.project.deadline!.day}.${detail.project.deadline!.month}.${detail.project.deadline!.year}',
                        ),
                      if (detail.project.description != null && detail.project.description!.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            detail.project.description!,
                            style: const TextStyle(color: Color(0xFF64748B), fontSize: 14),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Team card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Команда', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      if (detail.team.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(8),
                          child: Text('Нет участников', style: TextStyle(color: Color(0xFF64748B))),
                        )
                      else
                        ...detail.team.map((member) => _TeamMember(
                          name: member.userName ?? 'Пользователь',
                          role: _getRoleName(member.roleInProject),
                        )),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProgress(int progress) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Прогресс', style: TextStyle(color: Color(0xFF64748B))),
            Text('$progress%', style: const TextStyle(fontWeight: FontWeight.w500)),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: progress / 100.0,
            backgroundColor: const Color(0xFFE2E8F0),
            color: const Color(0xFF6366F1),
            minHeight: 8,
          ),
        ),
      ],
    );
  }

  String _getRoleName(String role) {
    switch (role) {
      case 'pm': return 'Project Manager';
      case 'developer': return 'Разработчик';
      case 'designer': return 'Дизайнер';
      case 'tester': return 'Тестировщик';
      case 'marketer': return 'Маркетолог';
      default: return role;
    }
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF64748B))),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _TeamMember extends StatelessWidget {
  final String name;
  final String role;

  const _TeamMember({required this.name, required this.role});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: const Color(0xFF6366F1).withValues(alpha: 0.1),
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : '?',
              style: const TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: const TextStyle(fontWeight: FontWeight.w500)),
              Text(role, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
            ],
          ),
        ],
      ),
    );
  }
}
