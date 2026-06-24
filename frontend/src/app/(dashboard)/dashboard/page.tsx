"use client";

import { useAuth } from "@/hooks/useAuth";
import { Users, FolderKanban, DollarSign, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";

const stats = [
  {
    name: "Всего клиентов",
    value: "150",
    change: "+5%",
    trend: "up",
    icon: Users,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
  },
  {
    name: "Активные проекты",
    value: "24",
    change: "+12%",
    trend: "up",
    icon: FolderKanban,
    color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
  },
  {
    name: "Доход (мес.)",
    value: "3.2M ₽",
    change: "+8%",
    trend: "up",
    icon: DollarSign,
    color: "text-green-600 bg-green-50 dark:bg-green-900/20",
  },
  {
    name: "Конверсия",
    value: "25%",
    change: "-2%",
    trend: "down",
    icon: TrendingUp,
    color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
  },
];

const recentProjects = [
  { name: "Разработка DEO CRM", status: "В работе", progress: 65, client: "TechCorp" },
  { name: "Сайт DEO Studio", status: "Дизайн", progress: 30, client: "DEO Studio" },
  { name: "Мобильное приложение", status: "Тестирование", progress: 85, client: "StartupX" },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          Доброе утро, {user?.first_name || "Пользователь"} 👋
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
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                    stat.trend === "up" ? "text-success-600" : "text-danger-600"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {stat.change}
                </span>
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
          <button className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Все проекты
          </button>
        </div>
        <div className="space-y-4">
          {recentProjects.map((project) => (
            <div
              key={project.name}
              className="flex items-center justify-between rounded-lg border border-surface-200 p-4 dark:border-surface-700"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-900 dark:text-white">
                  {project.name}
                </p>
                <p className="text-xs text-surface-500">{project.client}</p>
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
                <span className="badge badge-success">{project.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
