"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderKanban,
  Plus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { tasksApi, projectsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { cn } from "@/shared/utils/cn";
import { formatDate } from "@/shared/utils/formatters";
import type { Task } from "@/entities/task/types";
import type { Project } from "@/entities/project/types";

const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: "task" | "project";
  meta?: string;
  priority?: string | null;
};

export function CalendarPage() {
  const [visibleDate, setVisibleDate] = useState(() => new Date());

  const { data: upcomingTasks, isLoading: tasksLoading } = useQuery({
    queryKey: [QUERY_KEYS.TASK_UPCOMING],
    queryFn: () => tasksApi.upcoming(),
    select: (res): Task[] => res.data?.results || (res.data as Task[]),
  });

  const { data: projects } = useQuery({
    queryKey: [QUERY_KEYS.PROJECTS, "calendar"],
    queryFn: () => projectsApi.list(),
    select: (res): Project[] => res.data?.results || (res.data as Project[]),
  });

  const events = useMemo<CalendarEvent[]>(() => {
    const taskEvents =
      upcomingTasks
        ?.filter((task) => task.deadline)
        .map((task) => ({
          id: task.id,
          title: task.title,
          date: task.deadline as string,
          type: "task" as const,
          meta: task.project_name,
          priority: task.priority_name,
        })) || [];

    const projectEvents =
      projects
        ?.filter((project) => project.deadline)
        .map((project) => ({
          id: project.id,
          title: project.name,
          date: project.deadline as string,
          type: "project" as const,
          meta: project.client_name,
        })) || [];

    return [...taskEvents, ...projectEvents].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [projects, upcomingTasks]);

  const calendarDays = useMemo(() => {
    const year = visibleDate.getFullYear();
    const month = visibleDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ date: Date; inMonth: boolean; events: CalendarEvent[] }> = [];

    for (let index = 0; index < 42; index += 1) {
      const day = index - startOffset + 1;
      const date = new Date(year, month, day);
      const key = toDateKey(date);

      cells.push({
        date,
        inMonth: day >= 1 && day <= daysInMonth,
        events: events.filter((event) => toDateKey(new Date(event.date)) === key),
      });
    }

    return cells;
  }, [events, visibleDate]);

  const todayKey = toDateKey(new Date());
  const selectedMonthLabel = `${monthNames[visibleDate.getMonth()]} ${visibleDate.getFullYear()}`;
  const monthEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    return (
      eventDate.getMonth() === visibleDate.getMonth() &&
      eventDate.getFullYear() === visibleDate.getFullYear()
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Календарь"
        description="Дедлайны, встречи и контрольные точки проектов"
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Добавить событие
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-surface-200 px-4 py-3 dark:border-surface-700 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">
                {selectedMonthLabel}
              </p>
              <p className="text-xs text-surface-500">
                {monthEvents.length} событий в месяце
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-surface-200 p-2 text-surface-500 hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700"
                onClick={() =>
                  setVisibleDate(new Date(visibleDate.getFullYear(), visibleDate.getMonth() - 1, 1))
                }
                aria-label="Предыдущий месяц"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setVisibleDate(new Date())}
              >
                Сегодня
              </Button>
              <button
                type="button"
                className="rounded-lg border border-surface-200 p-2 text-surface-500 hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700"
                onClick={() =>
                  setVisibleDate(new Date(visibleDate.getFullYear(), visibleDate.getMonth() + 1, 1))
                }
                aria-label="Следующий месяц"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800">
            {weekDays.map((day) => (
              <div key={day} className="px-3 py-2 text-center text-xs font-semibold text-surface-500">
                {day}
              </div>
            ))}
          </div>

          {tasksLoading ? (
            <div className="flex h-96 items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarDays.map((cell) => {
                const key = toDateKey(cell.date);
                const isToday = key === todayKey;

                return (
                  <div
                    key={key}
                    className={cn(
                      "min-h-28 border-b border-r border-surface-100 p-2 dark:border-surface-700",
                      !cell.inMonth && "bg-surface-50/70 text-surface-400 dark:bg-surface-900/30",
                      isToday && "bg-brand-50/60 dark:bg-brand-900/10"
                    )}
                  >
                    <div
                      className={cn(
                        "mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                        isToday
                          ? "bg-brand-600 text-white"
                          : "text-surface-600 dark:text-surface-300"
                      )}
                    >
                      {cell.date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {cell.events.slice(0, 3).map((event) => (
                        <div
                          key={`${event.type}-${event.id}`}
                          className={cn(
                            "truncate rounded-md px-2 py-1 text-xs font-medium",
                            event.type === "task"
                              ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                              : "bg-success-50 text-success-600 dark:bg-green-900/20 dark:text-green-300"
                          )}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {cell.events.length > 3 && (
                        <p className="px-2 text-xs text-surface-400">
                          +{cell.events.length - 3}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-900 dark:text-white">
                  Ближайшие события
                </p>
                <p className="text-xs text-surface-500">
                  Следующие дедлайны и контрольные точки
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {events.slice(0, 6).map((event) => (
                <div
                  key={`${event.type}-side-${event.id}`}
                  className="rounded-lg border border-surface-200 p-3 dark:border-surface-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                        {event.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-surface-500">
                        {event.meta || "Без проекта"}
                      </p>
                    </div>
                    <Badge variant={event.type === "task" ? "info" : "success"}>
                      {event.type === "task" ? "Задача" : "Проект"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-surface-500">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(event.date)}
                  </div>
                </div>
              ))}

              {events.length === 0 && (
                <div className="rounded-lg border border-dashed border-surface-200 p-6 text-center text-sm text-surface-500 dark:border-surface-700">
                  Событий пока нет
                </div>
              )}
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <MetricCard icon={Clock} label="На этой неделе" value={countThisWeek(events)} />
            <MetricCard icon={FolderKanban} label="Проектные дедлайны" value={events.filter((event) => event.type === "project").length} />
            <MetricCard icon={Users} label="Задачи команды" value={events.filter((event) => event.type === "task").length} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-sm text-surface-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
          {value}
        </p>
      </div>
      <Icon className="h-5 w-5 text-surface-400" />
    </Card>
  );
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function countThisWeek(events: CalendarEvent[]) {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return events.filter((event) => {
    const date = new Date(event.date);
    return date >= start && date < end;
  }).length;
}
