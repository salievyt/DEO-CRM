import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/leads_api.dart';
import '../../../core/api/api_service.dart';
import '../../../entities/lead.dart';

final leadsListProvider = FutureProvider.autoDispose<List<Lead>>((ref) async {
  final api = ref.read(leadsApiProvider);
  return await api.list();
});

final leadsStagesProvider = FutureProvider.autoDispose<List<LeadStage>>((
  ref,
) async {
  final api = ref.read(leadsApiProvider);
  return await api.getStages();
});

final leadsKanbanProvider = FutureProvider.autoDispose<LeadKanbanData>((
  ref,
) async {
  final response = await ApiService(ref).get('/leads/kanban/');
  final columns = response.data as List<dynamic>;
  final stages = <LeadStage>[];
  final leadsByStage = <String, List<Lead>>{};
  for (var index = 0; index < columns.length; index++) {
    final column = columns[index] as Map<String, dynamic>;
    final stage = LeadStage.fromJson({
      'id': column['id'],
      'name': column['title'],
      'color': column['color'],
      'order': index,
    });
    stages.add(stage);
    leadsByStage[stage.id] = (column['leads'] as List<dynamic>)
        .map(
          (item) => Lead.fromJson({
            ...Map<String, dynamic>.from(item as Map),
            'current_stage': stage.id,
          }),
        )
        .toList();
  }

  return LeadKanbanData(stages: stages, leadsByStage: leadsByStage);
});
