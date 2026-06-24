"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  List,
  Columns,
  Clock,
  Play,
  Square,
  MessageSquare,
  User,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { tasksApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDate, timeAgo, cn } from "@/shared/utils/formatters";
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
    select: (res) => res.data?.results || res.data as Task[],
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
            <div className="flex rounded-lg border border-surface-200 p-0.5 dark:border-surface-700">
              <button
                onClick={() => setView("kanban")}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  view === "kanban"
                    ? "bg-brand-600 text-white"
                    : "text-surface-500 hover:text-surface-700"
                )}
              >
                <Columns className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  view === "list"
                    ? "bg-brand-600 text-white"
                    : "text-surface-500 hover:text-surface-700"
                )}
              >
                <List className="h-4 w-4" />
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
                className="flex items-center justify-between rounded-lg border border-surface-100 p-3 dark:border-surface-700"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={task.status_name} />
                  <span className="text-sm font-medium text-surface-900 dark:text-white">
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-surface-500">
                  <span>{task.project_name}</span>
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
            <div key={column.id} className="min-w-[280px] flex-shrink-0">
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <h3 className="font-medium text-surface-900 dark:text-white">
                  {column.title}
                </h3>
                <Badge variant="default">{column.tasks.length}</Badge>
              </div>

              <div className="space-y-2">
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
