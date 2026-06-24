import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key});

  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Финансы'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
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
                    colors: [AppColors.brand, AppColors.brandDark],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Текущий баланс',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      '4 250 000 ₽',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.trending_up, color: Colors.greenAccent, size: 16),
                        const SizedBox(width: 4),
                        const Text(
                          '+12.5%',
                          style: TextStyle(color: Colors.greenAccent, fontSize: 13),
                        ),
                        const Spacer(),
                        TextButton.icon(
                          onPressed: () {},
                          icon: const Icon(Icons.download, size: 16, color: Colors.white70),
                          label: const Text(
                            'Отчёт',
                            style: TextStyle(color: Colors.white70, fontSize: 13),
                          ),
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
                    label: 'Доход',
                    value: '3 200 000 ₽',
                    color: AppColors.success,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    icon: Icons.arrow_downward,
                    label: 'Расход',
                    value: '1 850 000 ₽',
                    color: AppColors.danger,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Recent transactions
            const Text(
              'Последние операции',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            ..._transactions.map(
              (t) => _TransactionCard(transaction: t),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

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
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(color: AppColors.surface500, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}

class _TransactionCard extends StatelessWidget {
  final _Transaction transaction;

  const _TransactionCard({required this.transaction});

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
                color: transaction.isIncome
                    ? AppColors.success.withValues(alpha: 0.1)
                    : AppColors.danger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                transaction.isIncome ? Icons.arrow_downward : Icons.arrow_upward,
                color: transaction.isIncome ? AppColors.success : AppColors.danger,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    transaction.title,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    transaction.category,
                    style: const TextStyle(color: AppColors.surface500, fontSize: 12),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${transaction.isIncome ? '+' : '-'}${transaction.amount} ₽',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: transaction.isIncome ? AppColors.success : AppColors.danger,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  transaction.date,
                  style: const TextStyle(color: AppColors.surface400, fontSize: 12),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Transaction {
  final String title;
  final String category;
  final String amount;
  final String date;
  final bool isIncome;

  const _Transaction({
    required this.title,
    required this.category,
    required this.amount,
    required this.date,
    required this.isIncome,
  });
}

final _transactions = [
  _Transaction(title: 'Оплата проекта DEO CRM', category: 'Разработка', amount: '500 000', date: '12.06', isIncome: true),
  _Transaction(title: 'Аренда офиса', category: 'Расходы', amount: '80 000', date: '11.06', isIncome: false),
  _Transaction(title: 'Зарплата разработчиков', category: 'Расходы', amount: '350 000', date: '10.06', isIncome: false),
  _Transaction(title: 'Предоплата сайта', category: 'Веб-разработка', amount: '200 000', date: '09.06', isIncome: true),
  _Transaction(title: 'Облачные сервисы', category: 'Инфраструктура', amount: '45 000', date: '08.06', isIncome: false),
  _Transaction(title: 'Консультация', category: 'Услуги', amount: '75 000', date: '07.06', isIncome: true),
];
