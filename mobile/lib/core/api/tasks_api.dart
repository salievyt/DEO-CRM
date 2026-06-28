import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../entities/task.dart';
import 'api_service.dart';

final tasksApiProvider = Provider<TasksApi>((ref) => TasksApi(ref));

class TasksApi {
  final ApiService _api;

  TasksApi(Ref ref) : _api = ApiService(ref);

  Future<List<Task>> list({Map<String, dynamic>? params}) async {
    final response = await _api.get('/tasks/', params: params);
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => Task.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Task>> my() async {
    final response = await _api.get('/tasks/my/');
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => Task.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Task>> upcoming() async {
    final response = await _api.get('/tasks/upcoming/');
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => Task.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Task> get(String id) async {
    final response = await _api.get('/tasks/$id/');
    return Task.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Task> create(Map<String, dynamic> data) async {
    final response = await _api.post('/tasks/', data: data);
    return Task.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Task> update(String id, Map<String, dynamic> data) async {
    final response = await _api.patch('/tasks/$id/', data: data);
    return Task.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> delete(String id) async {
    await _api.delete('/tasks/$id/');
  }

  Future<void> changeStatus(String id, String statusId) async {
    await _api.post('/tasks/$id/change-status/', data: {'status_id': statusId});
  }

  Future<List<TaskComment>> getComments(String taskId) async {
    final response = await _api.get('/tasks/$taskId/comments/');
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => TaskComment.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<TaskComment> addComment(String taskId, String content) async {
    final response = await _api.post('/tasks/$taskId/comments/', data: {'content': content});
    return TaskComment.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<TaskStatus>> getStatuses() async {
    final response = await _api.get('/tasks/statuses/');
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => TaskStatus.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<TaskPriority>> getPriorities() async {
    final response = await _api.get('/tasks/priorities/');
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => TaskPriority.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> startTimer(String taskId) async {
    await _api.post('/tasks/$taskId/timer/start/');
  }

  Future<void> stopTimer(String taskId) async {
    await _api.post('/tasks/$taskId/timer/stop/');
  }
}
