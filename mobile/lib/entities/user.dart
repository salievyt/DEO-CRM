class User {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String? phone;
  final String? avatar;
  final String? roleName;
  final String? roleId;
  final bool isActive;
  final bool is2faEnabled;
  final DateTime? lastLogin;
  final DateTime dateJoined;

  User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.phone,
    this.avatar,
    this.roleName,
    this.roleId,
    this.isActive = true,
    this.is2faEnabled = false,
    this.lastLogin,
    DateTime? dateJoined,
  }) : dateJoined = dateJoined ?? DateTime.now();

  String get fullName => '$firstName $lastName';

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      firstName: json['first_name'] as String? ?? '',
      lastName: json['last_name'] as String? ?? '',
      phone: json['phone'] as String?,
      avatar: json['avatar'] as String?,
      roleName: json['role_name'] as String?,
      roleId: json['role_id'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      is2faEnabled: json['is_2fa_enabled'] as bool? ?? false,
      lastLogin: json['last_login'] != null ? DateTime.parse(json['last_login'] as String) : null,
      dateJoined: json['date_joined'] != null ? DateTime.parse(json['date_joined'] as String) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'first_name': firstName,
    'last_name': lastName,
    'phone': phone,
    'avatar': avatar,
    'role_name': roleName,
    'role_id': roleId,
    'is_active': isActive,
    'is_2fa_enabled': is2faEnabled,
  };
}

class LoginRequest {
  final String email;
  final String password;

  LoginRequest({required this.email, required this.password});

  Map<String, dynamic> toJson() => {'email': email, 'password': password};
}

class RegisterRequest {
  final String email;
  final String password;
  final String firstName;
  final String lastName;

  RegisterRequest({
    required this.email,
    required this.password,
    required this.firstName,
    required this.lastName,
  });

  Map<String, dynamic> toJson() => {
    'email': email,
    'password': password,
    'first_name': firstName,
    'last_name': lastName,
  };
}

class LoginResponse {
  final String access;
  final String refresh;
  final User user;

  LoginResponse({
    required this.access,
    required this.refresh,
    required this.user,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      access: json['access'] as String,
      refresh: json['refresh'] as String,
      user: User.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}
