import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../entities/document.dart';
import 'api_service.dart';

final documentsApiProvider = Provider<DocumentsApi>((ref) => DocumentsApi(ref));

class DocumentsApi {
  final ApiService _api;

  DocumentsApi(Ref ref) : _api = ApiService(ref);

  Future<List<Document>> list({Map<String, dynamic>? params}) async {
    final response = await _api.get('/documents/', params: params);
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => Document.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Document> get(String id) async {
    final response = await _api.get('/documents/$id/');
    return Document.fromJson(response.data as Map<String, dynamic>);
  }
}
