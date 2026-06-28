import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/notifications_api.dart';
import '../../../entities/user.dart';
import '../../auth/data/auth_providers.dart';
import '../../dashboard/data/dashboard_providers.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardProvider);
    final authAsync = ref.watch(authStateProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          authAsync.whenOrNull(data: (user) => user?.firstName ?? 'Главная') ?? 'Главная',
          style: const TextStyle(fontSize: 22),
        ),
        actions: [
          Consumer(
            builder: (context, ref, _) {
              final notifCount = ref.watch(
                FutureProvider.autoDispose((r) => r.read(notificationsApiProvider).getUnreadCount()),
              );
              final notifData = notifCount.asData?.value;
              return Stack(
                children: [
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined),
                    onPressed: () {},
                  ),
                  if (notifData != null && notifData > 0)
                    Positioned(
                      right: 8,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Color(0xFFEF4444),
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          '$notifData',
                          style: const TextStyle(color: Colors.white, fontSize: 10),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
      body: dashboardAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Color(0xFFEF4444)),
              const SizedBox(height: 16),
              Text('Ошибка загрузки', style: TextStyle(color: Colors.grey[600])),
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: () => ref.refresh(dashboardProvider),
                child: const Text('Повторить'),
              ),
            ],
          ),
        ),
        data: (data) => SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Greeting
              _GreetingText(authAsync: authAsync),
              const SizedBox(height: 4),
              const Text(
                'Вот что происходит в вашей студии сегодня',
                style: TextStyle(color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 24),

              // Stats Grid
              Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      icon: Icons.people,
                      label: 'Клиенты',
                      value: '${data.summary.totalClients}',
                      color: const Color(0xFF6366F1),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatCard(
                      icon: Icons.folder,
                      label: 'Проекты',
                      value: '${data.summary.activeProjects}',
                      color: const Color(0xFF22C55E),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      icon: Icons.attach_money,
                      label: 'Доход (мес)',
                      value: '${_formatMoney(data.summary.monthlyRevenue)} ₽',
                      color: const Color(0xFFF59E0B),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatCard(
                      icon: Icons.checklist,
                      label: 'Задачи',
                      value: '${data.summary.openTasks}',
                      color: const Color(0xFF3B82F6),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Active Projects
              const Text(
                'Активные проекты',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              if (data.recentProjects.isEmpty)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: Text('Нет активных проектов')),
                  ),
                )
              else
                ...data.recentProjects.take(3).map(
                  (project) => _ProjectCard(
                    name: project.name,
                    client: project.clientName ?? '',
                    progress: project.progress / 100.0,
                    status: project.statusName ?? 'Активен',
                    onTap: () => context.go('/projects/${project.id}'),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatMoney(double value) {
    if (value >= 1000000) return '${(value / 1000000).toStringAsFixed(1)} M';
    if (value >= 1000) return '${(value / 1000).toStringAsFixed(0)} K';
    return value.toStringAsFixed(0);
  }
}

class _GreetingText extends StatelessWidget {
  final AsyncValue<User?> authAsync;

  const _GreetingText({required this.authAsync});

  @override
  Widget build(BuildContext context) {
    final user = authAsync.asData?.value;
    final name = user?.firstName ?? '';
    return Text(
      'Доброе утро, $name! 👋',
      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
    );
  }
}


class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  final String name;
  final String client;
  final double progress;
  final String status;
  final VoidCallback onTap;

  const _ProjectCard({
    required this.name,
    required this.client,
    required this.progress,
    required this.status,
    required this.onTap,
  });

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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                        if (client.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(client, style: const TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                        ],
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF22C55E).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      status,
                      style: const TextStyle(color: Color(0xFF22C55E), fontSize: 12, fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress,
                  backgroundColor: const Color(0xFFE2E8F0),
                  color: const Color(0xFF6366F1),
                  minHeight: 6,
                ),
              ),
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  '${(progress * 100).toInt()}%',
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
