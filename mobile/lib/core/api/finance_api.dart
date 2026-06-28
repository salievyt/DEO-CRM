import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../entities/finance.dart';
import 'api_service.dart';

final financeApiProvider = Provider<FinanceApi>((ref) => FinanceApi(ref));

class FinanceApi {
  final ApiService _api;

  FinanceApi(Ref ref) : _api = ApiService(ref);

  Future<List<Invoice>> getInvoices({Map<String, dynamic>? params}) async {
    final response = await _api.get('/finance/invoices/', params: params);
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => Invoice.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Expense>> getExpenses({Map<String, dynamic>? params}) async {
    final response = await _api.get('/finance/expenses/', params: params);
    final data = response.data;
    final results = (data is Map ? (data['results'] as List<dynamic>?) : data as List<dynamic>?) ?? [];
    return results.map((e) => Expense.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<FinanceSummary> getSummary() async {
    final response = await _api.get('/finance/reports/summary/');
    return FinanceSummary.fromJson(response.data as Map<String, dynamic>);
  }
}
