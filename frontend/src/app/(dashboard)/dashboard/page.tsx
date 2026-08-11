"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Users, FolderKanban, DollarSign, CheckSquare } from "lucide-react";
import { analyticsApi, projectsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatCurrency } from "@/shared/utils/formatters";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: summary, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.SUMMARY_METRICS],
    queryFn: () => analyticsApi.summary(),
    select: (res) => res.data as {
      total_clients: number;
      active_projects: number;
      monthly_revenue: number;
      open_tasks: number;
    } | undefined,
  });

  const { data: projects } = useQuery({
    queryKey: [QUERY_KEYS.PROJECTS],
    queryFn: () => projectsApi.list({ ordering: "-created_at" }),
    select: (res) => (res.data?.results || []) as {
      id: string;
      name: string;
      client_name: string;
      status_name: string;
      status_color: string;
      progress: number;
    }[],
  });

  const TERMINAL_STATUSES = ["Завершён", "Отменён", "На паузе"];
  const activeProjects = (projects || []).filter(
    (p) => !TERMINAL_STATUSES.includes(p.status_name)
  );
  const recentProjects = activeProjects.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = [
    {
      name: "Всего клиентов",
      value: summary?.total_clients?.toString() || "0",
      icon: Users,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    },
    {
      name: "Активные проекты",
      value: summary?.active_projects?.toString() || "0",
      icon: FolderKanban,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
    },
    {
      name: "Доход (мес.)",
      value: formatCurrency(summary?.monthly_revenue || 0),
      icon: DollarSign,
      color: "text-green-600 bg-green-50 dark:bg-green-900/20",
    },
    {
      name: "Открытые задачи",
      value: summary?.open_tasks?.toString() || "0",
      icon: CheckSquare,
      color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          Доброго времени суток, {user?.first_name || "Пользователь"} 👋
        </h1>
        <p className="mt-1 text-sm text-surface-500">
          Вот что происходит в вашей студии сегодня
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center justify-between">
                <div className={`rounded-lg p-2 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-surface-900 dark:text-white">
                {stat.value}
              </p>
              <p className="text-sm text-surface-500">{stat.name}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Projects */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
            Активные проекты
          </h2>
          <a
            href="/projects"
            className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            Все проекты
          </a>
        </div>
        {recentProjects.length > 0 ? (
          <div className="space-y-4">
            {recentProjects.map((project) => (
              <a
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between rounded-lg border border-surface-200 p-4 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-900 dark:text-white">
                    {project.name}
                  </p>
                  <p className="text-xs text-surface-500">{project.client_name}</p>
                </div>
                <div className="ml-4 flex items-center gap-4">
                  <div className="w-32">
                    <div className="flex items-center justify-between text-xs text-surface-500 mb-1">
                      <span>{project.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-700">
                      <div
                        className="h-2 rounded-full bg-brand-600 transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: project.status_color + "20",
                      color: project.status_color,
                    }}
                  >
                    {project.status_name}
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-surface-400">
            Нет активных проектов
          </p>
        )}
      </div>
    </div>
  );
}
