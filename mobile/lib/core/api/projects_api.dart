import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../entities/project.dart';
import 'api_service.dart';

final projectsApiProvider = Provider<ProjectsApi>((ref) => ProjectsApi(ref));

class ProjectsApi {
  final ApiService _api;

  ProjectsApi(Ref ref) : _api = ApiService(ref);

  Future<List<Project>> list({Map<String, dynamic>? params}) async {
    final response = await _api.get('/projects/', params: params);
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => Project.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Project> get(String id) async {
    final response = await _api.get('/projects/$id/');
    return Project.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<ProjectTeamMember>> getTeam(String projectId) async {
    final response = await _api.get('/projects/$projectId/team/');
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => ProjectTeamMember.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<ProjectStatus>> getStatuses() async {
    final response = await _api.get('/projects/statuses/');
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => ProjectStatus.fromJson(e as Map<String, dynamic>)).toList();
  }
}
