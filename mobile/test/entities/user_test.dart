import 'package:flutter_test/flutter_test.dart';
import 'package:deo_crm_mobile/entities/user.dart';

void main() {
  group('User.fromJson', () {
    test('parses full user JSON correctly', () {
      final json = {
        'id': '550e8400-e29b-41d4-a716-446655440000',
        'email': 'test@deostudio.com',
        'first_name': 'Иван',
        'last_name': 'Петров',
        'phone': '+996700123456',
        'avatar': 'https://example.com/avatar.jpg',
        'role_name': 'admin',
        'role_id': 'role-uuid-1',
        'is_active': true,
        'is_2fa_enabled': false,
        'last_login': '2025-06-25T10:00:00Z',
        'date_joined': '2024-01-15T08:00:00Z',
      };

      final user = User.fromJson(json);

      expect(user.id, '550e8400-e29b-41d4-a716-446655440000');
      expect(user.email, 'test@deostudio.com');
      expect(user.firstName, 'Иван');
      expect(user.lastName, 'Петров');
      expect(user.phone, '+996700123456');
      expect(user.avatar, 'https://example.com/avatar.jpg');
      expect(user.roleName, 'admin');
      expect(user.roleId, 'role-uuid-1');
      expect(user.isActive, isTrue);
      expect(user.is2faEnabled, isFalse);
      expect(user.fullName, 'Иван Петров');
      expect(user.lastLogin, DateTime.utc(2025, 6, 25, 10, 0, 0));
      expect(user.dateJoined, DateTime.utc(2024, 1, 15, 8, 0, 0));
    });

    test('handles missing optional fields with defaults', () {
      final json = {
        'id': '550e8400-e29b-41d4-a716-446655440000',
        'email': 'test@deostudio.com',
        'first_name': 'Анна',
        'last_name': 'Сидорова',
      };

      final user = User.fromJson(json);

      expect(user.id, '550e8400-e29b-41d4-a716-446655440000');
      expect(user.email, 'test@deostudio.com');
      expect(user.firstName, 'Анна');
      expect(user.lastName, 'Сидорова');
      expect(user.phone, isNull);
      expect(user.avatar, isNull);
      expect(user.roleName, isNull);
      expect(user.isActive, isTrue);
      expect(user.is2faEnabled, isFalse);
      expect(user.lastLogin, isNull);
    });

    test('handles empty first_name and last_name', () {
      final json = {
        'id': '550e8400-e29b-41d4-a716-446655440000',
        'email': 'test@deostudio.com',
        'first_name': '',
        'last_name': '',
      };

      final user = User.fromJson(json);

      expect(user.firstName, '');
      expect(user.lastName, '');
      expect(user.fullName, ' ');
    });
  });

  group('User.toJson', () {
    test('serializes User back to JSON correctly', () {
      final user = User(
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@deostudio.com',
        firstName: 'Иван',
        lastName: 'Петров',
        phone: '+996700123456',
        roleName: 'admin',
        isActive: true,
        is2faEnabled: false,
      );

      final json = user.toJson();

      expect(json['id'], '550e8400-e29b-41d4-a716-446655440000');
      expect(json['email'], 'test@deostudio.com');
      expect(json['first_name'], 'Иван');
      expect(json['last_name'], 'Петров');
      expect(json['phone'], '+996700123456');
      expect(json['role_name'], 'admin');
      expect(json['is_active'], isTrue);
      expect(json['is_2fa_enabled'], isFalse);
    });
  });

  group('LoginResponse.fromJson', () {
    test('parses login response correctly', () {
      final json = {
        'access': 'access-token-123',
        'refresh': 'refresh-token-456',
        'user': {
          'id': '550e8400-e29b-41d4-a716-446655440000',
          'email': 'test@deostudio.com',
          'first_name': 'Иван',
          'last_name': 'Петров',
        },
      };

      final response = LoginResponse.fromJson(json);

      expect(response.access, 'access-token-123');
      expect(response.refresh, 'refresh-token-456');
      expect(response.user.email, 'test@deostudio.com');
      expect(response.user.firstName, 'Иван');
    });
  });

  group('RegisterRequest.toJson', () {
    test('serializes correctly', () {
      final request = RegisterRequest(
        email: 'new@deostudio.com',
        password: 'securePass123',
        firstName: 'Анна',
        lastName: 'Смирнова',
      );

      final json = request.toJson();

      expect(json['email'], 'new@deostudio.com');
      expect(json['password'], 'securePass123');
      expect(json['first_name'], 'Анна');
      expect(json['last_name'], 'Смирнова');
    });
  });
}
