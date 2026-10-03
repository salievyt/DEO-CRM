import 'dart:convert';
import 'dart:typed_data';
import 'package:intl/date_symbol_data_local.dart';
import 'package:deo_crm_mobile/features/workspace/crm_planning.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:deo_crm_mobile/features/workspace/crm_api.dart';
import 'package:deo_crm_mobile/features/workspace/crm_form.dart';
import 'package:deo_crm_mobile/features/workspace/crm_resources.dart';
import 'package:deo_crm_mobile/features/workspace/crm_workspace.dart';

class LocalBackend implements HttpClientAdapter {
  final requests = <RequestOptions>[];
  final Map<String, dynamic> responses = {};
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final response = responses['${options.method} ${options.path}'];
    return ResponseBody.fromString(
      jsonEncode(response ?? {}),
      200,
      headers: {
        'content-type': ['application/json'],
        'allow': ['GET, POST, PUT, PATCH, DELETE, OPTIONS'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  setUpAll(() => initializeDateFormatting('ru'));
  late LocalBackend backend;
  late Dio dio;
  setUp(() {
    backend = LocalBackend();
    dio = Dio(BaseOptions(baseUrl: 'https://backend.example/api/v1'))
      ..httpClientAdapter = backend;
  });
  Widget host(Widget child) => ProviderScope(
    overrides: [crmApiProvider.overrideWithValue(CrmApi(dio))],
    child: MaterialApp(home: child),
  );

  testWidgets('server form posts entered data and omits read-only fields', (
    tester,
  ) async {
    backend.responses['OPTIONS /clients/'] = {
      'actions': {
        'POST': {
          'id': {'type': 'string', 'read_only': true},
          'first_name': {'type': 'string', 'required': true},
          'email': {'type': 'email'},
        },
      },
    };
    await tester.pumpWidget(
      host(const CrmFormScreen(title: 'Создать клиента', path: '/clients/')),
    );
    await tester.pumpAndSettle();
    expect(find.text('id'), findsNothing);
    await tester.enterText(find.byType(TextFormField).first, 'Алина');
    await tester.enterText(
      find.byType(TextFormField).last,
      'alina@example.com',
    );
    await tester.tap(find.text('Сохранить'));
    await tester.pumpAndSettle();
    final request = backend.requests.singleWhere((r) => r.method == 'POST');
    expect(request.path, '/clients/');
    expect(request.data, {'first_name': 'Алина', 'email': 'alina@example.com'});
  });

  testWidgets('required fields prevent sending an empty record', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        const CrmFormScreen(
          title: 'Задача',
          path: '/tasks/',
          fields: {
            'title': {'type': 'string', 'required': true},
          },
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Сохранить'));
    await tester.pumpAndSettle();
    expect(find.text('Заполните поле'), findsOneWidget);
    expect(backend.requests.where((r) => r.method == 'POST'), isEmpty);
  });

  testWidgets(
    'resource uses paginated backend results and opens a real detail endpoint',
    (tester) async {
      backend.responses['GET /clients/'] = {
        'results': [
          {'id': 'client-1', 'full_name': 'Алина'},
        ],
        'next': null,
      };
      backend.responses['OPTIONS /clients/'] = {
        'actions': {
          'POST': {
            'first_name': {'type': 'string'},
          },
        },
      };
      backend.responses['GET /clients/client-1/'] = {
        'id': 'client-1',
        'full_name': 'Алина',
        'email': 'alina@example.com',
      };
      backend.responses['OPTIONS /clients/client-1/'] = {
        'actions': {
          'PUT': {
            'first_name': {'type': 'string'},
          },
        },
      };
      await tester.pumpWidget(
        host(CrmResourceScreen(resource: crmResource('clients'))),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Алина'));
      await tester.pumpAndSettle();
      expect(find.text('alina@example.com'), findsOneWidget);
      expect(
        backend.requests.any((r) => r.path == '/clients/client-1/'),
        isTrue,
      );
    },
  );

  test(
    'lookup pagination preserves query and refuses another origin',
    () async {
      backend.responses['GET /clients/'] = {
        'results': [
          {'id': '1'},
        ],
        'next': 'https://backend.example/api/v1/clients/?page=2',
      };
      backend.responses['GET https://backend.example/api/v1/clients/?page=2'] =
          {
            'results': [
              {'id': '2'},
            ],
            'next': null,
          };
      expect((await CrmApi(dio).choices('/clients/')).map((r) => r['id']), [
        '1',
        '2',
      ]);
      backend.responses['GET /clients/'] = {
        'results': [],
        'next': 'https://untrusted.example/clients/',
      };
      await expectLater(CrmApi(dio).choices('/clients/'), throwsStateError);
    },
  );

  test('task assignment and deal statuses match backend contracts', () {
    final assign = crmResource(
      'tasks',
    ).actions.firstWhere((a) => a.suffix == 'assign/');
    expect(assign.fields.keys, ['user_id']);
    final status = crmResource(
      'deals',
    ).actions.firstWhere((a) => a.suffix == 'status/');
    expect(
      (status.fields['status']['choices'] as List).map((e) => e['value']),
      containsAll(['draft', 'open', 'won', 'lost']),
    );
    expect(crmResources.any((r) => r.path.startsWith('/calls/')), isFalse);
  });
  testWidgets('calendar loads real task and project deadlines', (tester) async {
    final deadline = DateTime.now().toIso8601String();
    backend.responses['GET /tasks/upcoming/'] = {
      'results': [
        {'id': 'task-1', 'title': 'Задача календаря', 'deadline': deadline},
      ],
      'next': null,
    };
    backend.responses['GET /projects/'] = {
      'results': [
        {'id': 'project-1', 'name': 'Проект календаря', 'deadline': deadline},
      ],
      'next': null,
    };
    await tester.pumpWidget(host(const CrmCalendarScreen()));
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView), const Offset(0, -650));
    await tester.pumpAndSettle();
    expect(find.text('Задача календаря'), findsOneWidget);
    expect(find.text('Проект календаря'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'heatmap reads backend members and changes the requested period',
    (tester) async {
      backend.responses['GET /analytics/metrics/workload/'] = {
        'members': [
          {
            'user_name': 'Алина',
            'daily': [
              {'date': '2026-10-03', 'tasks_assigned': 4, 'hours_tracked': 2.5},
            ],
          },
        ],
      };
      await tester.pumpWidget(host(const CrmHeatmapScreen()));
      await tester.pumpAndSettle();
      expect(find.text('Алина'), findsOneWidget);
      expect(find.text('4'), findsOneWidget);
      expect(backend.requests.last.queryParameters['days'], 28);
      await tester.tap(find.text('Часы'));
      await tester.pumpAndSettle();
      expect(find.text('2.5'), findsOneWidget);
      await tester.tap(find.byType(DropdownButton<int>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('7 дней').last);
      await tester.pumpAndSettle();
      expect(backend.requests.last.queryParameters['days'], 7);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'certificates are read from employee profile rather than POST-only collection',
    (tester) async {
      backend.responses['GET /auth/users/user-1/profile/'] = {
        'certificates': [
          {'id': 'cert-1', 'title': 'Сертификат'},
        ],
      };
      await tester.pumpWidget(
        host(
          const CrmResourceScreen(
            resource: CrmResource(
              'certificates',
              'Сертификаты',
              '/auth/users/user-1/certificates/',
              detail: false,
              dataPath: '/auth/users/user-1/profile/',
              dataKey: 'certificates',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Сертификат'), findsOneWidget);
      expect(
        backend.requests.any(
          (r) => r.method == 'GET' && r.path.endsWith('/certificates/'),
        ),
        isFalse,
      );
    },
  );
  testWidgets('project member removal uses user id and asks for confirmation', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        const CrmRecordScreen(
          resource: CrmResource(
            'team',
            'Команда',
            '/projects/project-1/team/',
            detail: false,
            idField: 'user',
          ),
          row: {'id': 'membership-1', 'user': 'user-1', 'user_name': 'Алина'},
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Удалить'));
    await tester.pumpAndSettle();
    expect(backend.requests.where((r) => r.method == 'DELETE'), isEmpty);
    await tester.tap(find.text('Удалить'));
    await tester.pumpAndSettle();
    expect(
      backend.requests.singleWhere((r) => r.method == 'DELETE').path,
      '/projects/project-1/team/user-1/',
    );
  });
}
