"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { formatDate, timeAgo } from "@/shared/utils/formatters";
import { cn } from "@/shared/utils/cn";
import { User, Clock, MessageSquare } from "lucide-react";
import type { TaskKanbanColumn } from "@/entities/task/types";

interface KanbanBoardProps {
  compact?: boolean;
}

export function KanbanBoard({ compact = false }: KanbanBoardProps) {
  const { data: kanbanData, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.TASK_KANBAN],
    queryFn: () => tasksApi.kanban(),
    select: (res) => res.data as TaskKanbanColumn[],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!kanbanData || kanbanData.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-surface-500">Нет задач для отображения</p>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-4 overflow-x-auto pb-4", compact && "max-h-[400px] overflow-y-hidden")}>
      {kanbanData.map((column) => (
        <div key={column.id} className="min-w-[260px] flex-shrink-0">
          <div className="mb-3 flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: column.color || "#6366f1" }}
            />
            <h3 className="font-medium text-surface-900 dark:text-white text-sm">
              {column.title}
            </h3>
            <Badge variant="default" className="ml-auto">
              {column.tasks.length}
            </Badge>
          </div>

          <div className="space-y-2">
            {column.tasks.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-surface-200 p-4 text-center text-xs text-surface-400 dark:border-surface-700">
                Нет задач
              </div>
            ) : (
              column.tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-surface-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-surface-700 dark:bg-surface-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-surface-900 dark:text-white line-clamp-2">
                      {task.title}
                    </p>
                    {task.priority_name && (
                      <Badge
                        variant={
                          task.priority_name === "Высокий" || task.priority_name === "high"
                            ? "danger"
                            : task.priority_name === "Средний" || task.priority_name === "medium"
                            ? "warning"
                            : "default"
                        }
                        className="flex-shrink-0"
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
                    <span className="flex items-center gap-1 text-xs text-surface-500">
                      <MessageSquare className="h-3 w-3" />
                      {task.comment_count || 0}
                    </span>
                    {task.estimated_hours && (
                      <span className="flex items-center gap-1 text-xs text-surface-500">
                        <Clock className="h-3 w-3" />
                        {task.estimated_hours}ч
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
