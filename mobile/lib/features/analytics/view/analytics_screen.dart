import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Аналитика'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Period selector
            Row(
              children: [
                _PeriodChip(label: 'Н', isSelected: false),
                const SizedBox(width: 8),
                _PeriodChip(label: 'М', isSelected: true),
                const SizedBox(width: 8),
                _PeriodChip(label: 'Кв', isSelected: false),
                const SizedBox(width: 8),
                _PeriodChip(label: 'Г', isSelected: false),
              ],
            ),
            const SizedBox(height: 24),

            // KPI cards
            Row(
              children: [
                Expanded(child: _KpiCard(label: 'Проекты', value: '24', change: '+3', isUp: true)),
                const SizedBox(width: 12),
                Expanded(child: _KpiCard(label: 'Задачи', value: '156', change: '+12', isUp: true)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _KpiCard(label: 'Клиенты', value: '48', change: '+5', isUp: true)),
                const SizedBox(width: 12),
                Expanded(child: _KpiCard(label: 'Конверсия', value: '32%', change: '-2%', isUp: false)),
              ],
            ),
            const SizedBox(height: 24),

            // Revenue chart placeholder
            const Text(
              'Доход по месяцам',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Card(
              child: Container(
                height: 200,
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                child: CustomPaint(
                  painter: _ChartPainter(),
                  child: const Center(
                    child: Text(
                      '📊 График доходов',
                      style: TextStyle(color: AppColors.surface400),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Top projects
            const Text(
              'Топ проектов',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            _TopProjectItem(rank: 1, name: 'DEO CRM', revenue: '1 200 000 ₽', progress: 0.8),
            const SizedBox(height: 8),
            _TopProjectItem(rank: 2, name: 'Сайт DEO Studio', revenue: '850 000 ₽', progress: 0.65),
            const SizedBox(height: 8),
            _TopProjectItem(rank: 3, name: 'Мобильное приложение', revenue: '620 000 ₽', progress: 0.45),
          ],
        ),
      ),
    );
  }
}

class _PeriodChip extends StatelessWidget {
  final String label;
  final bool isSelected;

  const _PeriodChip({required this.label, required this.isSelected});

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) {},
      selectedColor: AppColors.brand.withValues(alpha: 0.1),
      labelStyle: TextStyle(
        color: isSelected ? AppColors.brand : AppColors.surface500,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final String change;
  final bool isUp;

  const _KpiCard({
    required this.label,
    required this.value,
    required this.change,
    required this.isUp,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: AppColors.surface500, fontSize: 13)),
            const SizedBox(height: 8),
            Row(
              children: [
                Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(width: 6),
                Icon(
                  isUp ? Icons.trending_up : Icons.trending_down,
                  size: 16,
                  color: isUp ? AppColors.success : AppColors.danger,
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '$change за месяц',
              style: TextStyle(
                fontSize: 12,
                color: isUp ? AppColors.success : AppColors.danger,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TopProjectItem extends StatelessWidget {
  final int rank;
  final String name;
  final String revenue;
  final double progress;

  const _TopProjectItem({
    required this.rank,
    required this.name,
    required this.revenue,
    required this.progress,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: rank <= 3 ? AppColors.brand.withValues(alpha: 0.1) : null,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(
                  '$rank',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: rank <= 3 ? AppColors.brand : AppColors.surface500,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  const SizedBox(height: 2),
                  Text(revenue, style: const TextStyle(color: AppColors.brand, fontSize: 13)),
                ],
              ),
            ),
            SizedBox(
              width: 80,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress,
                  backgroundColor: AppColors.surface200,
                  color: AppColors.brand,
                  minHeight: 6,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.brand.withValues(alpha: 0.1)
      ..style = PaintingStyle.fill;

    final path = Path();
    path.moveTo(0, size.height);
    path.lineTo(0, size.height * 0.7);
    path.quadraticBezierTo(
      size.width * 0.25, size.height * 0.3,
      size.width * 0.5, size.height * 0.5,
    );
    path.quadraticBezierTo(
      size.width * 0.75, size.height * 0.2,
      size.width, size.height * 0.35,
    );
    path.lineTo(size.width, size.height);
    path.close();
    canvas.drawPath(path, paint);

    final linePaint = Paint()
      ..color = AppColors.brand
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final linePath = Path();
    linePath.moveTo(0, size.height * 0.7);
    linePath.quadraticBezierTo(
      size.width * 0.25, size.height * 0.3,
      size.width * 0.5, size.height * 0.5,
    );
    linePath.quadraticBezierTo(
      size.width * 0.75, size.height * 0.2,
      size.width, size.height * 0.35,
    );
    canvas.drawPath(linePath, linePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
