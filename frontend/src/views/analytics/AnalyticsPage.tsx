"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  FolderKanban,
  DollarSign,
  CheckSquare,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { analyticsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatCurrency } from "@/shared/utils/formatters";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6"];

export function AnalyticsPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: [QUERY_KEYS.SUMMARY_METRICS],
    queryFn: () => analyticsApi.summary(),
    select: (res) => res.data,
  });

  const { data: sales } = useQuery({
    queryKey: [QUERY_KEYS.SALES_METRICS],
    queryFn: () => analyticsApi.sales(),
    select: (res) => res.data,
  });

  const { data: taskMetrics } = useQuery({
    queryKey: [QUERY_KEYS.TASK_METRICS],
    queryFn: () => analyticsApi.tasks(),
    select: (res) => res.data,
  });

  if (summaryLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Аналитика"
        description="Аналитические панели в реальном времени"
      />

      {/* Summary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center gap-2 text-brand-600">
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium">Клиенты</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {summary?.total_clients || 0}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-purple-600">
            <FolderKanban className="h-5 w-5" />
            <span className="text-sm font-medium">Активные проекты</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {summary?.active_projects || 0}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-success-600">
            <DollarSign className="h-5 w-5" />
            <span className="text-sm font-medium">Доход (мес.)</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {formatCurrency(summary?.monthly_revenue || 0)}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-warning-600">
            <CheckSquare className="h-5 w-5" />
            <span className="text-sm font-medium">Открытые задачи</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {summary?.open_tasks || 0}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Pipeline Chart */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Воронка продаж
          </h3>
          {sales?.stages && sales.stages.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sales.stages}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {sales.stages.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-surface-400">
              Нет данных для отображения
            </div>
          )}
        </Card>

        {/* Sales metrics */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Метрики продаж
          </h3>
          {sales ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-surface-50 p-4 dark:bg-surface-700/50">
                <span className="text-sm text-surface-600 dark:text-surface-300">
                  Всего лидов
                </span>
                <span className="text-lg font-bold text-surface-900 dark:text-white">
                  {sales.total_leads}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-50 p-4 dark:bg-surface-700/50">
                <span className="text-sm text-surface-600 dark:text-surface-300">
                  Активные лиды
                </span>
                <span className="text-lg font-bold text-surface-900 dark:text-white">
                  {sales.active_leads}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-50 p-4 dark:bg-surface-700/50">
                <span className="text-sm text-surface-600 dark:text-surface-300">
                  Стоимость воронки
                </span>
                <span className="text-lg font-bold text-surface-900 dark:text-white">
                  {formatCurrency(sales.total_pipeline_value)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-surface-400">
              Нет данных
            </div>
          )}
        </Card>

        {/* Task Metrics */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Метрики задач
          </h3>
          {taskMetrics ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-surface-50 p-4 dark:bg-surface-700/50">
                <span className="text-sm text-surface-600 dark:text-surface-300">
                  Всего задач
                </span>
                <span className="text-lg font-bold text-surface-900 dark:text-white">
                  {taskMetrics.total}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-50 p-4 dark:bg-surface-700/50">
                <span className="text-sm text-surface-600 dark:text-surface-300">
                  Выполнено
                </span>
                <span className="text-lg font-bold text-success-600">
                  {taskMetrics.completed}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-50 p-4 dark:bg-surface-700/50">
                <span className="text-sm text-surface-600 dark:text-surface-300">
                  Выполнение
                </span>
                <span className="text-lg font-bold text-brand-600">
                  {taskMetrics.completion_rate}%
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-50 p-4 dark:bg-surface-700/50">
                <span className="text-sm text-surface-600 dark:text-surface-300">
                  Просрочено
                </span>
                <span className="text-lg font-bold text-danger-600">
                  {taskMetrics.overdue}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-surface-400">
              Нет данных
            </div>
          )}
        </Card>

        {/* Stage Distribution */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Распределение по этапам
          </h3>
          {sales?.stages && sales.stages.length > 0 ? (
            <div className="space-y-4">
              <div className="relative">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={sales.stages}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="count"
                      strokeWidth={0}
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      {sales.stages.map((_: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke={COLORS[index % COLORS.length]}
                          style={{ filter: "none" }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        const total = sales.stages.reduce(
                          (s: number, st: any) => s + st.count, 0
                        );
                        const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : "0";
                        return (
                          <div className="rounded-xl border border-surface-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-sm dark:border-surface-700 dark:bg-surface-800/95">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: payload[0].color }} />
                              <span className="text-sm font-medium text-surface-900 dark:text-white">{d.name}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-surface-500">
                              <span className="font-semibold text-surface-900 dark:text-white">{d.count}</span>
                              <span>лидов</span>
                              <span className="text-surface-300">·</span>
                              <span className="font-medium">{pct}%</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <text x="50%" y="46%" textAnchor="middle" className="fill-surface-900 text-xl font-bold dark:fill-white">
                      {sales.stages.reduce((s: number, st: any) => s + st.count, 0)}
                    </text>
                    <text x="50%" y="58%" textAnchor="middle" className="fill-surface-400 text-[11px]">
                      всего лидов
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-2">
                {sales.stages.map((stage: any, index: number) => {
                  const total = sales.stages.reduce((s: number, st: any) => s + st.count, 0);
                  const pct = total > 0 ? ((stage.count / total) * 100).toFixed(1) : "0";
                  return (
                    <div
                      key={stage.name || index}
                      className="flex items-center gap-2.5 rounded-lg border border-surface-100 bg-white px-3 py-2.5 transition-all hover:shadow-sm dark:border-surface-700 dark:bg-surface-800"
                    >
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-sm"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-surface-900 dark:text-white">{stage.name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-surface-400">
                          <span className="font-semibold">{stage.count}</span>
                          <span>·</span>
                          <span>{pct}%</span>
                        </div>
                      </div>
                      <div
                        className="h-8 w-1 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-surface-400">
              Нет данных
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
