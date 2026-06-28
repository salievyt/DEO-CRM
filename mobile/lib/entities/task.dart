class TaskStatus {
  final String id;
  final String name;
  final int order;
  final String color;

  TaskStatus({
    required this.id,
    required this.name,
    this.order = 0,
    this.color = '#6366f1',
  });

  factory TaskStatus.fromJson(Map<String, dynamic> json) {
    return TaskStatus(
      id: json['id'] as String,
      name: json['name'] as String,
      order: (json['order'] as num?)?.toInt() ?? 0,
      color: json['color'] as String? ?? '#6366f1',
    );
  }
}

class TaskPriority {
  final String id;
  final String name;
  final int level;
  final String color;

  TaskPriority({
    required this.id,
    required this.name,
    this.level = 0,
    this.color = '#6366f1',
  });

  factory TaskPriority.fromJson(Map<String, dynamic> json) {
    return TaskPriority(
      id: json['id'] as String,
      name: json['name'] as String,
      level: (json['level'] as num?)?.toInt() ?? 0,
      color: json['color'] as String? ?? '#6366f1',
    );
  }
}

class Task {
  final String id;
  final String? parentTaskId;
  final String projectId;
  final String? projectName;
  final String title;
  final String description;
  final String? assigneeId;
  final String? assigneeName;
  final String? reviewerId;
  final String statusId;
  final String? statusName;
  final String? statusColor;
  final String? priorityId;
  final String? priorityName;
  final int? priorityLevel;
  final String? priorityColor;
  final DateTime? deadline;
  final double? estimatedHours;
  final double? actualHours;
  final String? createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  Task({
    required this.id,
    this.parentTaskId,
    required this.projectId,
    this.projectName,
    required this.title,
    this.description = '',
    this.assigneeId,
    this.assigneeName,
    this.reviewerId,
    required this.statusId,
    this.statusName,
    this.statusColor,
    this.priorityId,
    this.priorityName,
    this.priorityLevel,
    this.priorityColor,
    this.deadline,
    this.estimatedHours,
    this.actualHours,
    this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? projectData;
    if (json['project'] is Map) {
      projectData = json['project'] as Map<String, dynamic>;
    }
    Map<String, dynamic>? statusData;
    if (json['status'] is Map) {
      statusData = json['status'] as Map<String, dynamic>;
    }
    Map<String, dynamic>? priorityData;
    if (json['priority'] is Map) {
      priorityData = json['priority'] as Map<String, dynamic>;
    }
    Map<String, dynamic>? assigneeData;
    if (json['assignee'] is Map) {
      assigneeData = json['assignee'] as Map<String, dynamic>;
    }

    return Task(
      id: json['id'] as String,
      parentTaskId: json['parent_task'] as String?,
      projectId: projectData?['id'] as String? ?? (json['project'] as String?) ?? '',
      projectName: projectData?['name'] as String?,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      assigneeId: assigneeData?['id'] as String? ?? json['assignee'] as String?,
      assigneeName: assigneeData?['full_name'] as String?,
      reviewerId: json['reviewer'] as String?,
      statusId: statusData?['id'] as String? ?? (json['status'] as String?) ?? '',
      statusName: statusData?['name'] as String?,
      statusColor: statusData?['color'] as String?,
      priorityId: priorityData?['id'] as String?,
      priorityName: priorityData?['name'] as String?,
      priorityLevel: (priorityData?['level'] as num?)?.toInt(),
      priorityColor: priorityData?['color'] as String?,
      deadline: json['deadline'] != null ? DateTime.tryParse(json['deadline'] as String) : null,
      estimatedHours: json['estimated_hours'] is String ? double.tryParse(json['estimated_hours'] as String) : (json['estimated_hours'] as num?)?.toDouble(),
      actualHours: json['actual_hours'] is String ? double.tryParse(json['actual_hours'] as String) : (json['actual_hours'] as num?)?.toDouble(),
      createdBy: json['created_by'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}

class TaskComment {
  final String id;
  final String taskId;
  final String userId;
  final String? userName;
  final String? userAvatar;
  final String content;
  final String? parentCommentId;
  final DateTime createdAt;
  final DateTime updatedAt;

  TaskComment({
    required this.id,
    required this.taskId,
    required this.userId,
    this.userName,
    this.userAvatar,
    required this.content,
    this.parentCommentId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TaskComment.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? userData;
    if (json['user'] is Map) {
      userData = json['user'] as Map<String, dynamic>;
    }

    return TaskComment(
      id: json['id'] as String,
      taskId: json['task'] as String? ?? '',
      userId: userData?['id'] as String? ?? (json['user'] as String?) ?? '',
      userName: userData?['full_name'] as String? ?? userData?['email'] as String?,
      userAvatar: userData?['avatar'] as String?,
      content: json['content'] as String,
      parentCommentId: json['parent_comment'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}
