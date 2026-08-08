"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Clock,
  Target,
  CheckCircle2,
  Calendar,
  Plus,
  User,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Select } from "@/shared/ui/Select";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { crmApi, tasksApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDate, formatDateTime, cn } from "@/shared/utils/formatters";

export function FollowUpPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState("all");
  const queryClient = useQueryClient();

  const { data: followup, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.LEADS, "followup"],
    queryFn: () => crmApi.leads.followup(),
    select: (res) => res.data as {
      overdue: any[];
      today: any[];
      upcoming: any[];
    },
  });

  const allTasks = [
    ...(followup?.overdue || []).map((t: any) => ({ ...t, _group: "overdue" })),
    ...(followup?.today || []).map((t: any) => ({ ...t, _group: "today" })),
    ...(followup?.upcoming || []).map((t: any) => ({ ...t, _group: "upcoming" })),
  ];

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEADS, "followup"] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASKS] });
      setShowCreateModal(false);
    },
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  const totalOverdue = followup?.overdue?.length || 0;
  const totalToday = followup?.today?.length || 0;
  const totalUpcoming = followup?.upcoming?.length || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Задачи / Follow-up"
        description="Напоминания, просроченные задачи и план на день"
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Создать задачу
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className={cn("border-l-4", totalOverdue > 0 ? "border-l-danger-500" : "border-l-surface-200")}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-500">Просрочено</p>
            <AlertCircle className={cn("h-5 w-5", totalOverdue > 0 ? "text-danger-500" : "text-surface-300")} />
          </div>
          <p className={cn("mt-1 text-2xl font-bold", totalOverdue > 0 ? "text-danger-600" : "text-surface-900 dark:text-white")}>
            {totalOverdue}
          </p>
        </Card>
        <Card className={cn("border-l-4", totalToday > 0 ? "border-l-warning-500" : "border-l-surface-200")}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-500">На сегодня</p>
            <Clock className={cn("h-5 w-5", totalToday > 0 ? "text-warning-500" : "text-surface-300")} />
          </div>
          <p className={cn("mt-1 text-2xl font-bold", totalToday > 0 ? "text-warning-600" : "text-surface-900 dark:text-white")}>
            {totalToday}
          </p>
        </Card>
        <Card className="border-l-4 border-l-brand-500">
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-500">На неделе</p>
            <Target className="h-5 w-5 text-brand-500" />
          </div>
          <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
            {totalUpcoming}
          </p>
        </Card>
      </div>

      {/* Today's Plan */}
      {totalToday > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-warning-600">
            <Clock className="h-4 w-4" />
            План на сегодня
          </h3>
          <TaskSection tasks={followup?.today || []} />
        </div>
      )}

      {/* Overdue */}
      {totalOverdue > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-danger-600">
            <AlertCircle className="h-4 w-4" />
            Просроченные задачи
          </h3>
          <TaskSection tasks={followup?.overdue || []} />
        </div>
      )}

      {/* Upcoming */}
      {totalUpcoming > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-600">
            <Target className="h-4 w-4" />
            Предстоящие (7 дней)
          </h3>
          <TaskSection tasks={followup?.upcoming || []} />
        </div>
      )}

      {(!totalOverdue && !totalToday && !totalUpcoming) && (
        <EmptyState
          title="Нет задач"
          description="Создайте задачу для отслеживания follow-up по лидам"
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              Создать задачу
            </Button>
          }
        />
      )}

      {/* Create Task Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Новая задача">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data: Record<string, unknown> = {};
            formData.forEach((v, k) => { data[k] = v; });
            createMutation.mutate(data);
          }}
          className="space-y-4"
        >
          <Input label="Название" name="title" required />
          <Input label="Описание" name="description" />
          <Input label="Срок" name="deadline" type="date" />
          <Select
            label="Приоритет"
            name="priority"
            options={[
              { value: "", label: "Обычный" },
              { value: "high", label: "Высокий" },
              { value: "urgent", label: "Срочный" },
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>Отмена</Button>
            <Button type="submit">Создать</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TaskSection({ tasks }: { tasks: any[] }) {
  return (
    <Card padding="none">
      <div className="divide-y divide-surface-100 dark:divide-surface-700">
        {tasks.map((task: any) => (
          <div
            key={task.id}
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50"
          >
            <div className="flex items-center gap-3 min-w-0">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-surface-400" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {task.project_name && (
                    <span className="text-xs text-surface-500">{task.project_name}</span>
                  )}
                  {task.assignee_name && (
                    <span className="flex items-center gap-1 text-xs text-surface-400">
                      <User className="h-3 w-3" />
                      {task.assignee_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {task.deadline && (
                <span className={cn(
                  "flex items-center gap-1 text-xs whitespace-nowrap",
                  new Date(task.deadline) < new Date() ? "text-danger-500" : "text-surface-400"
                )}>
                  <Calendar className="h-3 w-3" />
                  {formatDate(task.deadline)}
                </span>
              )}
              {task.status_name && (
                <span
                  className="rounded px-1.5 py-0.5 text-xs"
                  style={{ backgroundColor: task.status_color + "20", color: task.status_color }}
                >
                  {task.status_name}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
