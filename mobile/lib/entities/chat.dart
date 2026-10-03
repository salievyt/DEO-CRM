class Chat {
  final String id;
  final String name;
  final String? projectId;
  final bool isGroup;
  final String? lastMessage;
  final String? lastMessageTime;
  final DateTime? lastMessageAt;
  final int unreadCount;
  final List<ChatParticipant> participants;
  final String createdBy;
  final String? avatarUrl;
  final String? color;

  Chat({
    required this.id,
    this.name = '',
    this.projectId,
    this.isGroup = false,
    this.lastMessage,
    this.lastMessageTime,
    this.lastMessageAt,
    this.unreadCount = 0,
    this.participants = const [],
    required this.createdBy,
    this.avatarUrl,
    this.color,
  });

  factory Chat.fromJson(Map<String, dynamic> json) {
    return Chat(
      id: json['id'] as String,
      name: json['display_name'] as String? ?? json['name'] as String? ?? '',
      projectId: json['project'] as String?,
      isGroup: json['is_group'] as bool? ?? false,
      lastMessage: json['last_message'] is Map
          ? (json['last_message'] as Map)['content'] as String?
          : json['last_message'] as String?,
      lastMessageTime: json['last_message_time'] as String?,
      lastMessageAt: DateTime.tryParse(
        (json['last_message'] is Map
                    ? (json['last_message'] as Map)['created_at']
                    : json['last_message_at'])
                as String? ??
            '',
      ),
      unreadCount: (json['unread_count'] as num?)?.toInt() ?? 0,
      participants:
          (json['participants'] as List<dynamic>?)
              ?.map((e) => ChatParticipant.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      createdBy: json['created_by'] as String? ?? '',
      avatarUrl: json['avatar_url'] as String?,
      color: json['color'] as String?,
    );
  }
}

class ChatParticipant {
  final String id;
  final String userId;
  final String? userName;
  final String? userEmail;
  final String? userAvatar;
  final DateTime joinedAt;
  final DateTime? lastReadAt;

  ChatParticipant({
    required this.id,
    required this.userId,
    this.userName,
    this.userEmail,
    this.userAvatar,
    required this.joinedAt,
    this.lastReadAt,
  });

  factory ChatParticipant.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? userData;
    if (json['user'] is Map) {
      userData = json['user'] as Map<String, dynamic>;
    }

    return ChatParticipant(
      id: json['id'] as String,
      userId: userData?['id'] as String? ?? (json['user'] as String?) ?? '',
      userName:
          json['user_name'] as String? ?? userData?['full_name'] as String?,
      userEmail: userData?['email'] as String?,
      userAvatar:
          json['user_avatar'] as String? ?? userData?['avatar'] as String?,
      joinedAt: DateTime.parse(json['joined_at'] as String),
      lastReadAt: json['last_read_at'] != null
          ? DateTime.parse(json['last_read_at'] as String)
          : null,
    );
  }
}

class Message {
  final String id;
  final String chatId;
  final String senderId;
  final String? senderName;
  final String? senderAvatar;
  final String content;
  final String? fileUrl;
  final String? fileName;
  final String? voiceUrl;
  final int? voiceDuration;
  final String? replyToId;
  final DateTime? editedAt;
  final DateTime createdAt;

  Message({
    required this.id,
    required this.chatId,
    required this.senderId,
    this.senderName,
    this.senderAvatar,
    required this.content,
    this.fileUrl,
    this.fileName,
    this.voiceUrl,
    this.voiceDuration,
    this.replyToId,
    this.editedAt,
    required this.createdAt,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? senderData;
    if (json['sender'] is Map) {
      senderData = json['sender'] as Map<String, dynamic>;
    }

    return Message(
      id: json['id'] as String,
      chatId: json['chat'] as String? ?? '',
      senderId:
          senderData?['id'] as String? ?? (json['sender'] as String?) ?? '',
      senderName:
          json['sender_name'] as String? ?? senderData?['full_name'] as String?,
      senderAvatar:
          json['sender_avatar'] as String? ?? senderData?['avatar'] as String?,
      content: json['content'] as String? ?? '',
      fileUrl: json['file_url'] as String?,
      fileName: json['file_name'] as String?,
      voiceUrl: json['voice_url'] as String?,
      voiceDuration: (json['voice_duration'] as num?)?.toInt(),
      replyToId: json['reply_to'] as String?,
      editedAt: json['edited_at'] != null
          ? DateTime.parse(json['edited_at'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
