import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/view/login_screen.dart';
import '../../features/focus/focus_screen.dart';
import '../../features/dashboard/view/dashboard_screen.dart';
import '../../features/chat/view/chat_screen.dart';
import '../../features/chat/view/chat_detail_screen.dart';
import '../../features/analytics/view/analytics_screen.dart';
import '../../features/settings/view/settings_screen.dart';
import '../../features/ai_assistant/view/ai_screen.dart';
import '../../entities/chat.dart';
import '../../features/auth/data/auth_providers.dart';
import '../../features/workspace/crm_workspace.dart';
import '../../features/workspace/crm_resources.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final appRouterProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/login',
    redirect: (context, state) {
      final auth = ref.read(authStateProvider);
      final loggedIn = auth.valueOrNull != null;
      if (!loggedIn && state.uri.path != '/login') return '/login';
      if (loggedIn && state.uri.path == '/login') return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/focus',
            builder: (context, state) => const FocusScreen(),
          ),
          GoRoute(
            path: '/workspace',
            builder: (context, state) => const CrmWorkspaceMenu(),
          ),
          GoRoute(
            path: '/workspace/:module',
            builder: (context, state) => CrmResourceScreen(
              resource: crmResource(state.pathParameters['module']!),
            ),
          ),
          GoRoute(
            path: '/dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/projects',
            builder: (context, state) =>
                CrmResourceScreen(resource: crmResource('projects')),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) => CrmRecordScreen(
                  resource: crmResource('projects'),
                  row: {'id': state.pathParameters['id']},
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/tasks',
            builder: (context, state) =>
                CrmResourceScreen(resource: crmResource('tasks')),
          ),
          GoRoute(
            path: '/leads',
            builder: (context, state) =>
                CrmResourceScreen(resource: crmResource('leads')),
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
            builder: (context, state) =>
                const CrmWorkspaceMenu(group: 'finance'),
          ),
          GoRoute(
            path: '/documents',
            builder: (context, state) =>
                CrmResourceScreen(resource: crmResource('documents')),
          ),
          GoRoute(
            path: '/analytics',
            builder: (context, state) => const AnalyticsScreen(),
          ),
          GoRoute(path: '/ai', builder: (context, state) => const AIScreen()),
          GoRoute(
            path: '/settings',
            builder: (context, state) => const SettingsScreen(),
          ),
          GoRoute(
            path: '/cabinet',
            builder: (context, state) =>
                const CrmWorkspaceMenu(group: 'cabinet'),
          ),
        ],
      ),
    ],
  );
  ref.listen(authStateProvider, (_, next) => router.refresh());
  ref.onDispose(router.dispose);
  return router;
});

class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});
  static const paths = [
    '/dashboard',
    '/tasks',
    '/projects',
    '/chat',
    '/workspace',
  ];

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final index = paths
        .take(4)
        .toList()
        .indexWhere(
          (path) => location == path || location.startsWith('$path/'),
        );
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: index < 0 ? 4 : index,
        onDestinationSelected: (index) => context.go(paths[index]),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.wb_sunny_outlined),
            selectedIcon: Icon(Icons.wb_sunny),
            label: 'Сегодня',
          ),
          NavigationDestination(
            icon: Icon(Icons.task_alt_outlined),
            selectedIcon: Icon(Icons.task_alt),
            label: 'Задачи',
          ),
          NavigationDestination(
            icon: Icon(Icons.folder_outlined),
            selectedIcon: Icon(Icons.folder),
            label: 'Проекты',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline),
            selectedIcon: Icon(Icons.chat_bubble),
            label: 'Чаты',
          ),
          NavigationDestination(
            icon: Icon(Icons.grid_view_outlined),
            selectedIcon: Icon(Icons.grid_view_rounded),
            label: 'Меню',
          ),
        ],
      ),
    );
  }
}
