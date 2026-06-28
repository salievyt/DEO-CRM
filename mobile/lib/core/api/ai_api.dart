import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../entities/ai_request.dart';
import 'api_service.dart';

final aiApiProvider = Provider<AiApi>((ref) => AiApi(ref));

class AiApi {
  final ApiService _api;

  AiApi(Ref ref) : _api = ApiService(ref);

  Future<Map<String, dynamic>> generate(String type, Map<String, dynamic> data) async {
    final response = await _api.post('/ai/generate/$type/', data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<List<AIRequest>> getHistory() async {
    final response = await _api.get('/ai/history/');
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => AIRequest.fromJson(e as Map<String, dynamic>)).toList();
  }
}
