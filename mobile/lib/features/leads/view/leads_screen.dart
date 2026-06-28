import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../entities/lead.dart';
import '../data/leads_providers.dart';

class LeadsScreen extends ConsumerWidget {
  const LeadsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final kanbanAsync = ref.watch(leadsKanbanProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Лиды'),
        actions: [
          IconButton(icon: const Icon(Icons.add), onPressed: () {}),
        ],
      ),
      body: kanbanAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Color(0xFFEF4444)),
              const SizedBox(height: 16),
              const Text('Ошибка загрузки'),
              OutlinedButton(onPressed: () => ref.refresh(leadsKanbanProvider), child: const Text('Повторить')),
            ],
          ),
        ),
        data: (kanban) => Column(
          children: [
            // Stage tabs
            SizedBox(
              height: 48,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: kanban.stages.length,
                itemBuilder: (context, index) {
                  final stage = kanban.stages[index];
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text('${stage.name} (${kanban.leadsByStage[stage.id]?.length ?? 0})'),
                      selected: index == 0,
                      onSelected: (_) {},
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 8),

            // Leads list
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: kanban.stages.length,
                itemBuilder: (context, index) {
                  final stage = kanban.stages[index];
                  final leads = kanban.leadsByStage[stage.id] ?? [];

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Container(
                              width: 12,
                              height: 12,
                              decoration: BoxDecoration(
                                color: Color(int.parse(stage.color.replaceFirst('#', '0xFF'))),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              stage.name,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            const Spacer(),
                            Text(
                              '${leads.length}',
                              style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                      if (leads.isEmpty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 16, left: 20),
                          child: Text('Нет лидов', style: TextStyle(color: Colors.grey[400], fontSize: 13)),
                        )
                      else
                        ...leads.map((lead) => _LeadCard(lead: lead)),
                      const SizedBox(height: 16),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LeadCard extends StatelessWidget {
  final Lead lead;

  const _LeadCard({required this.lead});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8, left: 20),
      child: InkWell(
        onTap: () {},
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(lead.contactName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  ),
                  if (lead.budget != null)
                    Text(
                      '${lead.budget!.toStringAsFixed(0)} ₽',
                      style: const TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.w500, fontSize: 13),
                    ),
                ],
              ),
              const SizedBox(height: 4),
              Text(lead.companyName.isNotEmpty ? lead.companyName : lead.phone,
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 13)),
              if (lead.assignedToName != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.person_outlined, size: 12, color: Color(0xFF94A3B8)),
                    const SizedBox(width: 4),
                    Text(lead.assignedToName!, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
