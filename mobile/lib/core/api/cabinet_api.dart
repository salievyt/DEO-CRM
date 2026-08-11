import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../entities/project.dart';
import '../../entities/document.dart';
import '../../entities/finance.dart';
import '../api/api_service.dart';

final cabinetApiProvider = Provider<CabinetApi>((ref) => CabinetApi(ref));

class CabinetApi {
  final ApiService _api;

  CabinetApi(Ref ref) : _api = ApiService(ref);

  Future<Map<String, dynamic>> getDashboard() async {
    final response = await _api.get('/cabinet/dashboard/');
    return response.data as Map<String, dynamic>;
  }

  Future<List<Project>> getProjects() async {
    final response = await _api.get('/cabinet/projects/');
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => Project.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Document>> getDocuments() async {
    final response = await _api.get('/cabinet/documents/');
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => Document.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Invoice>> getInvoices() async {
    final response = await _api.get('/cabinet/invoices/');
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => Invoice.fromJson(e as Map<String, dynamic>)).toList();
  }
}
