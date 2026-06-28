import 'package:flutter_test/flutter_test.dart';
import 'package:deo_crm_mobile/entities/task.dart';

void main() {
  group('Task.fromJson', () {
    test('parses full task JSON with nested objects', () {
      final json = {
        'id': 'task-uuid-1',
        'project': {
          'id': 'project-uuid-1',
          'name': 'DEO CRM',
        },
        'title': 'Реализовать API аутентификации',
        'description': 'Нужно реализовать JWT аутентификацию с refresh токенами',
        'assignee': {
          'id': 'user-uuid-1',
          'full_name': 'Иван Петров',
        },
        'status': {
          'id': 'status-uuid-1',
          'name': 'В работе',
          'color': '#6366f1',
        },
        'priority': {
          'id': 'priority-uuid-1',
          'name': 'Высокий',
          'color': '#ef4444',
          'level': 1,
        },
        'deadline': '2025-07-15',
        'estimated_hours': '24.0',
        'actual_hours': '18.5',
        'created_at': '2025-06-10T08:00:00Z',
        'updated_at': '2025-06-20T12:00:00Z',
      };

      final task = Task.fromJson(json);

      expect(task.id, 'task-uuid-1');
      expect(task.projectName, 'DEO CRM');
      expect(task.title, 'Реализовать API аутентификации');
      expect(task.description, 'Нужно реализовать JWT аутентификацию с refresh токенами');
      expect(task.assigneeName, 'Иван Петров');
      expect(task.statusName, 'В работе');
      expect(task.priorityName, 'Высокий');
      expect(task.priorityLevel, 1);
      expect(task.deadline, DateTime(2025, 7, 15));
      expect(task.estimatedHours, 24.0);
      expect(task.actualHours, 18.5);
    });

    test('handles minimal task JSON', () {
      final json = {
        'id': 'task-uuid-2',
        'project': 'project-uuid-2',
        'title': 'Простая задача',
        'status': 'status-uuid-2',
        'created_at': '2025-06-10T08:00:00Z',
        'updated_at': '2025-06-20T12:00:00Z',
      };

      final task = Task.fromJson(json);

      expect(task.id, 'task-uuid-2');
      expect(task.title, 'Простая задача');
      expect(task.description, '');
      expect(task.assigneeName, isNull);
      expect(task.statusName, isNull);
      expect(task.priorityName, isNull);
      expect(task.deadline, isNull);
    });
  });

  group('TaskStatus.fromJson', () {
    test('parses status correctly', () {
      final json = {
        'id': 'status-uuid-1',
        'name': 'Выполнена',
        'order': 4,
        'color': '#22c55e',
      };

      final status = TaskStatus.fromJson(json);

      expect(status.id, 'status-uuid-1');
      expect(status.name, 'Выполнена');
      expect(status.order, 4);
      expect(status.color, '#22c55e');
    });
  });

  group('TaskPriority.fromJson', () {
    test('parses priority correctly', () {
      final json = {
        'id': 'priority-uuid-1',
        'name': 'Critical',
        'level': 0,
        'color': '#ef4444',
      };

      final priority = TaskPriority.fromJson(json);

      expect(priority.name, 'Critical');
      expect(priority.level, 0);
    });
  });

  group('TaskComment.fromJson', () {
    test('parses comment with nested user', () {
      final json = {
        'id': 'comment-uuid-1',
        'task': 'task-uuid-1',
        'user': {
          'id': 'user-uuid-1',
          'full_name': 'Иван Петров',
        },
        'content': 'Готово, проверяйте',
        'created_at': '2025-06-15T10:00:00Z',
        'updated_at': '2025-06-15T10:00:00Z',
      };

      final comment = TaskComment.fromJson(json);

      expect(comment.id, 'comment-uuid-1');
      expect(comment.userName, 'Иван Петров');
      expect(comment.content, 'Готово, проверяйте');
    });
  });
}
