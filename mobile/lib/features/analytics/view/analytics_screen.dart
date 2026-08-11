import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../data/analytics_providers.dart';

class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsAsync = ref.watch(analyticsDataProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Аналитика'),
        actions: [
          IconButton(icon: const Icon(Icons.calendar_today), onPressed: () {}),
        ],
      ),
      body: analyticsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Color(0xFFEF4444)),
              const SizedBox(height: 16),
              const Text('Ошибка загрузки'),
              OutlinedButton(onPressed: () => ref.refresh(analyticsDataProvider), child: const Text('Повторить')),
            ],
          ),
        ),
        data: (data) => SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // KPI cards
              Row(
                children: [
                  Expanded(child: _KpiCard(label: 'Клиенты', value: '${data.summary.totalClients}', change: '+${data.summary.totalClients > 0 ? '5' : '0'}', isUp: true)),
                  const SizedBox(width: 12),
                  Expanded(child: _KpiCard(label: 'Проекты', value: '${data.summary.activeProjects}', change: '+${data.summary.activeProjects > 0 ? '3' : '0'}', isUp: true)),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _KpiCard(label: 'Задачи', value: '${data.tasks.total}', change: '${data.tasks.completionRate}%', isUp: true)),
                  const SizedBox(width: 12),
                  Expanded(child: _KpiCard(label: 'Выручка', value: '${_formatMoney(data.summary.monthlyRevenue)}', change: '+12%', isUp: true)),
                ],
              ),
              const SizedBox(height: 24),

              // Pipeline stages chart
              const Text('Воронка продаж', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: SizedBox(
                    height: 220,
                    child: data.sales.stages.isNotEmpty
                        ? PieChart(
                            PieChartData(
                              sections: data.sales.stages.map((stage) {
                                return PieChartSectionData(
                                  value: stage.count.toDouble(),
                                  title: '${stage.count}',
                                  color: Color(int.parse(stage.color.replaceFirst('#', '0xFF'))),
                                  radius: 40,
                                  titleStyle: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                );
                              }).toList(),
                              centerSpaceRadius: 40,
                              sectionsSpace: 2,
                            ),
                          )
                        : const Center(child: Text('Нет данных', style: TextStyle(color: Color(0xFF64748B)))),
                  ),
                ),
              ),
              if (data.sales.stages.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 16,
                  runSpacing: 4,
                  children: data.sales.stages.map((stage) {
                    return Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: Color(int.parse(stage.color.replaceFirst('#', '0xFF'))),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(stage.name, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      ],
                    );
                  }).toList(),
                ),
              ],
              const SizedBox(height: 24),

              // Task metrics
              const Text('Метрики задач', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _MetricRow(label: 'Всего задач', value: '${data.tasks.total}'),
                      const Divider(),
                      _MetricRow(label: 'Выполнено', value: '${data.tasks.completed}'),
                      const Divider(),
                      _MetricRow(label: 'Просрочено', value: '${data.tasks.overdue}', valueColor: data.tasks.overdue > 0 ? const Color(0xFFEF4444) : null),
                      const Divider(),
                      _MetricRow(label: 'Завершение', value: '${data.tasks.completionRate.toStringAsFixed(1)}%', valueColor: const Color(0xFF22C55E)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatMoney(double value) {
    if (value >= 1000000) return '${(value / 1000000).toStringAsFixed(1)}M ₽';
    if (value >= 1000) return '${(value / 1000).toStringAsFixed(0)}K ₽';
    return '${value.toStringAsFixed(0)} ₽';
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final String change;
  final bool isUp;

  const _KpiCard({required this.label, required this.value, required this.change, required this.isUp});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 13)),
            const SizedBox(height: 8),
            Row(
              children: [
                Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(width: 6),
                Icon(isUp ? Icons.trending_up : Icons.trending_down, size: 16, color: isUp ? const Color(0xFF22C55E) : const Color(0xFFEF4444)),
              ],
            ),
            const SizedBox(height: 4),
            Text(change, style: TextStyle(fontSize: 12, color: isUp ? const Color(0xFF22C55E) : const Color(0xFFEF4444))),
          ],
        ),
      ),
    );
  }
}

class _MetricRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _MetricRow({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF64748B))),
          Text(value, style: TextStyle(fontWeight: FontWeight.w600, color: valueColor)),
        ],
      ),
    );
  }
}
