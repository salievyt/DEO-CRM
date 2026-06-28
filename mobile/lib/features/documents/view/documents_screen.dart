import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/documents_api.dart';
import '../../../entities/document.dart';

final _documentsListProvider = FutureProvider.autoDispose<List<Document>>((ref) async {
  return await ref.read(documentsApiProvider).list();
});

class DocumentsScreen extends ConsumerWidget {
  const DocumentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final docsAsync = ref.watch(_documentsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Документы'),
        actions: [
          IconButton(icon: const Icon(Icons.upload_file), onPressed: () {}),
        ],
      ),
      body: docsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => const Center(child: Text('Ошибка загрузки')),
        data: (docs) {
          if (docs.isEmpty) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.description_outlined, size: 64, color: Color(0xFFCBD5E1)),
                  SizedBox(height: 16),
                  Text('Нет документов', style: TextStyle(color: Color(0xFF64748B))),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: docs.length,
            itemBuilder: (context, index) => _DocumentCard(doc: docs[index]),
          );
        },
      ),
    );
  }
}

class _DocumentCard extends StatelessWidget {
  final Document doc;

  const _DocumentCard({required this.doc});

  IconData _getIcon(String? type) {
    final name = (type ?? '').toLowerCase();
    if (name.contains('pdf')) return Icons.picture_as_pdf;
    if (name.contains('doc')) return Icons.description;
    if (name.contains('xls') || name.contains('sheet')) return Icons.table_chart;
    if (name.contains('png') || name.contains('jpg') || name.contains('image')) return Icons.image;
    return Icons.insert_drive_file;
  }

  Color _getColor(String? type) {
    final name = (type ?? '').toLowerCase();
    if (name.contains('pdf') || doc.fileName.endsWith('.pdf')) return const Color(0xFFEF4444);
    if (name.contains('doc') || doc.fileName.endsWith('.docx')) return const Color(0xFF3B82F6);
    if (name.contains('xls') || doc.fileName.endsWith('.xlsx')) return const Color(0xFF22C55E);
    if (name.contains('png') || doc.fileName.endsWith('.jpg')) return const Color(0xFFF59E0B);
    return const Color(0xFF64748B);
  }

  @override
  Widget build(BuildContext context) {
    final iconColor = _getColor(doc.mimeType);
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
                  color: iconColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(_getIcon(doc.mimeType), color: iconColor, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(doc.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    const SizedBox(height: 2),
                    Text(
                      '${doc.formattedSize} · ${doc.createdAt.day}.${doc.createdAt.month}.${doc.createdAt.year}',
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.more_vert, size: 20),
                onPressed: () {},
                color: const Color(0xFF94A3B8),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
