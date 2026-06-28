class Client {
  final String id;
  final String firstName;
  final String lastName;
  final String companyName;
  final String phone;
  final String email;
  final String? telegram;
  final String? whatsapp;
  final String? address;
  final String source;
  final String? notes;
  final bool isActive;
  final String? createdBy;
  final double totalRevenue;
  final int totalProjects;
  final DateTime createdAt;
  final DateTime updatedAt;

  Client({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.companyName = '',
    required this.phone,
    this.email = '',
    this.telegram,
    this.whatsapp,
    this.address,
    this.source = 'other',
    this.notes,
    this.isActive = true,
    this.createdBy,
    this.totalRevenue = 0,
    this.totalProjects = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  String get fullName => '$lastName $firstName';

  factory Client.fromJson(Map<String, dynamic> json) {
    return Client(
      id: json['id'] as String,
      firstName: json['first_name'] as String? ?? '',
      lastName: json['last_name'] as String? ?? '',
      companyName: json['company_name'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      email: json['email'] as String? ?? '',
      telegram: json['telegram'] as String?,
      whatsapp: json['whatsapp'] as String?,
      address: json['address'] as String?,
      source: json['source'] as String? ?? 'other',
      notes: json['notes'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      createdBy: json['created_by'] as String?,
      totalRevenue: (json['total_revenue'] as num?)?.toDouble() ?? 0,
      totalProjects: (json['total_projects'] as num?)?.toInt() ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}

class ClientTag {
  final String id;
  final String name;
  final String color;

  ClientTag({required this.id, required this.name, this.color = '#6366f1'});

  factory ClientTag.fromJson(Map<String, dynamic> json) {
    return ClientTag(
      id: json['id'] as String,
      name: json['name'] as String,
      color: json['color'] as String? ?? '#6366f1',
    );
  }
}

class ClientInteraction {
  final String id;
  final String clientId;
  final String? userId;
  final String type;
  final String description;
  final String? userName;
  final DateTime createdAt;

  ClientInteraction({
    required this.id,
    required this.clientId,
    this.userId,
    required this.type,
    required this.description,
    this.userName,
    required this.createdAt,
  });

  factory ClientInteraction.fromJson(Map<String, dynamic> json) {
    return ClientInteraction(
      id: json['id'] as String,
      clientId: json['client'] is Map ? (json['client'] as Map)['id'] as String : (json['client'] as String),
      userId: json['user'] as String?,
      type: json['type'] as String,
      description: json['description'] as String,
      userName: json['user_name'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
