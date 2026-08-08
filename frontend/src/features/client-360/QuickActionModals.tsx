"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clientsApi,
  documentsApi,
  leadsApi,
  projectsApi,
  tasksApi,
} from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Modal } from "@/shared/ui/Modal";

const sourceOptions = [
  { value: "website", label: "Сайт" },
  { value: "referral", label: "Рекомендация" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "telegram", label: "Telegram" },
  { value: "call", label: "Звонок" },
  { value: "other", label: "Другое" },
];

export function NoteModal({
  clientId,
  open,
  onClose,
}: {
  clientId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const mutation = useMutation({
    mutationFn: (description: string) =>
      clientsApi.interactions.create(clientId, { type: "note", description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT, "360", clientId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_INTERACTIONS] });
      setText("");
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Добавить заметку" size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) mutation.mutate(text.trim());
        }}
        className="space-y-4"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50 dark:placeholder:text-surface-500"
          placeholder="Текст заметки..."
          required
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Сохранить
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function DealModal({
  clientId,
  clientName,
  clientPhone,
  open,
  onClose,
}: {
  clientId: string;
  clientName: string;
  clientPhone: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    contact_name: clientName,
    phone: clientPhone,
    budget: "",
    source: "call",
    stage_id: "",
  });

  const stagesQuery = useQuery({
    queryKey: [QUERY_KEYS.LEAD_STAGES],
    queryFn: () => leadsApi.stages.list(),
    select: (res) => res.data?.results ?? [],
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => leadsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEADS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT, "360", clientId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEAD_KANBAN] });
      onClose();
    },
  });

  const stageOptions = (stagesQuery.data ?? []).map((stage: any) => ({
    value: stage.id,
    label: stage.name,
  }));

  return (
    <Modal open={open} onClose={onClose} title="Новая сделка" size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.stage_id || !form.contact_name.trim() || !form.phone.trim()) return;
          mutation.mutate({
            client: clientId,
            contact_name: form.contact_name.trim(),
            phone: form.phone.trim(),
            budget: form.budget ? Number(form.budget) : undefined,
            source: form.source,
            current_stage: form.stage_id,
          });
        }}
        className="space-y-4"
      >
        <Input
          label="Контактное имя"
          value={form.contact_name}
          onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          required
        />
        <Input
          label="Телефон"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Бюджет"
            type="number"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
          />
          <Select
            label="Источник"
            options={sourceOptions}
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          />
        </div>
        <Select
          label="Этап воронки"
          options={stageOptions}
          value={form.stage_id}
          onChange={(e) => setForm({ ...form, stage_id: e.target.value })}
          placeholder="Выберите этап"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Создать сделку
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function TaskModal({
  clientId,
  open,
  onClose,
}: {
  clientId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    project_id: "",
    status_id: "",
    title: "",
    deadline: "",
  });

  const projectsQuery = useQuery({
    queryKey: [QUERY_KEYS.PROJECTS, "client", clientId],
    queryFn: () => projectsApi.list({ client: clientId }),
    select: (res) => res.data?.results ?? [],
  });

  const statusesQuery = useQuery({
    queryKey: [QUERY_KEYS.TASK_STATUSES],
    queryFn: () => tasksApi.statuses(),
    select: (res) => res.data?.results ?? [],
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASKS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT, "360", clientId] });
      onClose();
    },
  });

  const projectOptions = (projectsQuery.data ?? []).map((project: any) => ({
    value: project.id,
    label: project.name,
  }));
  const statusOptions = (statusesQuery.data ?? []).map((status: any) => ({
    value: status.id,
    label: status.name,
  }));

  return (
    <Modal open={open} onClose={onClose} title="Новая задача" size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.project_id || !form.status_id || !form.title.trim()) return;
          mutation.mutate({
            project: form.project_id,
            status: form.status_id,
            title: form.title.trim(),
            deadline: form.deadline || undefined,
          });
        }}
        className="space-y-4"
      >
        <Select
          label="Проект"
          options={projectOptions}
          value={form.project_id}
          onChange={(e) => setForm({ ...form, project_id: e.target.value })}
          placeholder="Выберите проект клиента"
        />
        <Input
          label="Название"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Статус"
            options={statusOptions}
            value={form.status_id}
            onChange={(e) => setForm({ ...form, status_id: e.target.value })}
            placeholder="Выберите статус"
          />
          <Input
            label="Срок"
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
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

export function DocumentModal({
  clientId,
  open,
  onClose,
}: {
  clientId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    document_type_id: "",
    title: "",
    file: null as File | null,
  });

  const typesQuery = useQuery({
    queryKey: [QUERY_KEYS.DOCUMENT_TYPES],
    queryFn: () => documentsApi.types(),
    select: (res) => res.data?.results ?? [],
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => documentsApi.upload(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT, "360", clientId] });
      onClose();
    },
  });

  const typeOptions = (typesQuery.data ?? []).map((type: any) => ({
    value: type.id,
    label: type.name,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.document_type_id || !form.title.trim() || !form.file) return;
    const data = new FormData();
    data.append("document_type", form.document_type_id);
    data.append("client", clientId);
    data.append("title", form.title.trim());
    data.append("file", form.file);
    mutation.mutate(data);
  };

  return (
    <Modal open={open} onClose={onClose} title="Создать документ" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Тип документа"
          options={typeOptions}
          value={form.document_type_id}
          onChange={(e) => setForm({ ...form, document_type_id: e.target.value })}
          placeholder="Договор, КП, счет, акт..."
        />
        <Input
          label="Название"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">
            Файл
          </label>
          <input
            type="file"
            onChange={(e) =>
              setForm({ ...form, file: e.target.files?.[0] ?? null })
            }
            className="mt-1 block w-full text-sm text-surface-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-600 dark:file:bg-brand-900/20 dark:file:text-brand-400"
            required
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Загрузить
          </Button>
        </div>
      </form>
    </Modal>
  );
}
