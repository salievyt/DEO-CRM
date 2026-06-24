"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  List,
  Columns,
  Clock,
  Play,
  MessageSquare,
  User,
  CalendarDays,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { tasksApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDate, cn } from "@/shared/utils/formatters";
import type { Task, TaskKanbanColumn } from "@/entities/task/types";

export function TaskListPage() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: kanbanData, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.TASK_KANBAN],
    queryFn: () => tasksApi.kanban(),
    select: (res) => res.data as TaskKanbanColumn[],
  });

  const { data: myTasks } = useQuery({
    queryKey: [QUERY_KEYS.TASK_MY],
    queryFn: () => tasksApi.my(),
    select: (res): Task[] => res.data?.results || (res.data as Task[]),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASKS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASK_KANBAN] });
      setShowCreateModal(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Задачи"
        description="Управление задачами и Kanban-доска"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-surface-200 bg-white p-0.5 dark:border-surface-700 dark:bg-surface-800">
              <button
                onClick={() => setView("kanban")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  view === "kanban"
                    ? "bg-brand-600 text-white"
                    : "text-surface-500 hover:bg-surface-50 hover:text-surface-700 dark:hover:bg-surface-700"
                )}
                aria-pressed={view === "kanban"}
              >
                <Columns className="h-4 w-4" />
                <span className="hidden sm:inline">Доска</span>
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  view === "list"
                    ? "bg-brand-600 text-white"
                    : "text-surface-500 hover:bg-surface-50 hover:text-surface-700 dark:hover:bg-surface-700"
                )}
                aria-pressed={view === "list"}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Список</span>
              </button>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              Новая задача
            </Button>
          </div>
        }
      />

      {/* My Tasks section */}
      {myTasks && myTasks.length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Мои задачи
          </h3>
          <div className="space-y-2">
            {myTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex flex-col gap-2 rounded-lg border border-surface-100 p-3 dark:border-surface-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <StatusBadge status={task.status_name} />
                  <span className="truncate text-sm font-medium text-surface-900 dark:text-white">
                    {task.title}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-surface-500">
                  <span className="truncate">{task.project_name}</span>
                  {task.deadline && (
                    <span>до {formatDate(task.deadline)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Kanban Board */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanData?.map((column) => (
            <div key={column.id} className="min-w-[18rem] flex-shrink-0">
              <div className="sticky top-0 z-10 mb-3 flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 dark:border-surface-700 dark:bg-surface-800">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <h3 className="min-w-0 flex-1 truncate font-medium text-surface-900 dark:text-white">
                  {column.title}
                </h3>
                <Badge variant="default">{column.tasks.length}</Badge>
              </div>

              <div className="min-h-40 space-y-2 rounded-lg bg-surface-100/70 p-2 dark:bg-surface-900/40">
                {column.tasks.length === 0 ? (
                  <p className="py-8 text-center text-sm text-surface-400">
                    Нет задач
                  </p>
                ) : (
                  column.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "list" && (
        <Card padding="none">
          <div className="divide-y divide-surface-100 dark:divide-surface-700">
            {(kanbanData || []).flatMap((column) =>
              column.tasks.map((task) => <TaskListItem key={task.id} task={task} />)
            )}
          </div>
        </Card>
      )}

      {/* Create Task Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Новая задача"
        size="lg"
      >
        <TaskForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>
    </div>
  );
}

function TaskListItem({ task }: { task: Task }) {
  const queryClient = useQueryClient();

  const startTimer = useMutation({
    mutationFn: () => tasksApi.timer.start(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASKS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASK_KANBAN] });
    },
  });

  return (
    <div className="flex flex-col gap-3 p-4 transition-colors hover:bg-surface-50 dark:hover:bg-surface-700/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <StatusBadge status={task.status_name} />
          {task.priority_name && (
            <Badge
              variant={
                task.priority_name === "Высокий"
                  ? "danger"
                  : task.priority_name === "Средний"
                  ? "warning"
                  : "default"
              }
            >
              {task.priority_name}
            </Badge>
          )}
        </div>
        <p className="truncate text-sm font-semibold text-surface-900 dark:text-white">
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-surface-500">
          {task.assignee_name && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {task.assignee_name}
            </span>
          )}
          {task.project_name && <span>{task.project_name}</span>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-surface-500">
        {task.deadline && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            до {formatDate(task.deadline)}
          </span>
        )}
        {task.estimated_hours && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {task.estimated_hours}ч
          </span>
        )}
        <button
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-300 dark:hover:bg-brand-900/20"
          type="button"
          onClick={() => startTimer.mutate()}
          disabled={startTimer.isPending}
        >
          <Play className="h-3.5 w-3.5" />
          Таймер
        </button>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const queryClient = useQueryClient();

  const startTimer = useMutation({
    mutationFn: () => tasksApi.timer.start(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASKS] });
    },
  });

  return (
    <div className="rounded-lg border border-surface-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-surface-700 dark:bg-surface-800">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-surface-900 dark:text-white">
          {task.title}
        </p>
        {task.priority_name && (
          <Badge
            variant={
              task.priority_name === "Высокий"
                ? "danger"
                : task.priority_name === "Средний"
                ? "warning"
                : "default"
            }
          >
            {task.priority_name}
          </Badge>
        )}
      </div>

      {task.assignee_name && (
        <div className="mt-2 flex items-center gap-1 text-xs text-surface-500">
          <User className="h-3 w-3" />
          {task.assignee_name}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 text-xs text-surface-400">
        {task.deadline && <span>до {formatDate(task.deadline)}</span>}
        <span>{task.project_name}</span>
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-surface-100 pt-2 dark:border-surface-700">
        <button
          onClick={() => startTimer.mutate()}
          className="flex items-center gap-1 text-xs text-surface-500 hover:text-brand-600"
        >
          <Play className="h-3 w-3" />
          Таймер
        </button>
        <span className="flex items-center gap-1 text-xs text-surface-500">
          <MessageSquare className="h-3 w-3" />
          {task.comment_count}
        </span>
        {task.estimated_hours && (
          <span className="flex items-center gap-1 text-xs text-surface-500">
            <Clock className="h-3 w-3" />
            {task.estimated_hours}ч
          </span>
        )}
      </div>
    </div>
  );
}

function TaskForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    project: "",
    assignee: "",
    status: "",
    priority: "",
    deadline: "",
    estimated_hours: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      estimated_hours: form.estimated_hours
        ? Number(form.estimated_hours)
        : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Название задачи"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        required
      />
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">
          Описание
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="input mt-1"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="ID проекта"
          value={form.project}
          onChange={(e) => setForm({ ...form, project: e.target.value })}
          hint="UUID проекта"
          required
        />
        <Input
          label="ID исполнителя"
          value={form.assignee}
          onChange={(e) => setForm({ ...form, assignee: e.target.value })}
          hint="UUID пользователя"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Срок"
          type="date"
          value={form.deadline}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
        />
        <Input
          label="Оценка (часы)"
          type="number"
          value={form.estimated_hours}
          onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit">Создать задачу</Button>
      </div>
    </form>
  );
}
