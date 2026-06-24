import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class CabinetScreen extends StatefulWidget {
  const CabinetScreen({super.key});

  @override
  State<CabinetScreen> createState() => _CabinetScreenState();
}

class _CabinetScreenState extends State<CabinetScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Мой кабинет'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Profile header
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const CircleAvatar(
                      radius: 48,
                      backgroundColor: AppColors.brand,
                      child: Text(
                        'АМ',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Администратор',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'admin@deostudio.com',
                      style: TextStyle(color: AppColors.surface500, fontSize: 14),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '+996 (700) 123-456',
                      style: TextStyle(color: AppColors.surface500, fontSize: 14),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.brand.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'Администратор',
                        style: TextStyle(
                          color: AppColors.brand,
                          fontWeight: FontWeight.w500,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Stats
            Row(
              children: [
                Expanded(
                  child: _CabinetStatCard(
                    icon: Icons.folder,
                    label: 'Проекты',
                    value: '12',
                    color: AppColors.brand,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _CabinetStatCard(
                    icon: Icons.checklist,
                    label: 'Задачи',
                    value: '48',
                    color: AppColors.success,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _CabinetStatCard(
                    icon: Icons.star,
                    label: 'Рейтинг',
                    value: '4.8',
                    color: AppColors.warning,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Info sections
            const Text(
              'Личная информация',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Card(
              child: Column(
                children: [
                  _InfoRow(label: 'Должность', value: 'Ведущий разработчик'),
                  const Divider(height: 1, indent: 16, endIndent: 16),
                  _InfoRow(label: 'Отдел', value: 'Разработка'),
                  const Divider(height: 1, indent: 16, endIndent: 16),
                  _InfoRow(label: 'Дата рождения', value: '15.03.1992'),
                  const Divider(height: 1, indent: 16, endIndent: 16),
                  _InfoRow(label: 'Телефон', value: '+996 (700) 123-456'),
                ],
              ),
            ),
            const SizedBox(height: 24),

            const Text(
              'Рабочая статистика',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Card(
              child: Column(
                children: [
                  _InfoRow(label: 'Завершённые проекты', value: '24'),
                  const Divider(height: 1, indent: 16, endIndent: 16),
                  _InfoRow(label: 'Выполненные задачи', value: '187'),
                  const Divider(height: 1, indent: 16, endIndent: 16),
                  _InfoRow(label: 'Клиентов привлёк', value: '15'),
                  const Divider(height: 1, indent: 16, endIndent: 16),
                  _InfoRow(label: 'В системе', value: '2 года 4 месяца'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CabinetStatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _CabinetStatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            Text(
              label,
              style: const TextStyle(color: AppColors.surface500, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.surface500, fontSize: 14)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
        ],
      ),
    );
  }
}
