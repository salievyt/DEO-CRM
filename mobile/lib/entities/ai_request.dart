class AIRequest {
  final String id;
  final String? templateId;
  final String? templateName;
  final Map<String, dynamic> inputData;
  final String? outputData;
  final String model;
  final int tokensUsed;
  final String status;
  final DateTime createdAt;
  final DateTime? completedAt;

  AIRequest({
    required this.id,
    this.templateId,
    this.templateName,
    this.inputData = const {},
    this.outputData,
    this.model = 'gpt-4',
    this.tokensUsed = 0,
    this.status = 'pending',
    required this.createdAt,
    this.completedAt,
  });

  factory AIRequest.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? templateData;
    if (json['template'] is Map) {
      templateData = json['template'] as Map<String, dynamic>;
    }

    return AIRequest(
      id: json['id'] as String,
      templateId: templateData?['id'] as String?,
      templateName: templateData?['name'] as String?,
      inputData: json['input_data'] as Map<String, dynamic>? ?? {},
      outputData: json['output_data'] as String?,
      model: json['model'] as String? ?? 'gpt-4',
      tokensUsed: (json['tokens_used'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? 'pending',
      createdAt: DateTime.parse(json['created_at'] as String),
      completedAt: json['completed_at'] != null ? DateTime.parse(json['completed_at'] as String) : null,
    );
  }
}
