import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_service.dart';

final crmApiProvider = Provider((ref) => CrmApi(ref.read(dioProvider)));

class CrmApi {
  CrmApi(this.dio);
  final Dio dio;

  Future<dynamic> get(String path, {Map<String, dynamic>? params}) async =>
      (await dio.get(path, queryParameters: params)).data;

  Future<Map<String, dynamic>> metadata(String path) async {
    final response = await dio.request(
      path,
      options: Options(method: 'OPTIONS'),
    );
    return {
      ...Map<String, dynamic>.from(response.data as Map),
      '_methods': (response.headers.value('allow') ?? '')
          .split(',')
          .map((s) => s.trim())
          .toList(),
    };
  }

  Future<dynamic> save(
    String path,
    dynamic data, {
    String method = 'POST',
  }) async => (await dio.request(
    path,
    data: data,
    options: Options(method: method),
  )).data;

  Future<void> delete(String path) async => dio.delete(path);

  Future<List<Map<String, dynamic>>> choices(String path) async {
    final rows = <Map<String, dynamic>>[];
    String? next = path;
    final origin = Uri.parse(dio.options.baseUrl).origin;
    final visited = <String>{};
    while (next != null && visited.add(next)) {
      final uri = Uri.parse(next);
      if (uri.hasAuthority && uri.origin != origin) {
        throw StateError('Некорректный адрес следующей страницы');
      }
      final data = await get(
        next,
        params: uri.hasAuthority ? null : {'page_size': 100},
      );
      final items = data is Map ? data['results'] : data;
      if (items is List) {
        rows.addAll(
          items.whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
        );
      }
      next = data is Map ? data['next'] as String? : null;
    }
    return rows;
  }
}

String crmError(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data != null) return _errorText(data);
    return 'Нет соединения с сервером. Проверьте интернет и повторите попытку.';
  }
  return error.toString();
}

String _errorText(dynamic data) {
  if (data is Map) {
    return data.entries
        .where((e) => !['error', 'status_code'].contains(e.key))
        .map((e) => _errorText(e.value))
        .join('\n');
  }
  if (data is List) return data.map(_errorText).join('\n');
  return '$data';
}

String recordTitle(Map<String, dynamic> row) =>
    '${row['display_name'] ?? row['user_name'] ?? row['user_full_name'] ?? row['title'] ?? row['name'] ?? row['full_name'] ?? row['contact_name'] ?? row['number'] ?? row['email'] ?? row['content'] ?? row['text'] ?? 'Запись'}';
