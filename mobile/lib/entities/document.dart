class Document {
  final String id;
  final String? documentTypeId;
  final String? documentTypeName;
  final String? clientId;
  final String? clientName;
  final String? projectId;
  final String? projectName;
  final String title;
  final String fileUrl;
  final String fileName;
  final String? mimeType;
  final int fileSize;
  final String status;
  final String? createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  Document({
    required this.id,
    this.documentTypeId,
    this.documentTypeName,
    this.clientId,
    this.clientName,
    this.projectId,
    this.projectName,
    required this.title,
    required this.fileUrl,
    this.fileName = '',
    this.mimeType,
    this.fileSize = 0,
    this.status = 'draft',
    this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  String get formattedSize {
    if (fileSize < 1024) return '$fileSize B';
    if (fileSize < 1024 * 1024) return '${(fileSize / 1024).toStringAsFixed(0)} KB';
    return '${(fileSize / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  factory Document.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? typeData;
    if (json['document_type'] is Map) {
      typeData = json['document_type'] as Map<String, dynamic>;
    }
    Map<String, dynamic>? projectData;
    if (json['project'] is Map) {
      projectData = json['project'] as Map<String, dynamic>;
    }

    return Document(
      id: json['id'] as String,
      documentTypeId: typeData?['id'] as String?,
      documentTypeName: typeData?['name'] as String?,
      clientId: json['client'] as String?,
      projectId: projectData?['id'] as String?,
      projectName: projectData?['name'] as String?,
      title: json['title'] as String,
      fileUrl: json['file_url'] as String,
      fileName: json['file_name'] as String? ?? '',
      mimeType: json['mime_type'] as String?,
      fileSize: (json['file_size'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? 'draft',
      createdBy: json['created_by'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}
