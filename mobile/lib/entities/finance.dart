class Invoice {
  final String id;
  final String number;
  final String? projectId;
  final String? projectName;
  final String clientId;
  final String? clientName;
  final double amount;
  final double paidAmount;
  final String status;
  final String? description;
  final DateTime issuedDate;
  final DateTime dueDate;
  final DateTime? paidAt;
  final String? createdBy;
  final DateTime createdAt;

  Invoice({
    required this.id,
    required this.number,
    this.projectId,
    this.projectName,
    required this.clientId,
    this.clientName,
    required this.amount,
    this.paidAmount = 0,
    required this.status,
    this.description,
    required this.issuedDate,
    required this.dueDate,
    this.paidAt,
    this.createdBy,
    required this.createdAt,
  });

  double get remainingAmount => amount - paidAmount;
  bool get isOverdue => status == 'overdue' || (status != 'paid' && dueDate.isBefore(DateTime.now()));

  factory Invoice.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? clientData;
    if (json['client'] is Map) {
      clientData = json['client'] as Map<String, dynamic>;
    }
    Map<String, dynamic>? projectData;
    if (json['project'] is Map) {
      projectData = json['project'] as Map<String, dynamic>;
    }

    return Invoice(
      id: json['id'] as String,
      number: json['number'] as String,
      projectId: projectData?['id'] as String?,
      projectName: projectData?['name'] as String?,
      clientId: clientData?['id'] as String? ?? (json['client'] as String?) ?? '',
      clientName: clientData?['full_name'] as String? ?? clientData?['company_name'] as String?,
      amount: (json['amount'] as num).toDouble(),
      paidAmount: (json['paid_amount'] as num?)?.toDouble() ?? 0,
      status: json['status'] as String? ?? 'draft',
      description: json['description'] as String?,
      issuedDate: DateTime.parse(json['issued_date'] as String),
      dueDate: DateTime.parse(json['due_date'] as String),
      paidAt: json['paid_at'] != null ? DateTime.parse(json['paid_at'] as String) : null,
      createdBy: json['created_by'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

class Expense {
  final String id;
  final String categoryId;
  final String? categoryName;
  final String? projectId;
  final String? projectName;
  final double amount;
  final String description;
  final DateTime expenseDate;
  final String? createdBy;
  final DateTime createdAt;

  Expense({
    required this.id,
    required this.categoryId,
    this.categoryName,
    this.projectId,
    this.projectName,
    required this.amount,
    required this.description,
    required this.expenseDate,
    this.createdBy,
    required this.createdAt,
  });

  factory Expense.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? categoryData;
    if (json['category'] is Map) {
      categoryData = json['category'] as Map<String, dynamic>;
    }

    return Expense(
      id: json['id'] as String,
      categoryId: categoryData?['id'] as String? ?? (json['category'] as String?) ?? '',
      categoryName: categoryData?['name'] as String?,
      projectId: json['project'] as String?,
      amount: (json['amount'] as num).toDouble(),
      description: json['description'] as String,
      expenseDate: DateTime.parse(json['expense_date'] as String),
      createdBy: json['created_by'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

class FinanceSummary {
  final double totalRevenue;
  final double totalExpenses;
  final double totalProfit;
  final double monthlyRevenue;
  final double monthlyExpenses;
  final int pendingInvoices;
  final double overdueAmount;

  FinanceSummary({
    this.totalRevenue = 0,
    this.totalExpenses = 0,
    this.totalProfit = 0,
    this.monthlyRevenue = 0,
    this.monthlyExpenses = 0,
    this.pendingInvoices = 0,
    this.overdueAmount = 0,
  });

  factory FinanceSummary.fromJson(Map<String, dynamic> json) {
    return FinanceSummary(
      totalRevenue: (json['total_revenue'] as num?)?.toDouble() ?? 0,
      totalExpenses: (json['total_expenses'] as num?)?.toDouble() ?? 0,
      totalProfit: (json['total_profit'] as num?)?.toDouble() ?? 0,
      monthlyRevenue: (json['monthly_revenue'] as num?)?.toDouble() ?? 0,
      monthlyExpenses: (json['monthly_expenses'] as num?)?.toDouble() ?? 0,
      pendingInvoices: (json['pending_invoices'] as num?)?.toInt() ?? 0,
      overdueAmount: (json['overdue_amount'] as num?)?.toDouble() ?? 0,
    );
  }
}
