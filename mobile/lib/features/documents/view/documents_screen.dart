import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Документы'),
        actions: [
          IconButton(
            icon: const Icon(Icons.upload_file),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Categories
            SizedBox(
              height: 100,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _CategoryCard(icon: Icons.picture_as_pdf, label: 'PDF', count: 12, color: AppColors.danger),
                  const SizedBox(width: 12),
                  _CategoryCard(icon: Icons.description, label: 'DOCX', count: 8, color: AppColors.info),
                  const SizedBox(width: 12),
                  _CategoryCard(icon: Icons.table_chart, label: 'XLSX', count: 5, color: AppColors.success),
                  const SizedBox(width: 12),
                  _CategoryCard(icon: Icons.image, label: 'Изображения', count: 23, color: AppColors.warning),
                  const SizedBox(width: 12),
                  _CategoryCard(icon: Icons.folder, label: 'Архивы', count: 4, color: AppColors.surface500),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Recent files
            const Text(
              'Недавние файлы',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            ..._files.map(
              (f) => _FileCard(file: f),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final int count;
  final Color color;

  const _CategoryCard({
    required this.icon,
    required this.label,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: SizedBox(
        width: 100,
        child: InkWell(
          onTap: () {},
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: color, size: 28),
                const SizedBox(height: 6),
                Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
                Text('$count', style: const TextStyle(fontSize: 11, color: AppColors.surface400)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FileCard extends StatelessWidget {
  final _FileItem file;

  const _FileCard({required this.file});

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
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: file.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(file.icon, color: file.color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(file.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    const SizedBox(height: 2),
                    Text(
                      '${file.size} · ${file.date}',
                      style: const TextStyle(color: AppColors.surface500, fontSize: 12),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.more_vert, size: 20),
                onPressed: () {},
                color: AppColors.surface400,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FileItem {
  final String name;
  final String size;
  final String date;
  final IconData icon;
  final Color color;

  const _FileItem({
    required this.name,
    required this.size,
    required this.date,
    required this.icon,
    required this.color,
  });
}

final _files = [
  _FileItem(name: 'Договор DEO CRM.pdf', size: '2.4 MB', date: '12 июн', icon: Icons.picture_as_pdf, color: AppColors.danger),
  _FileItem(name: 'Коммерческое предложение.docx', size: '1.1 MB', date: '11 июн', icon: Icons.description, color: AppColors.info),
  _FileItem(name: 'Смета проекта.xlsx', size: '856 KB', date: '10 июн', icon: Icons.table_chart, color: AppColors.success),
  _FileItem(name: 'Логотип финальный.png', size: '3.2 MB', date: '09 июн', icon: Icons.image, color: AppColors.warning),
  _FileItem(name: 'Презентация.pdf', size: '5.7 MB', date: '08 июн', icon: Icons.picture_as_pdf, color: AppColors.danger),
  _FileItem(name: 'Техническое задание.docx', size: '980 KB', date: '07 июн', icon: Icons.description, color: AppColors.info),
];
