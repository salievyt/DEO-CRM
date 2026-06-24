"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Select } from "@/shared/ui/Select";
import { Badge } from "@/shared/ui/Badge";

interface ChangeTaskStatusProps {
  taskId: string;
  currentStatus: string;
  statuses: { id: string; name: string; color?: string }[];
}

export function ChangeTaskStatus({ taskId, currentStatus, statuses }: ChangeTaskStatusProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (statusId: string) => tasksApi.changeStatus(taskId, statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASKS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASK_KANBAN] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASK_MY] });
    },
  });

  const currentStatusObj = statuses.find((s) => s.name === currentStatus || s.id === currentStatus);

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={
          currentStatus === "Выполнена" || currentStatus === "completed"
            ? "success"
            : currentStatus === "В работе" || currentStatus === "in_progress"
            ? "warning"
            : "default"
        }
      >
        {currentStatusObj?.name || currentStatus}
      </Badge>
      <select
        value={currentStatusObj?.id || ""}
        onChange={(e) => e.target.value && mutation.mutate(e.target.value)}
        className="rounded-lg border border-surface-200 bg-transparent px-2 py-1 text-xs dark:border-surface-700"
      >
        <option value="">Сменить статус</option>
        {statuses.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
