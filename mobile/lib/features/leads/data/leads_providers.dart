import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/leads_api.dart';
import '../../../entities/lead.dart';

final leadsListProvider = FutureProvider.autoDispose<List<Lead>>((ref) async {
  final api = ref.read(leadsApiProvider);
  return await api.list();
});

final leadsStagesProvider = FutureProvider.autoDispose<List<LeadStage>>((ref) async {
  final api = ref.read(leadsApiProvider);
  return await api.getStages();
});

final leadsKanbanProvider = FutureProvider.autoDispose<LeadKanbanData>((ref) async {
  final api = ref.read(leadsApiProvider);
  final results = await Future.wait([
    api.getStages(),
    api.list(),
  ]);

  final stages = results[0] as List<LeadStage>;
  final leads = results[1] as List<Lead>;

  final leadsByStage = <String, List<Lead>>{};
  for (final stage in stages) {
    leadsByStage[stage.id] = [];
  }
  for (final lead in leads) {
    leadsByStage.putIfAbsent(lead.currentStageId, () => []);
    leadsByStage[lead.currentStageId]!.add(lead);
  }

  return LeadKanbanData(stages: stages, leadsByStage: leadsByStage);
});
