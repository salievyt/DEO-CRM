import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Чат'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          // Search
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Поиск в чатах...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {});
                        },
                      )
                    : null,
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),

          // Chats
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _chats.length,
              itemBuilder: (context, index) {
                final chat = _chats[index];
                return _ChatCard(chat: chat);
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatCard extends StatelessWidget {
  final _ChatData chat;

  const _ChatCard({required this.chat});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () {},
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 24,
                backgroundColor: chat.color.withValues(alpha: 0.1),
                child: Text(
                  chat.name[0],
                  style: TextStyle(
                    color: chat.color,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          chat.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                          ),
                        ),
                        Text(
                          chat.time,
                          style: const TextStyle(
                            color: AppColors.surface400,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      chat.lastMessage,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: chat.unread ? AppColors.surface900 : AppColors.surface500,
                        fontWeight: chat.unread ? FontWeight.w500 : FontWeight.normal,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              if (chat.unread)
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppColors.brand,
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChatData {
  final String name;
  final String lastMessage;
  final String time;
  final bool unread;
  final Color color;

  const _ChatData({
    required this.name,
    required this.lastMessage,
    required this.time,
    required this.unread,
    required this.color,
  });
}

final _chats = [
  _ChatData(
    name: 'Анна Петрова',
    lastMessage: 'Отлично, жду утверждения макета',
    time: '12:30',
    unread: true,
    color: AppColors.brand,
  ),
  _ChatData(
    name: 'Проект DEO CRM',
    lastMessage: 'Иван: Новые требования готовы',
    time: '11:15',
    unread: true,
    color: AppColors.success,
  ),
  _ChatData(
    name: 'Максим Иванов',
    lastMessage: 'Созвонимся завтра в 10?',
    time: '10:45',
    unread: false,
    color: AppColors.warning,
  ),
  _ChatData(
    name: 'TechCorp Team',
    lastMessage: 'Елена: Деплой на staging прошёл',
    time: '09:20',
    unread: true,
    color: AppColors.info,
  ),
  _ChatData(
    name: 'Дизайн-отдел',
    lastMessage: 'Обновил гайдлайны в Figma',
    time: 'Вчера',
    unread: false,
    color: AppColors.danger,
  ),
  _ChatData(
    name: 'Сергей Козлов',
    lastMessage: 'Спасибо за помощь!',
    time: 'Вчера',
    unread: false,
    color: AppColors.surface500,
  ),
  _ChatData(
    name: 'StartupX',
    lastMessage: 'Алексей: Сроки немного сдвигаются',
    time: 'Вчера',
    unread: false,
    color: AppColors.brand,
  ),
];
