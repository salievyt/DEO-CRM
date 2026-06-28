class SummaryMetrics {
  final int totalClients;
  final int activeProjects;
  final double monthlyRevenue;
  final int openTasks;

  SummaryMetrics({
    this.totalClients = 0,
    this.activeProjects = 0,
    this.monthlyRevenue = 0,
    this.openTasks = 0,
  });

  factory SummaryMetrics.fromJson(Map<String, dynamic> json) {
    return SummaryMetrics(
      totalClients: (json['total_clients'] as num?)?.toInt() ?? 0,
      activeProjects: (json['active_projects'] as num?)?.toInt() ?? 0,
      monthlyRevenue: (json['monthly_revenue'] as num?)?.toDouble() ?? 0,
      openTasks: (json['open_tasks'] as num?)?.toInt() ?? 0,
    );
  }
}

class SalesMetrics {
  final int totalLeads;
  final int activeLeads;
  final double totalPipelineValue;
  final List<StageMetric> stages;

  SalesMetrics({
    this.totalLeads = 0,
    this.activeLeads = 0,
    this.totalPipelineValue = 0,
    this.stages = const [],
  });

  factory SalesMetrics.fromJson(Map<String, dynamic> json) {
    return SalesMetrics(
      totalLeads: (json['total_leads'] as num?)?.toInt() ?? 0,
      activeLeads: (json['active_leads'] as num?)?.toInt() ?? 0,
      totalPipelineValue: (json['total_pipeline_value'] as num?)?.toDouble() ?? 0,
      stages: (json['stages'] as List<dynamic>?)
              ?.map((e) => StageMetric.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class StageMetric {
  final String name;
  final int count;
  final String color;

  StageMetric({required this.name, this.count = 0, this.color = '#6366f1'});

  factory StageMetric.fromJson(Map<String, dynamic> json) {
    return StageMetric(
      name: json['name'] as String,
      count: (json['count'] as num?)?.toInt() ?? 0,
      color: json['color'] as String? ?? '#6366f1',
    );
  }
}

class TaskMetrics {
  final int total;
  final int completed;
  final double completionRate;
  final int overdue;

  TaskMetrics({
    this.total = 0,
    this.completed = 0,
    this.completionRate = 0,
    this.overdue = 0,
  });

  factory TaskMetrics.fromJson(Map<String, dynamic> json) {
    return TaskMetrics(
      total: (json['total'] as num?)?.toInt() ?? 0,
      completed: (json['completed'] as num?)?.toInt() ?? 0,
      completionRate: (json['completion_rate'] as num?)?.toDouble() ?? 0,
      overdue: (json['overdue'] as num?)?.toInt() ?? 0,
    );
  }
}
