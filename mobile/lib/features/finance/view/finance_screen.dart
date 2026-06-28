import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../entities/finance.dart';
import '../data/finance_providers.dart';

class FinanceScreen extends ConsumerWidget {
  const FinanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(financeSummaryProvider);
    final invoicesAsync = ref.watch(financeInvoicesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Финансы'),
        actions: [
          IconButton(icon: const Icon(Icons.add), onPressed: () {}),
        ],
      ),
      body: summaryAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => const Center(child: Text('Ошибка загрузки')),
        data: (summary) => SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Balance card
              Card(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Текущий баланс', style: TextStyle(color: Colors.white70, fontSize: 14)),
                      const SizedBox(height: 8),
                      Text(
                        '${_formatMoney(summary.totalRevenue)} ₽',
                        style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.trending_up, color: Colors.greenAccent, size: 16),
                          const SizedBox(width: 4),
                          const Text('+12.5%', style: TextStyle(color: Colors.greenAccent, fontSize: 13)),
                          const Spacer(),
                          TextButton.icon(
                            onPressed: () {},
                            icon: const Icon(Icons.download, size: 16, color: Colors.white70),
                            label: const Text('Отчёт', style: TextStyle(color: Colors.white70, fontSize: 13)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Quick stats
              Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      icon: Icons.arrow_upward,
                      label: 'Доход (мес)',
                      value: '${_formatMoney(summary.monthlyRevenue)} ₽',
                      color: const Color(0xFF22C55E),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatCard(
                      icon: Icons.arrow_downward,
                      label: 'Расход (мес)',
                      value: '${_formatMoney(summary.monthlyExpenses)} ₽',
                      color: const Color(0xFFEF4444),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Invoices
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Счета', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  TextButton(onPressed: () {}, child: const Text('Все')),
                ],
              ),
              const SizedBox(height: 8),

              invoicesAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => const Text('Ошибка'),
                data: (invoices) {
                  if (invoices.isEmpty) return const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: Text('Нет счетов', style: TextStyle(color: Color(0xFF64748B)))),
                  );
                  return Column(
                    children: invoices.take(5).map((invoice) => _InvoiceCard(invoice: invoice)).toList(),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatMoney(double value) {
    if (value >= 1000000) return '${(value / 1000000).toStringAsFixed(1)} M';
    if (value >= 1000) return '${(value / 1000).toStringAsFixed(0)} K';
    return value.toStringAsFixed(0);
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 12),
            Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 13)),
          ],
        ),
      ),
    );
  }
}

class _InvoiceCard extends StatelessWidget {
  final Invoice invoice;

  const _InvoiceCard({required this.invoice});

  Color _statusColor(String status) {
    switch (status) {
      case 'paid': return const Color(0xFF22C55E);
      case 'overdue': return const Color(0xFFEF4444);
      case 'sent': return const Color(0xFFF59E0B);
      default: return const Color(0xFF94A3B8);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: invoice.status == 'paid'
                    ? const Color(0xFF22C55E).withValues(alpha: 0.1)
                    : const Color(0xFFEF4444).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                invoice.status == 'paid' ? Icons.check_circle : Icons.pending,
                color: invoice.status == 'paid' ? const Color(0xFF22C55E) : const Color(0xFFF59E0B),
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(invoice.number, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  const SizedBox(height: 2),
                  Text(invoice.clientName ?? '', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${invoice.amount.toStringAsFixed(0)} ₽',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                ),
                const SizedBox(height: 2),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: _statusColor(invoice.status).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    invoice.status == 'paid' ? 'Оплачен' : invoice.status == 'overdue' ? 'Просрочен' : 'Отправлен',
                    style: TextStyle(color: _statusColor(invoice.status), fontSize: 11, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
