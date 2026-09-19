"use client";

import { useState } from "react";
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

export function CreateTaskModal({ open, onClose }: CreateTaskModalProps) {
  const queryClient = useQueryClient();
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

  const statusesQuery = useQuery({
    queryKey: [QUERY_KEYS.TASK_STATUSES],
    queryFn: () => tasksApi.statuses(),
    select: (res) => res.data?.results ?? [],
  });

  const prioritiesQuery = useQuery({
    queryKey: [QUERY_KEYS.TASK_PRIORITIES],
    queryFn: () => tasksApi.priorities(),
    select: (res) => res.data?.results ?? [],
  });

  const statusOptions = (statusesQuery.data ?? []).map((s: { id: string; name: string }) => ({
    value: s.id,
    label: s.name,
  }));
  const priorityOptions = (prioritiesQuery.data ?? []).map((p: { id: string; name: string }) => ({
    value: p.id,
    label: p.name,
  }));

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASKS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASK_KANBAN] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASK_MY] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      status: form.status || undefined,
      priority: form.priority || undefined,
      estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : undefined,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Новая задача" size="lg">
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
            placeholder="По умолчанию"
          />
          <Select
            label="Приоритет"
            options={priorityOptions}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            placeholder="Не выбран"
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
          <Button variant="secondary" type="button" onClick={onClose}>
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
