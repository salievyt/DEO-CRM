class ProjectStatus {
  final String id;
  final String name;
  final int order;
  final String color;

  ProjectStatus({
    required this.id,
    required this.name,
    this.order = 0,
    this.color = '#6366f1',
  });

  factory ProjectStatus.fromJson(Map<String, dynamic> json) {
    return ProjectStatus(
      id: json['id'] as String,
      name: json['name'] as String,
      order: (json['order'] as num?)?.toInt() ?? 0,
      color: json['color'] as String? ?? '#6366f1',
    );
  }
}

class Project {
  final String id;
  final String name;
  final String clientId;
  final String? clientName;
  final String? serviceTypeId;
  final String? serviceTypeName;
  final double? budget;
  final double? cost;
  final DateTime? deadline;
  final String statusId;
  final String? statusName;
  final String? statusColor;
  final int progress;
  final String? description;
  final String? createdBy;
  final int tasksCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  Project({
    required this.id,
    required this.name,
    required this.clientId,
    this.clientName,
    this.serviceTypeId,
    this.serviceTypeName,
    this.budget,
    this.cost,
    this.deadline,
    required this.statusId,
    this.statusName,
    this.statusColor,
    this.progress = 0,
    this.description,
    this.createdBy,
    this.tasksCount = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Project.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? clientData;
    if (json['client'] is Map) {
      clientData = json['client'] as Map<String, dynamic>;
    }
    Map<String, dynamic>? statusData;
    if (json['status'] is Map) {
      statusData = json['status'] as Map<String, dynamic>;
    }
    Map<String, dynamic>? serviceData;
    if (json['service_type'] is Map) {
      serviceData = json['service_type'] as Map<String, dynamic>;
    }

    return Project(
      id: json['id'] as String,
      name: json['name'] as String,
      clientId: clientData?['id'] as String? ?? (json['client'] as String?) ?? '',
      clientName: clientData?['full_name'] as String? ?? clientData?['company_name'] as String?,
      serviceTypeId: serviceData?['id'] as String?,
      serviceTypeName: serviceData?['name'] as String?,
      budget: json['budget'] is String ? double.tryParse(json['budget'] as String) : (json['budget'] as num?)?.toDouble(),
      cost: json['cost'] is String ? double.tryParse(json['cost'] as String) : (json['cost'] as num?)?.toDouble(),
      deadline: json['deadline'] != null ? DateTime.tryParse(json['deadline'] as String) : null,
      statusId: statusData?['id'] as String? ?? (json['status'] as String?) ?? '',
      statusName: statusData?['name'] as String?,
      statusColor: statusData?['color'] as String?,
      progress: (json['progress'] as num?)?.toInt() ?? 0,
      description: json['description'] as String?,
      createdBy: json['created_by'] as String?,
      tasksCount: (json['tasks_count'] as num?)?.toInt() ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}

class ProjectTeamMember {
  final String id;
  final String projectId;
  final String userId;
  final String? userName;
  final String? userEmail;
  final String? userAvatar;
  final String roleInProject;
  final DateTime assignedAt;

  ProjectTeamMember({
    required this.id,
    required this.projectId,
    required this.userId,
    this.userName,
    this.userEmail,
    this.userAvatar,
    required this.roleInProject,
    required this.assignedAt,
  });

  factory ProjectTeamMember.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? userData;
    if (json['user'] is Map) {
      userData = json['user'] as Map<String, dynamic>;
    }

    return ProjectTeamMember(
      id: json['id'] as String,
      projectId: json['project'] as String? ?? '',
      userId: userData?['id'] as String? ?? (json['user'] as String?) ?? '',
      userName: userData?['full_name'] as String? ?? userData?['email'] as String?,
      userEmail: userData?['email'] as String?,
      userAvatar: userData?['avatar'] as String?,
      roleInProject: json['role_in_project'] as String,
      assignedAt: DateTime.parse(json['assigned_at'] as String),
    );
  }
}
