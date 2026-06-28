import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../entities/lead.dart';
import 'api_service.dart';

final leadsApiProvider = Provider<LeadsApi>((ref) => LeadsApi(ref));

class LeadsApi {
  final ApiService _api;

  LeadsApi(Ref ref) : _api = ApiService(ref);

  Future<List<LeadStage>> getStages() async {
    final response = await _api.get('/leads/stages/');
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => LeadStage.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Lead>> list({Map<String, dynamic>? params}) async {
    final response = await _api.get('/leads/', params: params);
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => Lead.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Lead> get(String id) async {
    final response = await _api.get('/leads/$id/');
    return Lead.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Lead> create(Map<String, dynamic> data) async {
    final response = await _api.post('/leads/', data: data);
    return Lead.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Lead> update(String id, Map<String, dynamic> data) async {
    final response = await _api.patch('/leads/$id/', data: data);
    return Lead.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> move(String id, String stageId, {String? notes}) async {
    await _api.post('/leads/$id/move/', data: {
      'stage_id': stageId,
      if (notes != null) 'notes': notes,
    });
  }

  Future<Map<String, dynamic>> getStats() async {
    final response = await _api.get('/leads/stats/');
    return response.data as Map<String, dynamic>;
  }
}
