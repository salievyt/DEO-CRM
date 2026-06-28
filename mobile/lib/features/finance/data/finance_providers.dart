import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/finance_api.dart';
import '../../../entities/finance.dart';

final financeSummaryProvider = FutureProvider.autoDispose<FinanceSummary>((ref) async {
  final api = ref.read(financeApiProvider);
  return await api.getSummary();
});

final financeInvoicesProvider = FutureProvider.autoDispose<List<Invoice>>((ref) async {
  final api = ref.read(financeApiProvider);
  return await api.getInvoices(params: {'page_size': '50'});
});

final financeExpensesProvider = FutureProvider.autoDispose<List<Expense>>((ref) async {
  final api = ref.read(financeApiProvider);
  return await api.getExpenses(params: {'page_size': '50'});
});
