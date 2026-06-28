import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/projects_api.dart';
import '../../../entities/project.dart';

final projectsListProvider = FutureProvider.autoDispose<List<Project>>((ref) async {
  final api = ref.read(projectsApiProvider);
  return await api.list(params: {'page_size': '50'});
});

final projectDetailProvider = FutureProvider.autoDispose.family<ProjectDetailData, String>((ref, id) async {
  final api = ref.read(projectsApiProvider);
  final results = await Future.wait([
    api.get(id),
    api.getTeam(id),
  ]);
  return ProjectDetailData(
    project: results[0] as Project,
    team: results[1] as List<ProjectTeamMember>,
  );
});

class ProjectDetailData {
  final Project project;
  final List<ProjectTeamMember> team;

  ProjectDetailData({required this.project, required this.team});
}
