import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/view/login_screen.dart';
import '../../features/dashboard/view/dashboard_screen.dart';
import '../../features/projects/view/projects_screen.dart';
import '../../features/projects/view/project_detail_screen.dart';
import '../../features/tasks/view/tasks_screen.dart';
import '../../features/leads/view/leads_screen.dart';
import '../../features/chat/view/chat_screen.dart';
import '../../features/chat/view/chat_detail_screen.dart';
import '../../features/finance/view/finance_screen.dart';
import '../../features/documents/view/documents_screen.dart';
import '../../features/analytics/view/analytics_screen.dart';
import '../../features/settings/view/settings_screen.dart';
import '../../features/cabinet/view/cabinet_screen.dart';
import '../../features/ai_assistant/view/ai_screen.dart';
import '../../entities/chat.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/login',
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/projects',
            builder: (context, state) => const ProjectsScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) => ProjectDetailScreen(
                  projectId: state.pathParameters['id'] ?? '',
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/tasks',
            builder: (context, state) => const TasksScreen(),
          ),
          GoRoute(
            path: '/leads',
            builder: (context, state) => const LeadsScreen(),
          ),
          GoRoute(
            path: '/chat',
            builder: (context, state) => const ChatScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final chatId = state.pathParameters['id'] ?? '';
                  final chat = state.extra as Chat?;
                  return ChatDetailScreen(
                    chatId: chatId,
                    chatName: chat?.name ?? '',
                  );
                },
              ),
            ],
          ),
          GoRoute(
            path: '/finance',
            builder: (context, state) => const FinanceScreen(),
          ),
          GoRoute(
            path: '/documents',
            builder: (context, state) => const DocumentsScreen(),
          ),
          GoRoute(
            path: '/analytics',
            builder: (context, state) => const AnalyticsScreen(),
          ),
          GoRoute(
            path: '/ai',
            builder: (context, state) => const AIScreen(),
          ),
          GoRoute(
            path: '/settings',
            builder: (context, state) => const SettingsScreen(),
          ),
          GoRoute(
            path: '/cabinet',
            builder: (context, state) => const CabinetScreen(),
          ),
        ],
      ),
    ],
  );
});

class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _calculateSelectedIndex(context),
        onDestinationSelected: (index) => _onItemTapped(index, context),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Главная',
          ),
          NavigationDestination(
            icon: Icon(Icons.folder_outlined),
            selectedIcon: Icon(Icons.folder),
            label: 'Проекты',
          ),
          NavigationDestination(
            icon: Icon(Icons.checklist_outlined),
            selectedIcon: Icon(Icons.checklist),
            label: 'Задачи',
          ),
          NavigationDestination(
            icon: Icon(Icons.trending_up_outlined),
            selectedIcon: Icon(Icons.trending_up),
            label: 'Лиды',
          ),
          NavigationDestination(
            icon: Icon(Icons.more_horiz),
            selectedIcon: Icon(Icons.more_horiz),
            label: 'Ещё',
          ),
        ],
      ),
    );
  }

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    if (location.startsWith('/projects')) return 1;
    if (location.startsWith('/tasks')) return 2;
    if (location.startsWith('/leads')) return 3;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0: context.go('/dashboard');
      case 1: context.go('/projects');
      case 2: context.go('/tasks');
      case 3: context.go('/leads');
      case 4: _showMoreMenu(context);
    }
  }

  void _showMoreMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _MenuItem(
              icon: Icons.chat,
              label: 'Чат',
              onTap: () { Navigator.pop(context); context.go('/chat'); },
            ),
            _MenuItem(
              icon: Icons.attach_money,
              label: 'Финансы',
              onTap: () { Navigator.pop(context); context.go('/finance'); },
            ),
            _MenuItem(
              icon: Icons.description,
              label: 'Документы',
              onTap: () { Navigator.pop(context); context.go('/documents'); },
            ),
            _MenuItem(
              icon: Icons.analytics,
              label: 'Аналитика',
              onTap: () { Navigator.pop(context); context.go('/analytics'); },
            ),
            _MenuItem(
              icon: Icons.auto_awesome,
              label: 'DEO AI',
              onTap: () { Navigator.pop(context); context.go('/ai'); },
            ),
            _MenuItem(
              icon: Icons.settings,
              label: 'Настройки',
              onTap: () { Navigator.pop(context); context.go('/settings'); },
            ),
            _MenuItem(
              icon: Icons.person,
              label: 'Мой кабинет',
              onTap: () { Navigator.pop(context); context.go('/cabinet'); },
            ),
          ],
        ),
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _MenuItem({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: const Color(0xFF6366F1)),
      title: Text(label),
      onTap: onTap,
    );
  }
}
