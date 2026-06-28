import 'package:flutter_test/flutter_test.dart';
import 'package:deo_crm_mobile/entities/client.dart';

void main() {
  group('Client.fromJson', () {
    test('parses full client JSON correctly', () {
      final json = {
        'id': 'client-uuid-1',
        'first_name': 'Иван',
        'last_name': 'Петров',
        'company_name': 'ООО ТехКорп',
        'phone': '+996700123456',
        'email': 'ivan@techcorp.com',
        'telegram': '@ivan_p',
        'source': 'website',
        'notes': 'Постоянный клиент',
        'is_active': true,
        'created_at': '2025-01-15T08:00:00Z',
        'updated_at': '2025-06-20T12:00:00Z',
      };

      final client = Client.fromJson(json);

      expect(client.id, 'client-uuid-1');
      expect(client.firstName, 'Иван');
      expect(client.lastName, 'Петров');
      expect(client.fullName, 'Петров Иван');
      expect(client.companyName, 'ООО ТехКорп');
      expect(client.phone, '+996700123456');
      expect(client.email, 'ivan@techcorp.com');
      expect(client.telegram, '@ivan_p');
      expect(client.source, 'website');
      expect(client.notes, 'Постоянный клиент');
      expect(client.isActive, isTrue);
    });

    test('handles minimal client JSON', () {
      final json = {
        'id': 'client-uuid-2',
        'first_name': 'Анна',
        'last_name': 'Смирнова',
        'phone': '+996700789012',
        'created_at': '2025-06-01T08:00:00Z',
        'updated_at': '2025-06-20T12:00:00Z',
      };

      final client = Client.fromJson(json);

      expect(client.companyName, '');
      expect(client.email, '');
      expect(client.telegram, isNull);
      expect(client.source, 'other');
      expect(client.notes, isNull);
    });
  });

  group('ClientInteraction.fromJson', () {
    test('parses interaction correctly', () {
      final json = {
        'id': 'interaction-uuid-1',
        'client': 'client-uuid-1',
        'type': 'call',
        'description': 'Обсудили требования к проекту',
        'created_at': '2025-06-15T10:00:00Z',
      };

      final interaction = ClientInteraction.fromJson(json);

      expect(interaction.id, 'interaction-uuid-1');
      expect(interaction.clientId, 'client-uuid-1');
      expect(interaction.type, 'call');
      expect(interaction.description, 'Обсудили требования к проекту');
    });
  });

  group('ClientTag.fromJson', () {
    test('parses tag correctly', () {
      final json = {
        'id': 'tag-uuid-1',
        'name': 'VIP',
        'color': '#f59e0b',
      };

      final tag = ClientTag.fromJson(json);

      expect(tag.id, 'tag-uuid-1');
      expect(tag.name, 'VIP');
      expect(tag.color, '#f59e0b');
    });
  });
}
