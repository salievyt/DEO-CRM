import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:deo_crm_mobile/core/api/projects_api.dart';
import 'package:deo_crm_mobile/core/api/api_service.dart';

@GenerateMocks([Dio])
import 'projects_api_test.mocks.dart';

void main() {
  late MockDio mockDio;
  late ProviderContainer container;
  late ProjectsApi projectsApi;

  setUp(() {
    mockDio = MockDio();

    container = ProviderContainer(overrides: [
      dioProvider.overrideWithValue(mockDio as Dio),
    ]);

    projectsApi = container.read(projectsApiProvider);
  });

  tearDown(() {
    container.dispose();
  });

  group('ProjectsApi.list', () {
    test('returns list of projects', () async {
      final responseData = [
        {
          'id': 'project-uuid-1',
          'name': 'DEO CRM',
          'client': {
            'id': 'client-uuid-1',
            'full_name': 'TechCorp',
          },
          'status': {
            'id': 'status-uuid-1',
            'name': 'В работе',
            'color': '#6366f1',
          },
          'progress': 65,
          'budget': '2500000.00',
          'created_at': '2025-01-15T08:00:00Z',
          'updated_at': '2025-06-20T12:00:00Z',
        },
        {
          'id': 'project-uuid-2',
          'name': 'Сайт компании',
          'client': {
            'id': 'client-uuid-2',
            'full_name': 'ООО Пример',
          },
          'status': {
            'id': 'status-uuid-2',
            'name': 'Дизайн',
            'color': '#3b82f6',
          },
          'progress': 30,
          'budget': '500000.00',
          'created_at': '2025-06-01T08:00:00Z',
          'updated_at': '2025-06-20T12:00:00Z',
        },
      ];

      when(mockDio.get(
        any,
        options: anyNamed('options'),
        queryParameters: anyNamed('queryParameters'),
        cancelToken: anyNamed('cancelToken'),
        onReceiveProgress: anyNamed('onReceiveProgress'),
      )).thenAnswer((_) async => Response(
        requestOptions: RequestOptions(path: '/projects/'),
        data: responseData,
        statusCode: 200,
      ));

      final projects = await projectsApi.list();

      expect(projects.length, 2);
      expect(projects[0].name, 'DEO CRM');
      expect(projects[0].clientName, 'TechCorp');
      expect(projects[0].statusName, 'В работе');
      expect(projects[0].progress, 65);
      expect(projects[1].name, 'Сайт компании');
      expect(projects[1].statusName, 'Дизайн');
    });

    test('returns empty list when no projects', () async {
      when(mockDio.get(
        any,
        options: anyNamed('options'),
        queryParameters: anyNamed('queryParameters'),
        cancelToken: anyNamed('cancelToken'),
        onReceiveProgress: anyNamed('onReceiveProgress'),
      )).thenAnswer((_) async => Response(
        requestOptions: RequestOptions(path: '/projects/'),
        data: [],
        statusCode: 200,
      ));

      final projects = await projectsApi.list();

      expect(projects, isEmpty);
    });

    test('handles paginated response with results wrapper', () async {
      when(mockDio.get(
        any,
        options: anyNamed('options'),
        queryParameters: anyNamed('queryParameters'),
        cancelToken: anyNamed('cancelToken'),
        onReceiveProgress: anyNamed('onReceiveProgress'),
      )).thenAnswer((_) async => Response(
        requestOptions: RequestOptions(path: '/projects/'),
        data: {
          'count': 1,
          'next': null,
          'previous': null,
          'results': [
            {
              'id': 'project-uuid-1',
              'name': 'DEO CRM',
              'client': 'client-uuid-1',
              'status': 'status-uuid-1',
              'created_at': '2025-01-15T08:00:00Z',
              'updated_at': '2025-06-20T12:00:00Z',
            },
          ],
        },
        statusCode: 200,
      ));

      final projects = await projectsApi.list();

      expect(projects.length, 1);
      expect(projects[0].name, 'DEO CRM');
    });
  });

  group('ProjectsApi.get', () {
    test('returns single project', () async {
      when(mockDio.get(
        any,
        options: anyNamed('options'),
        queryParameters: anyNamed('queryParameters'),
        cancelToken: anyNamed('cancelToken'),
        onReceiveProgress: anyNamed('onReceiveProgress'),
      )).thenAnswer((_) async => Response(
        requestOptions: RequestOptions(path: '/projects/project-uuid-1/'),
        data: {
          'id': 'project-uuid-1',
          'name': 'DEO CRM',
          'client': {
            'id': 'client-uuid-1',
            'full_name': 'TechCorp',
          },
          'status': {
            'id': 'status-uuid-1',
            'name': 'В работе',
          },
          'progress': 65,
          'created_at': '2025-01-15T08:00:00Z',
          'updated_at': '2025-06-20T12:00:00Z',
        },
        statusCode: 200,
      ));

      final project = await projectsApi.get('project-uuid-1');

      expect(project.name, 'DEO CRM');
      expect(project.clientName, 'TechCorp');
      expect(project.progress, 65);
    });
  });
}
