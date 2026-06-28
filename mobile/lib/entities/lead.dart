class LeadStage {
  final String id;
  final String name;
  final int order;
  final int probability;
  final String color;
  final int leadCount;

  LeadStage({
    required this.id,
    required this.name,
    this.order = 0,
    this.probability = 0,
    this.color = '#6366f1',
    this.leadCount = 0,
  });

  factory LeadStage.fromJson(Map<String, dynamic> json) {
    return LeadStage(
      id: json['id'] as String,
      name: json['name'] as String,
      order: (json['order'] as num?)?.toInt() ?? 0,
      probability: (json['probability'] as num?)?.toInt() ?? 0,
      color: json['color'] as String? ?? '#6366f1',
      leadCount: (json['lead_count'] as num?)?.toInt() ?? 0,
    );
  }
}

class Lead {
  final String id;
  final String? clientId;
  final String contactName;
  final String companyName;
  final String phone;
  final String email;
  final String? telegram;
  final String source;
  final double? budget;
  final String currentStageId;
  final String? currentStageName;
  final String? currentStageColor;
  final String? assignedTo;
  final String? assignedToName;
  final String? createdBy;
  final String? notes;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  Lead({
    required this.id,
    this.clientId,
    required this.contactName,
    this.companyName = '',
    required this.phone,
    this.email = '',
    this.telegram,
    this.source = 'other',
    this.budget,
    required this.currentStageId,
    this.currentStageName,
    this.currentStageColor,
    this.assignedTo,
    this.assignedToName,
    this.createdBy,
    this.notes,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Lead.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? stageData;
    if (json['current_stage'] is Map) {
      stageData = json['current_stage'] as Map<String, dynamic>;
    }
    Map<String, dynamic>? assigneeData;
    if (json['assigned_to'] is Map) {
      assigneeData = json['assigned_to'] as Map<String, dynamic>;
    }

    return Lead(
      id: json['id'] as String,
      clientId: json['client'] is Map ? (json['client'] as Map)['id'] as String : json['client'] as String?,
      contactName: json['contact_name'] as String? ?? '',
      companyName: json['company_name'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      email: json['email'] as String? ?? '',
      telegram: json['telegram'] as String?,
      source: json['source'] as String? ?? 'other',
      budget: (json['budget'] as num?)?.toDouble(),
      currentStageId: stageData?['id'] as String? ?? (json['current_stage'] as String?) ?? '',
      currentStageName: stageData?['name'] as String?,
      currentStageColor: stageData?['color'] as String?,
      assignedTo: assigneeData?['id'] as String? ?? json['assigned_to'] as String?,
      assignedToName: assigneeData?['full_name'] as String? ?? assigneeData?['email'] as String?,
      createdBy: json['created_by'] as String?,
      notes: json['notes'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}

class LeadKanbanData {
  final List<LeadStage> stages;
  final Map<String, List<Lead>> leadsByStage;

  LeadKanbanData({required this.stages, required this.leadsByStage});
}
