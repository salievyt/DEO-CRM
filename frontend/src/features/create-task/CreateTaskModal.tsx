"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Modal } from "@/shared/ui/Modal";

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
    deadline: "",
    estimated_hours: "",
    priority: "",
  });

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
