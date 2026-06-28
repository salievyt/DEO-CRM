import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../entities/client.dart';
import 'api_service.dart';

final clientsApiProvider = Provider<ClientsApi>((ref) => ClientsApi(ref));

class ClientsApi {
  final ApiService _api;

  ClientsApi(Ref ref) : _api = ApiService(ref);

  Future<List<Client>> list({Map<String, dynamic>? params}) async {
    final response = await _api.get('/clients/', params: params);
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => Client.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Client> get(String id) async {
    final response = await _api.get('/clients/$id/');
    return Client.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Client> create(Map<String, dynamic> data) async {
    final response = await _api.post('/clients/', data: data);
    return Client.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<ClientInteraction>> getInteractions(String clientId) async {
    final response = await _api.get('/clients/$clientId/interactions/');
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => ClientInteraction.fromJson(e as Map<String, dynamic>)).toList();
  }
}
