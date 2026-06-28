"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsApi, clientsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Modal } from "@/shared/ui/Modal";
import { ClientSearchSelect } from "@/shared/ui/ClientSearchSelect";
import type { Client } from "@/entities/client/types";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    client: "",
    service_type: "",
    status: "",
    budget: "",
    deadline: "",
    description: "",
  });

  const { data: statuses } = useQuery({
    queryKey: [QUERY_KEYS.PROJECT_STATUSES],
    queryFn: () => projectsApi.statuses(),
    select: (res) => res.data?.results || res.data || [],
  });

  const { data: serviceTypes } = useQuery({
    queryKey: [QUERY_KEYS.SERVICE_TYPES],
    queryFn: () => projectsApi.serviceTypes(),
    select: (res) => res.data?.results || res.data || [],
  });

  const { data: clientsData } = useQuery({
    queryKey: [QUERY_KEYS.CLIENTS],
    queryFn: () => clientsApi.list(),
    select: (res) => (res.data?.results || []) as Client[],
  });

  const statusList: { id: string; name: string }[] = Array.isArray(statuses) ? statuses : [];
  const serviceList: { id: string; name: string }[] = Array.isArray(serviceTypes) ? serviceTypes : [];
  const clients: Client[] = clientsData || [];

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECTS, "stats"] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client || !form.name.trim()) return;
    mutation.mutate({
      ...form,
      budget: form.budget ? Number(form.budget) : undefined,
      status: form.status || statusList[0]?.id,
    });
  };

  const isValid = form.name.trim() && form.client;

  return (
    <Modal open={open} onClose={onClose} title="Новый проект" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Название проекта"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Например: Разработка сайта"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ClientSearchSelect
            clients={clients}
            value={form.client}
            onChange={(id) => setForm({ ...form, client: id })}
          />
          <Select
            label="Тип услуги"
            options={serviceList.map((st) => ({ value: st.id, label: st.name }))}
            value={form.service_type}
            onChange={(e) => setForm({ ...form, service_type: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Статус"
            options={statusList.map((s) => ({ value: s.id, label: s.name }))}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            required
          />
          <Input
            label="Бюджет"
            type="number"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
            placeholder="0"
          />
        </div>
        <Input
          label="Срок"
          type="date"
          value={form.deadline}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
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
            placeholder="Краткое описание проекта"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" loading={mutation.isPending} disabled={!isValid}>
            Создать проект
          </Button>
        </div>
      </form>
    </Modal>
  );
}
