import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/data/auth_providers.dart';

class CabinetScreen extends ConsumerWidget {
  const CabinetScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final user = authState.whenOrNull(data: (u) => u);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Мой кабинет'),
        actions: [
          IconButton(icon: const Icon(Icons.edit_outlined), onPressed: () {}),
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
                    CircleAvatar(
                      radius: 48,
                      backgroundColor: const Color(0xFF6366F1),
                      child: Text(
                        user != null
                            ? '${user.firstName.isNotEmpty ? user.firstName[0] : ''}${user.lastName.isNotEmpty ? user.lastName[0] : ''}'
                            : 'D',
                        style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      user?.fullName ?? 'Пользователь',
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      user?.email ?? '',
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 14),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF6366F1).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        user?.roleName ?? 'Пользователь',
                        style: const TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.w500, fontSize: 13),
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
                Expanded(child: _CabinetStatCard(icon: Icons.folder, label: 'Проекты', value: '—', color: const Color(0xFF6366F1))),
                const SizedBox(width: 8),
                Expanded(child: _CabinetStatCard(icon: Icons.checklist, label: 'Задачи', value: '—', color: const Color(0xFF22C55E))),
                const SizedBox(width: 8),
                Expanded(child: _CabinetStatCard(icon: Icons.star, label: 'Роль', value: user?.roleName ?? '—', color: const Color(0xFFF59E0B))),
              ],
            ),
            const SizedBox(height: 24),

            const Text('Личная информация', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Card(
              child: Column(
                children: [
                  _InfoRow(label: 'Email', value: user?.email ?? '—'),
                  const Divider(height: 1, indent: 16, endIndent: 16),
                  _InfoRow(label: 'Имя', value: user?.fullName ?? '—'),
                  const Divider(height: 1, indent: 16, endIndent: 16),
                  _InfoRow(label: 'Телефон', value: user?.phone ?? '—'),
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

  const _CabinetStatCard({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
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
          Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 14)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
        ],
      ),
    );
  }
}
