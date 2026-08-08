"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  GraduationCap,
  ClipboardCheck,
  Star,
  Plus,
  Clock,
  CalendarDays,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Activity,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Tabs } from "@/shared/ui/Tabs";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { mentorshipApi } from "@/shared/api/base";
import { formatDate, cn } from "@/shared/utils/formatters";

const MENTORSHIP_TABS = [
  { value: "overview", label: "Обзор" },
  { value: "pairs", label: "Пары" },
  { value: "checklists", label: "Чек-листы" },
  { value: "tasks", label: "Задачи" },
];

// ---- Types ----

interface DashboardData {
  total_pairs: number;
  active_pairs: number;
  completed_pairs: number;
  pending_review_tasks: number;
  avg_rating: number;
}

interface Pair {
  id: string;
  mentor_name: string;
  mentee_name: string;
  status: "active" | "completed" | "paused";
  started_at: string;
  completed_at: string | null;
  progress_percent: number;
  task_count: number;
  completed_task_count: number;
  notes: string;
}

interface ChecklistItemData {
  id: string;
  item_id: string;
  title: string;
  description: string;
  is_required: boolean;
  completed: boolean;
  completed_at: string | null;
  notes: string;
}

interface ChecklistProgress {
  id: string;
  pair: string;
  checklist_title: string;
  checklist_description: string;
  progress_percent: number;
  total_items: number;
  completed_items: number;
  items: ChecklistItemData[];
}

interface MenteeTask {
  id: string;
  pair: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "review" | "done" | "overdue";
  deadline: string | null;
  completed_at: string | null;
  order: number;
}

// ---- Status helpers ----

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  active: { label: "Активен", variant: "success" },
  completed: { label: "Завершён", variant: "default" },
  paused: { label: "Приостановлен", variant: "warning" },
  pending: { label: "Ожидает", variant: "default" },
  in_progress: { label: "В работе", variant: "warning" },
  review: { label: "На проверке", variant: "warning" },
  done: { label: "Выполнено", variant: "success" },
  overdue: { label: "Просрочено", variant: "danger" },
};

// ---- Main Component ----

export function MentorshipPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Система наставничества"
        description="Адаптация новых сотрудников, передача знаний и оценка прогресса"
        actions={
          <Button onClick={() => setActiveTab("pairs")}>
            <Plus className="h-4 w-4" />
            Новая пара
          </Button>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        tabs={MENTORSHIP_TABS}
      />

      {activeTab === "overview" && <MentorshipOverview />}
      {activeTab === "pairs" && <MentorshipPairs />}
      {activeTab === "checklists" && <MentorshipChecklists />}
      {activeTab === "tasks" && <MentorshipTasks />}
    </div>
  );
}

// ---- Overview Tab ----

function MentorshipOverview() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["mentorship-dashboard"],
    queryFn: () => mentorshipApi.pairs.dashboard(),
    select: (res) => res.data as DashboardData,
  });

  if (isLoading) {
    return <div className="flex h-48 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/20">
            <Users className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {dashboard.total_pairs}
          </p>
          <p className="text-xs text-surface-500">Всего пар</p>
        </Card>
        <Card className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-success-50 dark:bg-green-900/20">
            <UserCheck className="h-5 w-5 text-success-600 dark:text-green-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-success-600 dark:text-green-400">
            {dashboard.active_pairs}
          </p>
          <p className="text-xs text-surface-500">Активных</p>
        </Card>
        <Card className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-700">
            <GraduationCap className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-brand-600 dark:text-brand-400">
            {dashboard.completed_pairs}
          </p>
          <p className="text-xs text-surface-500">Завершено</p>
        </Card>
        <Card className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
            <ClipboardCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {dashboard.pending_review_tasks}
          </p>
          <p className="text-xs text-surface-500">На проверке</p>
        </Card>
        <Card className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-700">
            <Star className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-brand-600 dark:text-brand-400">
            {dashboard.avg_rating}
          </p>
          <p className="text-xs text-surface-500">Средняя оценка</p>
        </Card>
      </div>

      {/* Recent pairs */}
      <RecentPairsSection />
    </div>
  );
}

function RecentPairsSection() {
  const { data: pairs } = useQuery({
    queryKey: ["mentorship-pairs", { limit: 3 }],
    queryFn: () => mentorshipApi.pairs.list(),
    select: (res): Pair[] => res.data?.results || (res.data as Pair[]) || [],
  });

  if (!pairs || pairs.length === 0) {
    return <EmptyState title="Нет пар" description="Создайте первую пару наставник-новичок" />;
  }

  return (
    <Card padding="none">
      <div className="border-b border-surface-200 px-4 py-3 dark:border-surface-700">
        <h3 className="text-sm font-semibold text-surface-900 dark:text-white">
          Последние пары
        </h3>
      </div>
      <div className="divide-y divide-surface-100 dark:divide-surface-700">
        {pairs.slice(0, 3).map((pair) => (
          <div key={pair.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-brand-500" />
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-white">
                  {pair.mentor_name} → {pair.mentee_name}
                </p>
                <p className="text-xs text-surface-500">
                  С {formatDate(pair.started_at)} · {pair.progress_percent}% прогресс
                </p>
              </div>
            </div>
            <Badge variant={statusConfig[pair.status]?.variant || "default"}>
              {statusConfig[pair.status]?.label || pair.status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---- Pairs Tab ----

function MentorshipPairs() {
  const { data: pairs, isLoading } = useQuery({
    queryKey: ["mentorship-pairs"],
    queryFn: () => mentorshipApi.pairs.list(),
    select: (res): Pair[] => res.data?.results || (res.data as Pair[]) || [],
  });

  const [expandedPair, setExpandedPair] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex h-48 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!pairs || pairs.length === 0) {
    return <EmptyState title="Нет пар" description="Создайте первую пару наставник-новичок" />;
  }

  return (
    <div className="space-y-3">
      {pairs.map((pair) => {
        const isExpanded = expandedPair === pair.id;
        return (
          <Card key={pair.id} className="overflow-hidden">
            <button
              onClick={() => setExpandedPair(isExpanded ? null : pair.id)}
              className="flex w-full items-center justify-between p-4 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                    {(pair.mentor_name?.[0] || "?").toUpperCase()}
                  </div>
                  <ChevronRight className="h-4 w-4 text-surface-400" />
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-100 text-sm font-bold text-success-700 dark:bg-green-900/30 dark:text-green-400">
                    {(pair.mentee_name?.[0] || "?").toUpperCase()}
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-surface-900 dark:text-white">
                    {pair.mentor_name} → {pair.mentee_name}
                  </p>
                  <p className="text-xs text-surface-500">
                    Задач: {pair.completed_task_count}/{pair.task_count}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-20 rounded-full bg-surface-200 dark:bg-surface-700">
                    <div
                      className="h-2 rounded-full bg-brand-500 transition-all"
                      style={{ width: `${pair.progress_percent}%` }}
                    />
                  </div>
                  <span className="text-xs text-surface-500">{pair.progress_percent}%</span>
                </div>
                <Badge variant={statusConfig[pair.status]?.variant || "default"}>
                  {statusConfig[pair.status]?.label || pair.status}
                </Badge>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-surface-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-surface-400" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-surface-100 p-4 dark:border-surface-700">
                <PairDetail pair={pair} />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function PairDetail({ pair }: { pair: Pair }) {
  const { data: checklistProgress } = useQuery({
    queryKey: ["mentorship-checklist-progress", pair.id],
    queryFn: () => mentorshipApi.checklistProgress.list({ pair: pair.id }),
    select: (res): ChecklistProgress[] => res.data?.results || (res.data as ChecklistProgress[]),
  });

  const { data: tasks } = useQuery({
    queryKey: ["mentorship-tasks", pair.id],
    queryFn: () => mentorshipApi.tasks.list({ pair: pair.id }),
    select: (res): MenteeTask[] => res.data?.results || (res.data as MenteeTask[]),
  });

  return (
    <div className="space-y-4">
      {/* Checklists progress */}
      {checklistProgress && checklistProgress.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">
            Чек-листы адаптации
          </h4>
          <div className="space-y-2">
            {checklistProgress.map((cp) => (
              <div key={cp.id} className="rounded-lg border border-surface-100 p-3 dark:border-surface-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-surface-900 dark:text-white">
                    {cp.checklist_title}
                  </p>
                  <span className="text-xs font-medium text-brand-600">
                    {cp.completed_items}/{cp.total_items}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-200 dark:bg-surface-700">
                  <div
                    className="h-1.5 rounded-full bg-brand-500 transition-all"
                    style={{ width: `${cp.progress_percent}%` }}
                  />
                </div>
                <div className="mt-2 space-y-1">
                  {cp.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 text-xs">
                      {item.completed ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-success-500" />
                      ) : (
                        <Circle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-surface-300" />
                      )}
                      <span className={cn(
                        "text-surface-600 dark:text-surface-400",
                        item.completed && "line-through text-surface-400 dark:text-surface-500"
                      )}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks */}
      {tasks && tasks.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">
            Задачи новичка
          </h4>
          <div className="space-y-1">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-lg border border-surface-100 p-2.5 dark:border-surface-700">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <StatusIcon status={task.status} />
                  <span className="truncate text-sm text-surface-700 dark:text-surface-200">
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {task.deadline && (
                    <span className="flex items-center gap-1 text-xs text-surface-400">
                      <CalendarDays className="h-3 w-3" />
                      {formatDate(task.deadline)}
                    </span>
                  )}
                  <Badge variant={statusConfig[task.status]?.variant || "default"}>
                    {statusConfig[task.status]?.label || task.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pair.notes && (
        <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800">
          <p className="text-xs font-medium text-surface-500 mb-1">Заметки</p>
          <p className="text-sm text-surface-700 dark:text-surface-300">{pair.notes}</p>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-success-500" />;
  if (status === "overdue") return <AlertCircle className="h-4 w-4 text-danger-500" />;
  if (status === "in_progress" || status === "review") return <Activity className="h-4 w-4 text-amber-500" />;
  return <Circle className="h-4 w-4 text-surface-300" />;
}

// ---- Checklists Tab ----

function MentorshipChecklists() {
  const { data: checklists, isLoading } = useQuery({
    queryKey: ["mentorship-checklists"],
    queryFn: () => mentorshipApi.checklists.list(),
    select: (res): any[] => res.data?.results || (res.data as any[]) || [],
  });

  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex h-48 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!checklists || checklists.length === 0) {
    return <EmptyState title="Нет чек-листов" description="Создайте шаблоны чек-листов адаптации" />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {checklists.map((cl: any) => {
        const isExpanded = expanded === cl.id;
        return (
          <Card key={cl.id}>
            <button
              onClick={() => setExpanded(isExpanded ? null : cl.id)}
              className="flex w-full items-start justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-brand-500" />
                  <h3 className="font-medium text-surface-900 dark:text-white">{cl.title}</h3>
                </div>
                {cl.description && (
                  <p className="mt-1 text-xs text-surface-500">{cl.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">{cl.item_count || cl.items?.length || 0} пунктов</Badge>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </button>

            {isExpanded && cl.items && cl.items.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-surface-100 pt-3 dark:border-surface-700">
                {cl.items.map((item: any) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <Circle className="mt-0.5 h-3 w-3 flex-shrink-0 text-surface-300" />
                    <div>
                      <p className="text-sm text-surface-700 dark:text-surface-300">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-surface-400">{item.description}</p>
                      )}
                    </div>
                    {item.is_required && (
                      <Badge variant="danger" className="text-[9px] ml-auto">Обязательно</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ---- Tasks Tab ----

function MentorshipTasks() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["mentorship-tasks"],
    queryFn: () => mentorshipApi.tasks.list(),
    select: (res): MenteeTask[] => res.data?.results || (res.data as MenteeTask[]) || [],
  });

  if (isLoading) {
    return <div className="flex h-48 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!tasks || tasks.length === 0) {
    return <EmptyState title="Нет задач" description="Задачи для новичков будут отображаться здесь" />;
  }

  const tasksByStatus = {
    pending: tasks.filter((t) => t.status === "pending"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    review: tasks.filter((t) => t.status === "review"),
    done: tasks.filter((t) => t.status === "done"),
    overdue: tasks.filter((t) => t.status === "overdue"),
  };

  return (
    <div className="space-y-6">
      {/* Status columns */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
          <div key={status}>
            <div className="mb-2 flex items-center gap-2">
              <StatusIcon status={status} />
              <h3 className="text-sm font-medium text-surface-700 dark:text-surface-200">
                {statusConfig[status]?.label || status}
              </h3>
              <Badge variant="default">{statusTasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {statusTasks.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-surface-200 dark:border-surface-700">
                  <p className="text-xs text-surface-400">Нет задач</p>
                </div>
              ) : (
                statusTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-surface-100 bg-white p-3 dark:border-surface-700 dark:bg-surface-800">
                    <p className="text-sm font-medium text-surface-900 dark:text-white">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="mt-1 text-xs text-surface-500 line-clamp-2">{task.description}</p>
                    )}
                    {task.deadline && (
                      <p className="mt-2 flex items-center gap-1 text-xs text-surface-400">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(task.deadline)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
