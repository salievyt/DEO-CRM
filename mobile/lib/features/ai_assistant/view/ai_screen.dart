import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/ai_api.dart';
import '../../../entities/ai_request.dart';

final _aiHistoryProvider = FutureProvider.autoDispose<List<AIRequest>>((ref) async {
  return await ref.read(aiApiProvider).getHistory();
});

class AIScreen extends ConsumerStatefulWidget {
  const AIScreen({super.key});

  @override
  ConsumerState<AIScreen> createState() => _AIScreenState();
}

class _AIScreenState extends ConsumerState<AIScreen> {
  String? _selectedType;

  @override
  Widget build(BuildContext context) {
    final historyAsync = ref.watch(_aiHistoryProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('DEO AI')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF6366F1).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.auto_awesome, color: Color(0xFF6366F1), size: 24),
                        ),
                        const SizedBox(width: 12),
                        const Text('Что сгенерировать?', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _TypeChip(label: 'ТЗ', value: 'tz', icon: Icons.assignment, selected: _selectedType == 'tz', onSelected: _selectType),
                        _TypeChip(label: 'КП', value: 'proposal', icon: Icons.request_quote, selected: _selectedType == 'proposal', onSelected: _selectType),
                        _TypeChip(label: 'Договор', value: 'contract', icon: Icons.gavel, selected: _selectedType == 'contract', onSelected: _selectType),
                        _TypeChip(label: 'Отчёт', value: 'report', icon: Icons.assessment, selected: _selectedType == 'report', onSelected: _selectType),
                        _TypeChip(label: 'Саммари', value: 'summary', icon: Icons.summarize, selected: _selectedType == 'summary', onSelected: _selectType),
                        _TypeChip(label: 'Оценка', value: 'estimate', icon: Icons.calculate, selected: _selectedType == 'estimate', onSelected: _selectType),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _selectedType != null ? () {} : null,
                        icon: const Icon(Icons.auto_awesome),
                        label: Text(_selectedType != null ? 'Сгенерировать' : 'Выберите тип'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Text('История запросов', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            historyAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => const Text('Ошибка загрузки', style: TextStyle(color: Color(0xFFEF4444))),
              data: (history) {
                if (history.isEmpty) {
                  return const Card(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: Text('История пуста', style: TextStyle(color: Color(0xFF64748B)))),
                    ),
                  );
                }
                return Column(
                  children: history.take(10).map((item) => _HistoryItem(item: item)).toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _selectType(String type) {
    setState(() => _selectedType = type);
  }
}

class _TypeChip extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final bool selected;
  final ValueChanged<String> onSelected;

  const _TypeChip({
    required this.label,
    required this.value,
    required this.icon,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onSelected(value),
      avatar: Icon(icon, size: 16),
      selectedColor: const Color(0xFF6366F1).withValues(alpha: 0.1),
    );
  }
}

class _HistoryItem extends StatelessWidget {
  final AIRequest item;

  const _HistoryItem({required this.item});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.history, size: 20, color: Color(0xFF6366F1)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.templateName ?? 'Генерация', style: const TextStyle(fontWeight: FontWeight.w500)),
                  Text(item.status, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                ],
              ),
            ),
            Text(
              '${item.createdAt.day}.${item.createdAt.month}.${item.createdAt.hour}:${item.createdAt.minute}',
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
