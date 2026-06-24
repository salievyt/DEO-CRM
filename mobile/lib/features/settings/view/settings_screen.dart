import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notificationsEnabled = true;
  bool _emailNotifications = true;
  bool _darkMode = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Настройки'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Profile section
          Card(
            child: InkWell(
              onTap: () {},
              borderRadius: BorderRadius.circular(12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const CircleAvatar(
                      radius: 30,
                      backgroundColor: AppColors.brand,
                      child: Text(
                        'АМ',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Администратор',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'admin@deostudio.com',
                            style: TextStyle(color: AppColors.surface500, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: AppColors.surface400),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Settings sections
          const Text(
            'Уведомления',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.surface500),
          ),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                SwitchListTile(
                  title: const Text('Push-уведомления'),
                  subtitle: const Text('Всплывающие уведомления в приложении'),
                  value: _notificationsEnabled,
                  onChanged: (v) => setState(() => _notificationsEnabled = v),
                  activeTrackColor: AppColors.brand,
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                SwitchListTile(
                  title: const Text('Email-уведомления'),
                  subtitle: const Text('Уведомления на почту о задачах'),
                  value: _emailNotifications,
                  onChanged: (v) => setState(() => _emailNotifications = v),
                  activeTrackColor: AppColors.brandLight,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          const Text(
            'Внешний вид',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.surface500),
          ),
          const SizedBox(height: 8),
          Card(
            child: SwitchListTile(
              title: const Text('Тёмная тема'),
              subtitle: const Text('Переключить на тёмную тему оформления'),
              value: _darkMode,
              onChanged: (v) => setState(() => _darkMode = v),
              activeTrackColor: AppColors.brand,
            ),
          ),
          const SizedBox(height: 24),

          const Text(
            'Прочее',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.surface500),
          ),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.language, color: AppColors.brand),
                  title: const Text('Язык'),
                  subtitle: const Text('Русский'),
                  trailing: const Icon(Icons.chevron_right, color: AppColors.surface400),
                  onTap: () {},
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                ListTile(
                  leading: const Icon(Icons.security, color: AppColors.brand),
                  title: const Text('Безопасность'),
                  subtitle: const Text('Биометрия, PIN-код'),
                  trailing: const Icon(Icons.chevron_right, color: AppColors.surface400),
                  onTap: () {},
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                ListTile(
                  leading: const Icon(Icons.cloud_download, color: AppColors.brand),
                  title: const Text('Хранилище'),
                  subtitle: const Text('Кэш: 24.5 MB'),
                  trailing: const Icon(Icons.chevron_right, color: AppColors.surface400),
                  onTap: () {},
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                ListTile(
                  leading: const Icon(Icons.info_outline, color: AppColors.brand),
                  title: const Text('О приложении'),
                  subtitle: const Text('Версия 1.0.0'),
                  trailing: const Icon(Icons.chevron_right, color: AppColors.surface400),
                  onTap: () {},
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Logout
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => context.go('/login'),
              icon: const Icon(Icons.logout, color: AppColors.danger),
              label: const Text('Выйти', style: TextStyle(color: AppColors.danger)),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: AppColors.danger.withValues(alpha: 0.3)),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
