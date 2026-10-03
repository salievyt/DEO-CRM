import 'package:flutter_test/flutter_test.dart';
import 'package:deo_crm_mobile/entities/project.dart';
import 'package:deo_crm_mobile/entities/task.dart';
import 'package:deo_crm_mobile/entities/lead.dart';
import 'package:deo_crm_mobile/entities/chat.dart';
import 'package:deo_crm_mobile/entities/finance.dart';

void main() {
  const created = '2026-10-03T10:00:00Z';
  test('project list accepts flat names and omitted detail fields', () {
    final project = Project.fromJson({
      'id': 'p',
      'name': 'CRM',
      'client_name': 'Клиент',
      'status_name': 'В работе',
      'status_color': '#123456',
      'budget': '15000.00',
      'created_at': created,
    });
    expect(project.clientName, 'Клиент');
    expect(project.statusName, 'В работе');
    expect(project.budget, 15000);
    expect(project.updatedAt, project.createdAt);
  });
  test('task list accepts flattened serializer response', () {
    final task = Task.fromJson({
      'id': 't',
      'title': 'Задача',
      'project_name': 'CRM',
      'assignee_name': 'Сотрудник',
      'status_name': 'Новая',
      'priority_name': 'Высокий',
      'created_at': created,
    });
    expect(task.projectName, 'CRM');
    expect(task.assigneeName, 'Сотрудник');
    expect(task.statusName, 'Новая');
    expect(task.priorityName, 'Высокий');
  });
  test('lead accepts DRF decimal strings and flat stage names', () {
    final lead = Lead.fromJson({
      'id': 'l',
      'budget': '1250.50',
      'stage_name': 'Новый',
      'assigned_to_name': 'Менеджер',
      'created_at': created,
    });
    expect(lead.budget, 1250.5);
    expect(lead.currentStageName, 'Новый');
    expect(lead.assignedToName, 'Менеджер');
  });
  test('chat accepts object last_message and flattened participants', () {
    final chat = Chat.fromJson({
      'id': 'c',
      'name': '',
      'display_name': 'Коллега',
      'last_message': {'content': 'Привет', 'created_at': created},
      'participants': [
        {
          'id': 'part',
          'user': 'u',
          'user_name': 'Коллега',
          'joined_at': created,
        },
      ],
    });
    expect(chat.name, 'Коллега');
    expect(chat.lastMessage, 'Привет');
    expect(chat.participants.single.userName, 'Коллега');
  });
  test('invoice accepts DRF decimal strings and list-only fields', () {
    final invoice = Invoice.fromJson({
      'id': 'i',
      'number': 'INV-1',
      'client_name': 'Клиент',
      'amount': '2500.00',
      'paid_amount': '500.00',
      'issued_date': '2026-10-01',
      'due_date': '2026-10-10',
      'created_at': created,
    });
    expect(invoice.remainingAmount, 2000);
    expect(invoice.clientName, 'Клиент');
  });
  test('finance summary reads actual backend field names', () {
    final summary = FinanceSummary.fromJson({
      'total_income': '5000.00',
      'expenses': '1200.00',
      'profit': '3800.00',
      'outstanding': '1000.00',
    });
    expect(summary.monthlyRevenue, 5000);
    expect(summary.monthlyExpenses, 1200);
    expect(summary.totalProfit, 3800);
    expect(summary.overdueAmount, 1000);
  });
}
