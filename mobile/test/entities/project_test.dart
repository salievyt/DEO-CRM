import 'package:flutter_test/flutter_test.dart';
import 'package:deo_crm_mobile/entities/project.dart';

void main() {
  group('Project.fromJson', () {
    test('parses full project JSON with nested objects', () {
      final json = {
        'id': 'project-uuid-1',
        'name': 'Разработка DEO CRM',
        'client': {
          'id': 'client-uuid-1',
          'full_name': 'ООО ТехКорп',
          'company_name': 'TechCorp',
        },
        'service_type': {
          'id': 'svc-uuid-1',
          'name': 'Web Development',
        },
        'budget': 2500000.00,
        'cost': 1800000.00,
        'deadline': '2025-12-31',
        'status': {
          'id': 'status-uuid-1',
          'name': 'В работе',
          'color': '#6366f1',
        },
        'progress': 65,
        'description': 'Разработка CRM системы для управления проектами',
        'created_by': 'user-uuid-1',
        'created_at': '2025-01-15T08:00:00Z',
        'updated_at': '2025-06-20T12:00:00Z',
      };

      final project = Project.fromJson(json);

      expect(project.id, 'project-uuid-1');
      expect(project.name, 'Разработка DEO CRM');
      expect(project.clientId, 'client-uuid-1');
      expect(project.clientName, 'ООО ТехКорп');
      expect(project.serviceTypeName, 'Web Development');
      expect(project.budget, 2500000.00);
      expect(project.cost, 1800000.00);
      expect(project.deadline, DateTime(2025, 12, 31));
      expect(project.statusName, 'В работе');
      expect(project.statusId, 'status-uuid-1');
      expect(project.statusColor, '#6366f1');
      expect(project.progress, 65);
      expect(project.description, 'Разработка CRM системы для управления проектами');
    });

    test('parses project with flat client/status references', () {
      final json = {
        'id': 'project-uuid-2',
        'name': 'Сайт компании',
        'client': 'client-uuid-2',
        'status': 'status-uuid-2',
        'budget': 500000.00,
        'progress': 30,
        'created_at': '2025-06-01T08:00:00Z',
        'updated_at': '2025-06-20T12:00:00Z',
      };

      final project = Project.fromJson(json);

      expect(project.clientId, 'client-uuid-2');
      expect(project.clientName, isNull);
      expect(project.statusName, isNull);
      expect(project.budget, 500000.00);
      expect(project.progress, 30);
    });

    test('handles null optional fields', () {
      final json = {
        'id': 'project-uuid-3',
        'name': 'Тестовый проект',
        'client': 'client-uuid-3',
        'status': 'status-uuid-3',
        'created_at': '2025-06-01T08:00:00Z',
        'updated_at': '2025-06-20T12:00:00Z',
      };

      final project = Project.fromJson(json);

      expect(project.budget, isNull);
      expect(project.cost, isNull);
      expect(project.deadline, isNull);
      expect(project.serviceTypeName, isNull);
      expect(project.description, isNull);
      expect(project.progress, 0);
    });
  });

  group('ProjectTeamMember.fromJson', () {
    test('parses team member with nested user', () {
      final json = {
        'id': 'member-uuid-1',
        'project': 'project-uuid-1',
        'user': {
          'id': 'user-uuid-1',
          'full_name': 'Иван Петров',
          'email': 'ivan@deostudio.com',
          'avatar': 'https://example.com/avatar.jpg',
        },
        'role_in_project': 'developer',
        'assigned_at': '2025-01-15T08:00:00Z',
      };

      final member = ProjectTeamMember.fromJson(json);

      expect(member.id, 'member-uuid-1');
      expect(member.userId, 'user-uuid-1');
      expect(member.userName, 'Иван Петров');
      expect(member.userEmail, 'ivan@deostudio.com');
      expect(member.roleInProject, 'developer');
    });
  });
}
