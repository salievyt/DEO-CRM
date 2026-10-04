import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/api/notifications_api.dart';
import '../../auth/data/auth_providers.dart';
import '../data/dashboard_providers.dart';
import '../../workspace/crm_record_card.dart';
import '../../workspace/crm_resources.dart';
import '../../workspace/crm_planning.dart';
import '../../workspace/crm_workspace.dart';

final homeUnreadProvider = FutureProvider.autoDispose<int>(
  (ref) => ref.read(notificationsApiProvider).getUnreadCount(),
);

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasks = ref.watch(homeTasksProvider);
    final projects = ref.watch(homeProjectsProvider);
    final user = ref.watch(authStateProvider).asData?.value;
    final unread = ref.watch(homeUnreadProvider).asData?.value ?? 0;
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final now = DateTime.now();
    final greeting = now.hour < 6
        ? 'Доброй ночи'
        : now.hour < 12
        ? 'Доброе утро'
        : now.hour < 18
        ? 'Добрый день'
        : 'Добрый вечер';
    Future<void> refresh() async {
      ref.invalidate(homeUnreadProvider);
      await Future.wait([
        ref
            .refresh(homeTasksProvider.future)
            .then<void>((_) {}, onError: (Object _, StackTrace _) {}),
        ref
            .refresh(homeProjectsProvider.future)
            .then<void>((_) {}, onError: (Object _, StackTrace _) {}),
      ]);
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Мой день'),
        actions: [
          IconButton(
            tooltip: 'Уведомления',
            onPressed: () => context.go('/workspace/notifications'),
            icon: Badge(
              isLabelVisible: unread > 0,
              label: Text(unread > 99 ? '99+' : '$unread'),
              child: const Icon(Icons.notifications_none_rounded),
            ),
          ),
          IconButton(
            tooltip: 'Профиль и настройки',
            onPressed: () => context.go('/settings'),
            icon: CircleAvatar(
              radius: 16,
              backgroundColor: colors.primaryContainer,
              child: Text(
                (user?.firstName.isNotEmpty ?? false)
                    ? user!.firstName.characters.first.toUpperCase()
                    : 'Я',
                style: theme.textTheme.labelMedium,
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: refresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          children: [
            Text(
              DateFormat('EEEE, d MMMM', 'ru').format(now),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '$greeting${(user?.firstName.isNotEmpty ?? false) ? ', ${user!.firstName}' : ''}',
              style: theme.textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Задачи, команда и время для важного.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: colors.primaryContainer,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.graphic_eq_rounded,
                        color: colors.onPrimaryContainer,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'DEO FOCUS',
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: colors.onPrimaryContainer,
                          letterSpacing: 2,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Text(
                    'Одно дело за раз',
                    style: theme.textTheme.titleLarge?.copyWith(
                      color: colors.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Выберите задачу и выделите время\nдля работы без отвлечений.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colors.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(height: 18),
                  FilledButton.icon(
                    onPressed: () => context.go('/focus'),
                    icon: const Icon(Icons.play_arrow_rounded),
                    label: const Text('Начать фокус'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(
                  avatar: const Icon(Icons.calendar_today_outlined, size: 18),
                  label: const Text('Календарь'),
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const CrmCalendarScreen(),
                    ),
                  ),
                ),
                ActionChip(
                  avatar: const Icon(Icons.people_outline, size: 18),
                  label: const Text('Клиенты'),
                  onPressed: () => context.go('/workspace/clients'),
                ),
                ActionChip(
                  avatar: const Icon(Icons.trending_up, size: 18),
                  label: const Text('Лиды'),
                  onPressed: () => context.go('/leads'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _Section(title: 'Мои задачи', onTap: () => context.go('/tasks')),
            tasks.when(
              loading: () => const _Loading(),
              error: (_, _) =>
                  _Retry(onTap: () => ref.invalidate(homeTasksProvider)),
              data: (items) => items.isEmpty
                  ? const _Empty(
                      text: 'Пока нет назначенных задач',
                      icon: Icons.task_alt,
                    )
                  : Column(
                      children: items
                          .take(4)
                          .map(
                            (task) => CrmRecordCard(
                              icon: Icons.task_alt,
                              row: {
                                'id': task.id,
                                'title': task.title,
                                'project_name': task.projectName,
                                'status_name': task.statusName,
                                'priority_name': task.priorityName,
                                'deadline': task.deadline?.toIso8601String(),
                              },
                              onTap: () async {
                                await Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => CrmRecordScreen(
                                      resource: crmResources.firstWhere(
                                        (r) => r.key == 'tasks',
                                      ),
                                      row: {'id': task.id, 'title': task.title},
                                    ),
                                  ),
                                );
                                if (context.mounted) {
                                  ref.invalidate(homeTasksProvider);
                                }
                              },
                            ),
                          )
                          .toList(),
                    ),
            ),
            const SizedBox(height: 12),
            _Section(title: 'Проекты', onTap: () => context.go('/projects')),
            projects.when(
              loading: () => const _Loading(),
              error: (_, _) =>
                  _Retry(onTap: () => ref.invalidate(homeProjectsProvider)),
              data: (items) => items.isEmpty
                  ? const _Empty(
                      text: 'Здесь появятся ваши проекты',
                      icon: Icons.folder_outlined,
                    )
                  : Column(
                      children: items
                          .take(3)
                          .map(
                            (project) => CrmRecordCard(
                              row: {
                                'name': project.name,
                                'client_name': project.clientName,
                                'status_name': project.statusName,
                                'progress': project.progress,
                              },
                              onTap: () =>
                                  context.go('/projects/${project.id}'),
                            ),
                          )
                          .toList(),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.onTap});
  final String title;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(
      children: [
        Expanded(
          child: Text(title, style: Theme.of(context).textTheme.titleLarge),
        ),
        TextButton(onPressed: onTap, child: const Text('Все →')),
      ],
    ),
  );
}

class _Loading extends StatelessWidget {
  const _Loading();
  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.all(28),
    child: Center(child: CircularProgressIndicator()),
  );
}

class _Retry extends StatelessWidget {
  const _Retry({required this.onTap});
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const Text('Не удалось загрузить этот раздел'),
          TextButton.icon(
            onPressed: onTap,
            icon: const Icon(Icons.refresh),
            label: const Text('Повторить'),
          ),
        ],
      ),
    ),
  );
}

class _Empty extends StatelessWidget {
  const _Empty({required this.text, required this.icon});
  final String text;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Icon(icon, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 12),
          Text(text, textAlign: TextAlign.center),
        ],
      ),
    ),
  );
}
