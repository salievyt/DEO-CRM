class AppNotification {
  final String id;
  final String title;
  final String? message;
  final String? type;
  final String? link;
  final bool read;
  final DateTime createdAt;

  AppNotification({
    required this.id,
    required this.title,
    this.message,
    this.type,
    this.link,
    this.read = false,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      title: json['title'] as String,
      message: json['message'] as String?,
      type: json['type'] as String?,
      link: json['link'] as String?,
      read: json['read'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
