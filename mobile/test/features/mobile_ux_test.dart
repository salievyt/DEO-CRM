import 'package:deo_crm_mobile/core/theme/app_theme.dart';
import 'package:deo_crm_mobile/core/router/app_router.dart';
import 'package:deo_crm_mobile/features/dashboard/data/dashboard_providers.dart';
import 'package:deo_crm_mobile/features/dashboard/view/dashboard_screen.dart';
import 'package:deo_crm_mobile/features/workspace/crm_record_card.dart';
import 'package:deo_crm_mobile/features/workspace/crm_workspace.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';

void main() {
  setUpAll(() => initializeDateFormatting('ru'));
  testWidgets('menu searches all groups and clears query', (tester) async {
    await tester.pumpWidget(
      MaterialApp(theme: AppTheme.light, home: const CrmWorkspaceMenu()),
    );
    await tester.enterText(find.byType(TextField), 'Ценность клиентов');
    await tester.pumpAndSettle();
    expect(find.widgetWithText(ListTile, 'Ценность клиентов'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'несуществующий раздел');
    await tester.pumpAndSettle();
    expect(find.text('Раздел не найден'), findsOneWidget);
    await tester.tap(find.byTooltip('Очистить поиск'));
    await tester.pumpAndSettle();
    expect(find.text('DEO Focus'), findsOneWidget);
  });
  testWidgets('cards fit narrow phone with large text in both themes', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    for (final theme in [AppTheme.light, AppTheme.dark]) {
      await tester.pumpWidget(
        MaterialApp(
          theme: theme,
          home: MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(1.6)),
            child: Scaffold(
              body: SingleChildScrollView(
                child: CrmRecordCard(
                  row: const {
                    'title':
                        'Подготовить презентацию нового проекта и согласовать с командой',
                    'project_name':
                        'Очень длинное название клиентского проекта',
                    'status_name': 'Ожидает согласования с заказчиком',
                    'deadline': '2026-10-15',
                    'progress': 145,
                  },
                  onTap: () {},
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('100%'), findsOneWidget);
    }
  });
  testWidgets('one failed section does not hide the rest of home', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          homeTasksProvider.overrideWith((ref) async => []),
          homeProjectsProvider.overrideWith(
            (ref) async => throw Exception('Forbidden'),
          ),
          homeUnreadProvider.overrideWith((ref) async => 0),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const DashboardScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Начать фокус'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Не удалось загрузить этот раздел'),
      200,
    );
    expect(find.text('Пока нет назначенных задач'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('bottom navigation selects chat and menu routes', (tester) async {
    final router = GoRouter(
      initialLocation: '/chat',
      routes: [
        ShellRoute(
          builder: (_, _, child) => MainShell(child: child),
          routes: [
            for (final path in [...MainShell.paths, '/focus'])
              GoRoute(
                path: path,
                builder: (_, _) => const Scaffold(body: Text('Content')),
              ),
          ],
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    );
    await tester.pumpAndSettle();
    expect(
      tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
      3,
    );
    await tester.tap(find.text('Меню'));
    await tester.pumpAndSettle();
    expect(router.routeInformationProvider.value.uri.path, '/workspace');
    router.go('/focus');
    await tester.pumpAndSettle();
    expect(
      tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
      4,
    );
  });
}
