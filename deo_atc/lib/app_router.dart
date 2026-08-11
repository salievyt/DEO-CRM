import 'package:go_router/go_router.dart';

import 'features/calls/presentation/screens/calls_screen.dart';
import 'features/calls/presentation/screens/stats_screen.dart';
import 'features/live/presentation/screens/live_screen.dart';
import 'features/pbx/presentation/screens/settings_screen.dart';
import 'features/shell/presentation/shell_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/calls',
  routes: [
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) =>
          ShellScreen(navigationShell: navigationShell),
      branches: [
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/calls',
              builder: (context, state) => const CallsScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/stats',
              builder: (context, state) => const StatsScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/live',
              builder: (context, state) => const LiveScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/settings',
              builder: (context, state) => const SettingsScreen(),
            ),
          ],
        ),
      ],
    ),
  ],
);
