"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CheckSquare,
  CircleDollarSign,
  FolderKanban,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { analyticsApi, projectsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatCurrency } from "@/shared/utils/formatters";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { FollowUpPanel } from "@/features/growth/FollowUpPanel";
import { OverduePaymentsPanel } from "@/features/growth/OverduePaymentsPanel";
import { ProjectsHealthPanel } from "@/features/growth/ProjectsHealthPanel";

type Project = {
  id: string;
  name: string;
  client_name: string;
  status_name: string;
  status_color: string;
  progress: number;
};

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: summary, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.SUMMARY_METRICS],
    queryFn: () => analyticsApi.summary(),
    select: (res) =>
      res.data as
        | {
            total_clients: number;
            active_projects: number;
            monthly_revenue: number;
            open_tasks: number;
          }
        | undefined,
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: [QUERY_KEYS.PROJECTS],
    queryFn: () => projectsApi.list({ ordering: "-created_at" }),
    select: (res) => (res.data?.results || []) as Project[],
  });

  const terminalStatuses = ["Завершён", "Отменён", "На паузе"];
  const recentProjects = (projects || [])
    .filter((project) => !terminalStatuses.includes(project.status_name))
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const today = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const stats = [
    {
      name: "Клиенты",
      value: summary?.total_clients?.toLocaleString("ru-RU") || "0",
      detail: "в клиентской базе",
      icon: Users,
      href: "/clients",
      tone: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    },
    {
      name: "Активные проекты",
      value: summary?.active_projects?.toLocaleString("ru-RU") || "0",
      detail: "сейчас в работе",
      icon: FolderKanban,
      href: "/projects",
      tone: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    },
    {
      name: "Доход за месяц",
      value: formatCurrency(summary?.monthly_revenue || 0),
      detail: "по данным CRM",
      icon: CircleDollarSign,
      href: "/finance",
      tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    },
    {
      name: "Открытые задачи",
      value: summary?.open_tasks?.toLocaleString("ru-RU") || "0",
      detail: "ожидают выполнения",
      icon: CheckSquare,
      href: "/tasks",
      tone: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    },
  ];

  return (
    <main className="space-y-8 pb-8">
      <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-500 px-6 py-7 text-white shadow-lg md:px-8 md:py-8">
        <div className="pointer-events-none absolute -right-12 -top-28 -z-10 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 right-1/3 -z-10 h-56 w-56 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-sm font-medium capitalize text-blue-100">{today}</p>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Добро пожаловать, {user?.first_name || "коллега"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-blue-100 md:text-base">
              Здесь собраны контакты, деньги и проекты, которым нужно ваше внимание.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/leads/follow-up"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-600"
            >
              План контактов <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/analytics"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            >
              Аналитика <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Показатели студии" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.name}
              href={stat.href}
              className="group rounded-2xl border border-surface-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-brand-700"
            >
              <div className="flex items-start justify-between gap-4">
                <span className={`rounded-xl p-2.5 ${stat.tone}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <ArrowUpRight
                  className="h-4 w-4 text-surface-400 transition group-hover:text-brand-600"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-5 text-2xl font-bold tracking-tight text-surface-900 dark:text-white">
                {stat.value}
              </p>
              <p className="mt-1 text-sm font-medium text-surface-700 dark:text-surface-200">
                {stat.name}
              </p>
              <p className="mt-1 text-xs text-surface-500">{stat.detail}</p>
            </Link>
          );
        })}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
            Оперативная работа
          </h2>
          <p className="mt-1 text-sm text-surface-500">Что стоит закрыть в первую очередь</p>
        </div>
        <div className="grid items-start gap-5 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-7">
            <FollowUpPanel />
          </div>
          <div className="min-w-0 xl:col-span-5">
            <OverduePaymentsPanel />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Обзор проектов</h2>
          <p className="mt-1 text-sm text-surface-500">Состояние портфеля и ход текущей работы</p>
        </div>
        <div className="grid items-start gap-5 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-5">
            <ProjectsHealthPanel />
          </div>
          <section className="card min-w-0 xl:col-span-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-surface-900 dark:text-white">
                  Текущие проекты
                </h3>
                <p className="mt-1 text-sm text-surface-500">
                  Недавно обновлённые проекты в работе
                </p>
              </div>
              <Link
                href="/projects"
                className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                Все проекты <span aria-hidden="true">→</span>
              </Link>
            </div>

            {projectsLoading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner />
              </div>
            ) : recentProjects.length ? (
              <div className="divide-y divide-surface-100 dark:divide-surface-700">
                {recentProjects.map((project) => {
                  const progress = Math.min(100, Math.max(0, Number(project.progress) || 0));
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="block rounded-lg px-2 py-4 transition hover:bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:hover:bg-surface-700/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                            {project.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-surface-500">
                            {project.client_name || "Клиент не указан"}
                          </p>
                        </div>
                        <span
                          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: `${project.status_color || "#64748b"}20`,
                            color: project.status_color || "#64748b",
                          }}
                        >
                          {project.status_name || "Без статуса"}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700">
                          <div
                            className="h-full rounded-full bg-brand-600 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs tabular-nums text-surface-500">
                          {progress}%
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-surface-300 px-4 py-10 text-center dark:border-surface-600">
                <FolderKanban className="mx-auto h-8 w-8 text-surface-400" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-surface-700 dark:text-surface-200">
                  Пока нет активных проектов
                </p>
                <p className="mt-1 text-sm text-surface-500">
                  Когда проект появится в CRM, он будет отображаться здесь.
                </p>
                <Link href="/projects" className="btn-secondary mt-4">
                  Открыть проекты
                </Link>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
