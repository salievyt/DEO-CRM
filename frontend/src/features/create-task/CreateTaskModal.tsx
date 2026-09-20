"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Modal } from "@/shared/ui/Modal";
import { ProjectSearchSelect } from "@/shared/ui/ProjectSearchSelect";
import { UserSearchSelect } from "@/shared/ui/UserSearchSelect";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
}

interface TaskFormState {
  title: string;
  description: string;
  project: string;
  assignee: string;
  status: string;
  priority: string;
  deadline: string;
  estimated_hours: string;
}

const INITIAL_FORM: TaskFormState = {
  title: "",
  description: "",
  project: "",
  assignee: "",
  status: "",
  priority: "",
  deadline: "",
  estimated_hours: "",
};

/** Empty string means "not provided" — send undefined so DRF skips the field. */
function buildPayload(form: TaskFormState): Record<string, unknown> {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    project: form.project || undefined,
    assignee: form.assignee || undefined,
    status: form.status || undefined,
    priority: form.priority || undefined,
    deadline: form.deadline || undefined,
    estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : undefined,
  };
}

function extractError(error: unknown): string {
  const data = (error as { response?: { data?: { detail?: unknown } } })?.response?.data;
  const detail = data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const obj = detail as Record<string, unknown>;
    const firstKey = Object.keys(obj)[0];
    const firstValue = firstKey ? obj[firstKey] : undefined;
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return `${firstKey}: ${String(firstValue[0])}`;
    }
    if (typeof firstValue === "string") return `${firstKey}: ${firstValue}`;
  }
  return "Не удалось создать задачу. Попробуйте ещё раз.";
}

export function CreateTaskModal({ open, onClose }: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TaskFormState>(INITIAL_FORM);

  const statusesQuery = useQuery({
    queryKey: [QUERY_KEYS.TASK_STATUSES],
    queryFn: () => tasksApi.statuses(),
    enabled: open,
    select: (res) => res.data?.results ?? [],
  });

  const prioritiesQuery = useQuery({
    queryKey: [QUERY_KEYS.TASK_PRIORITIES],
    queryFn: () => tasksApi.priorities(),
    enabled: open,
    select: (res): { id: string; name: string; level: number }[] =>
      res.data?.results ?? [],
  });

  const statusOptions = (statusesQuery.data ?? []).map((s: { id: string; name: string }) => ({
    value: s.id,
    label: s.name,
  }));
  const priorityOptions = (prioritiesQuery.data ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));

  // Preselect defaults (first status by order, "Средний" priority) once lists load.
  useEffect(() => {
    if (!open) return;
    const priorities = prioritiesQuery.data ?? [];
    const defaultPriority =
      priorities.find((p) => p.level === 1)?.id ?? priorities[0]?.id ?? "";
    setForm((prev) => ({
      ...prev,
      status: prev.status || statusesQuery.data?.[0]?.id || "",
      priority: prev.priority || defaultPriority,
    }));
  }, [open, statusesQuery.data, prioritiesQuery.data]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASKS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASK_KANBAN] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASK_MY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASK_UPCOMING] });
      setForm(INITIAL_FORM);
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(buildPayload(form));
  };

  const handleClose = () => {
    if (mutation.isPending) return;
    setForm(INITIAL_FORM);
    mutation.reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Новая задача" size="lg">
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
          <ProjectSearchSelect
            value={form.project}
            onChange={(id) => setForm({ ...form, project: id })}
            required
          />
          <UserSearchSelect
            value={form.assignee}
            onChange={(id) => setForm({ ...form, assignee: id })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Статус"
            options={statusOptions}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            placeholder={statusOptions.length ? "По умолчанию" : "Загрузка..."}
            disabled={!statusOptions.length}
          />
          <Select
            label="Приоритет"
            options={priorityOptions}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            placeholder={priorityOptions.length ? "Не выбран" : "Загрузка..."}
            disabled={!priorityOptions.length}
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
            min="0"
            step="0.5"
            value={form.estimated_hours}
            onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
          />
        </div>
        {mutation.isError && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:bg-danger-900/20 dark:text-danger-400">
            {extractError(mutation.error)}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Отмена
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Создать задачу
          </Button>
        </div>
      </form>
    </Modal>
  );
}
