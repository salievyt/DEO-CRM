"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  ListChecks,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { analyticsApi } from "@/shared/api/base";
import { cn } from "@/shared/utils/cn";
import { formatDate } from "@/shared/utils/formatters";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

interface DailyBreakdown {
  date: string;
  weekday: number;
  tasks_assigned: number;
  tasks_completed: number;
  tasks_due: number;
  hours_tracked: number;
}

interface MemberData {
  user_id: string;
  user_name: string;
  initials: string;
  daily: DailyBreakdown[];
  total_hours: number;
  avg_daily_tasks: number;
  active_task_count: number;
}

interface WorkloadResponse {
  start_date: string;
  end_date: string;
  total_days: number;
  team: {
    member_count: number;
    total_hours: number;
    total_active_tasks: number;
    avg_hours_per_member: number;
    avg_tasks_per_member: number;
  };
  members: MemberData[];
}

// Heatmap cell color based on workload intensity
function getWorkloadColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "bg-surface-100 dark:bg-surface-800";
  const ratio = value / max;
  if (ratio <= 0.25) return "bg-brand-100 dark:bg-brand-950";
  if (ratio <= 0.5) return "bg-brand-200 dark:bg-brand-900";
  if (ratio <= 0.75) return "bg-brand-400 dark:bg-brand-700";
  if (ratio <= 1.0) return "bg-brand-600 dark:bg-brand-600";
  return "bg-danger-500 dark:bg-danger-600"; // over capacity
}

export function HeatMapPage() {
  const [daysFilter, setDaysFilter] = useState(28);
  const [metricMode, setMetricMode] = useState<"tasks" | "hours">("tasks");

  const { data: workload, isLoading } = useQuery({
    queryKey: ["workload-heatmap", daysFilter],
    queryFn: () =>
      analyticsApi
        .workload({ params: { days: daysFilter } })
        .then((res) => res.data as WorkloadResponse),
  });

  // Compute max values for color normalization
  const maxValues = useMemo(() => {
    if (!workload?.members) return { tasks: 0, hours: 0 };
    let maxTasks = 0;
    let maxHours = 0;
    workload.members.forEach((m) => {
      m.daily.forEach((d) => {
        maxTasks = Math.max(maxTasks, d.tasks_assigned);
        maxHours = Math.max(maxHours, d.hours_tracked);
      });
    });
    return { tasks: maxTasks, hours: maxHours };
  }, [workload]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const members = workload?.members || [];
  const days = members[0]?.daily || [];
  const team = workload?.team;

  return (
    <div className="space-y-6">
      <PageHeader
        title="HeatMap Studio"
        description="Тепловая карта загрузки команды"
      />

      {/* Team Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <div className="flex items-center gap-2 text-brand-600">
            <Users className="h-5 w-5" />
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {team?.member_count || 0}
          </p>
          <p className="text-sm text-surface-500">Участников команды</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-purple-600">
            <Clock className="h-5 w-5" />
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {team?.total_hours || 0} ч
          </p>
          <p className="text-sm text-surface-500">Всего часов (28 дн.)</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-success-600">
            <ListChecks className="h-5 w-5" />
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {team?.total_active_tasks || 0}
          </p>
          <p className="text-sm text-surface-500">Активных задач</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-warning-600">
            <CalendarDays className="h-5 w-5" />
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {team?.avg_hours_per_member || 0} ч
          </p>
          <p className="text-sm text-surface-500">Среднее на участника</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-danger-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {team?.avg_tasks_per_member || 0}
          </p>
          <p className="text-sm text-surface-500">Задач на участника</p>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700">
            <button
              onClick={() => setMetricMode("tasks")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                metricMode === "tasks"
                  ? "bg-brand-600 text-white"
                  : "bg-white text-surface-600 hover:bg-surface-50 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
              )}
            >
              Задачи
            </button>
            <button
              onClick={() => setMetricMode("hours")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                metricMode === "hours"
                  ? "bg-brand-600 text-white"
                  : "bg-white text-surface-600 hover:bg-surface-50 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
              )}
            >
              Часы
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setDaysFilter((prev) => Math.max(7, prev - 7))
            }
            className="rounded-lg border border-surface-200 p-1.5 text-surface-500 hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[100px] text-center text-sm text-surface-600 dark:text-surface-300">
            Последние {daysFilter} дней
          </span>
          <button
            onClick={() =>
              setDaysFilter((prev) => Math.min(90, prev + 7))
            }
            className="rounded-lg border border-surface-200 p-1.5 text-surface-500 hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-surface-500">
        <span>Загрузка:</span>
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-surface-100 dark:bg-surface-800" />
          <span>0%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-brand-200 dark:bg-brand-900" />
          <span>25%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-brand-400 dark:bg-brand-700" />
          <span>50%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-brand-600 dark:bg-brand-600" />
          <span>75%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-danger-500 dark:bg-danger-600" />
          <span>&gt;100%</span>
        </div>
      </div>

      {/* Heatmap */}
      {members.length > 0 && days.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900">
          {/* Header row with day labels and week groupings */}
          <div className="flex">
            {/* Empty top-left corner for user names */}
            <div className="sticky left-0 z-10 flex w-48 flex-shrink-0 items-end border-r border-b border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                Сотрудник
              </span>
            </div>
            {/* Day columns wrapper */}
            <div className="flex flex-1">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${days.length}, minmax(32px, 1fr))`,
                }}
              >
                {/* Week separators */}
                {days.map((d, idx) => {
                  const isMonday = d.weekday === 1;
                  const isWeekend = d.weekday >= 5;
                  return (
                    <div
                      key={d.date}
                      className={cn(
                        "flex h-8 items-center justify-center border-b border-r border-surface-100 text-[10px] font-medium text-surface-400 dark:border-surface-700/50",
                        isMonday && "border-l-2 border-l-brand-300 dark:border-l-brand-700",
                        isWeekend && "bg-surface-50 dark:bg-surface-800/50"
                      )}
                      title={formatDate(d.date)}
                    >
                      {d.weekday === 1 || idx === 0
                        ? formatDate(d.date, "d MMM")
                        : DAY_LABELS[d.weekday] || ""}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Data rows — one per team member */}
          {members.map((member) => (
            <div
              key={member.user_id}
              className="group flex border-b border-surface-100 transition-colors hover:bg-surface-50/50 last:border-0 dark:border-surface-700/50 dark:hover:bg-surface-800/30"
            >
              {/* User info — sticky left column */}
              <div className="sticky left-0 z-10 flex w-48 flex-shrink-0 items-center gap-3 border-r border-surface-200 bg-white p-3 dark:border-surface-700 dark:bg-surface-900">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-white shadow-sm">
                  {member.initials || member.user_name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                    {member.user_name}
                  </p>
                  <p className="text-[10px] text-surface-400">
                    {member.active_task_count} задач · {member.total_hours} ч
                  </p>
                </div>
              </div>

              {/* Heatmap cells */}
              <div
                className="grid flex-1"
                style={{
                  gridTemplateColumns: `repeat(${days.length}, minmax(32px, 1fr))`,
                }}
              >
                {member.daily.map((d) => {
                  const value =
                    metricMode === "tasks"
                      ? d.tasks_assigned
                      : d.hours_tracked;
                  const maxVal =
                    metricMode === "tasks" ? maxValues.tasks : maxValues.hours;
                  const tooltip =
                    metricMode === "tasks"
                      ? `Задач: ${d.tasks_assigned}`
                      : `${d.hours_tracked} ч`;
                  const isWeekend = d.weekday >= 5;

                  return (
                    <div
                      key={d.date}
                      className={cn(
                        "group/cell relative flex items-center justify-center border-b border-r border-surface-100 p-1 transition-all dark:border-surface-700/50",
                        isWeekend && "bg-surface-50 dark:bg-surface-800/50"
                      )}
                      title={`${formatDate(d.date)} — ${tooltip}`}
                    >
                      <div
                        className={cn(
                          "h-full w-full rounded transition-all",
                          getWorkloadColor(value, maxVal)
                        )}
                      />
                      {/* Tooltip on hover */}
                      <div className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover/cell:opacity-100 dark:bg-surface-700">
                        <p className="font-medium">
                          {formatDate(d.date, "d MMM")}
                        </p>
                        <p>
                          {metricMode === "tasks"
                            ? `${d.tasks_assigned} задач`
                            : `${d.hours_tracked} ч`}
                        </p>
                        {d.tasks_completed > 0 && (
                          <p className="text-green-300">
                            ✓ {d.tasks_completed} выполнено
                          </p>
                        )}
                        {d.tasks_due > 0 && (
                          <p className="text-yellow-300">
                            ⏰ {d.tasks_due} дедлайнов
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <div className="flex flex-col items-center py-12 text-center">
            <Users className="mb-3 h-12 w-12 text-surface-300" />
            <p className="text-sm font-medium text-surface-500">
              Нет данных о загрузке команды
            </p>
            <p className="mt-1 text-xs text-surface-400">
              Данные появятся после назначения задач участникам
            </p>
          </div>
        </Card>
      )}

      {/* Member detail table */}
      {members.length > 0 && (
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Детальная статистика по участникам
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700">
                  <th className="pb-2 pr-4 font-medium text-surface-500">
                    Сотрудник
                  </th>
                  <th className="pb-2 pr-4 font-medium text-surface-500">
                    Активных задач
                  </th>
                  <th className="pb-2 pr-4 font-medium text-surface-500">
                    Всего часов
                  </th>
                  <th className="pb-2 pr-4 font-medium text-surface-500">
                    Среднее задач/день
                  </th>
                  <th className="pb-2 font-medium text-surface-500">
                    Загрузка
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const maxHours = 40; // 40h/week baseline
                  const loadPercent = Math.min(
                    Math.round(
                      ((member.total_hours / Math.max(days.length / 7, 1)) /
                        maxHours) *
                        100
                    ),
                    100
                  );
                  return (
                    <tr
                      key={member.user_id}
                      className="border-b border-surface-100 last:border-0 dark:border-surface-700/50"
                    >
                      <td className="py-3 pr-4 font-medium text-surface-900 dark:text-white">
                        {member.user_name}
                      </td>
                      <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">
                        {member.active_task_count}
                      </td>
                      <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">
                        {member.total_hours} ч
                      </td>
                      <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">
                        {member.avg_daily_tasks}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 rounded-full bg-surface-200 dark:bg-surface-700">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-all",
                                loadPercent <= 50
                                  ? "bg-success-500"
                                  : loadPercent <= 75
                                    ? "bg-warning-500"
                                    : "bg-danger-500"
                              )}
                              style={{ width: `${loadPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-surface-500">
                            {loadPercent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
