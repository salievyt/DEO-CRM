"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FolderKanban } from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ClientSearchSelect } from "@/shared/ui/ClientSearchSelect";
import { projectsApi, clientsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import type { Project } from "@/entities/project/types";
import type { Client } from "@/entities/client/types";

export function ProjectListPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.PROJECTS],
    queryFn: () => projectsApi.list(),
    select: (res) => res.data,
  });

  const { data: stats } = useQuery({
    queryKey: [QUERY_KEYS.PROJECTS, "stats"],
    queryFn: () => projectsApi.stats(),
    select: (res) => res.data,
  });

  const { data: statuses } = useQuery({
    queryKey: [QUERY_KEYS.PROJECT_STATUSES],
    queryFn: () => projectsApi.statuses(),
    select: (res) => res.data?.results || res.data,
  });

  const { data: serviceTypes } = useQuery({
    queryKey: [QUERY_KEYS.SERVICE_TYPES],
    queryFn: () => projectsApi.serviceTypes(),
    select: (res) => res.data?.results || res.data,
  });

  // Загружаем клиентов заранее, до открытия модалки
  const { data: clientsData } = useQuery({
    queryKey: [QUERY_KEYS.CLIENTS],
    queryFn: () => clientsApi.list(),
    select: (res) => (res.data?.results || []) as Client[],
  });

  const projects: Project[] = data?.results ?? [];
  const clients: Client[] = clientsData || [];

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECTS, "stats"] });
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
        title="Проекты"
        description="Управление проектами студии"
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Новый проект
          </Button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-sm text-surface-500">Всего проектов</p>
            <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
              {stats.total}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-surface-500">Активные</p>
            <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
              {stats.active}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-surface-500">Статусов</p>
            <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
              {stats.by_status?.length || 0}
            </p>
          </Card>
        </div>
      )}

      {/* Status filter buttons */}
      {stats?.by_status && (
        <div className="flex flex-wrap gap-2">
          {stats.by_status.map((s: Record<string, unknown>) => (
            <button
              key={String(s.status__name)}
              className="inline-flex items-center gap-1.5 rounded-full border border-surface-200 px-3 py-1 text-sm text-surface-600 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-300"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: String(s.status__color) }}
              />
              {String(s.status__name)}
              <span className="text-xs text-surface-400">
                ({String(s.count)})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Project List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {projects.length === 0 && (
        <EmptyState
          icon={<FolderKanban className="h-12 w-12" />}
          title="Нет проектов"
          description="Создайте первый проект, чтобы начать работу"
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              Новый проект
            </Button>
          }
        />
      )}

      {/* Create Project Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Новый проект"
        size="lg"
      >
        <ProjectForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowCreateModal(false)}
          statuses={statuses || []}
          serviceTypes={serviceTypes || []}
          clients={clients}
        />
      </Modal>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <a href={`/projects/${project.id}`} className="block">
      <Card className="transition-all hover:shadow-md card-hover">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-surface-900 dark:text-white">
              {project.name}
            </h3>
            <p className="text-sm text-surface-500">{project.client_name}</p>
          </div>
          <StatusBadge status={project.status_name} />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-surface-500">
            <span>Прогресс</span>
            <span>{project.progress}%</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-surface-200 dark:bg-surface-700">
            <div
              className="h-2 rounded-full bg-brand-600 transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-surface-500">
          {project.budget && <span>{formatCurrency(project.budget)}</span>}
          {project.deadline && <span>До {formatDate(project.deadline)}</span>}
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-surface-400">
          <span>Команда: {project.team_count}</span>
          <span>·</span>
          <span>Задачи: {project.task_count}</span>
        </div>
      </Card>
    </a>
  );
}

function ProjectForm({
  onSubmit,
  onCancel,
  statuses,
  serviceTypes,
  clients,
}: {
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  statuses: { id: string; name: string }[];
  serviceTypes: { id: string; name: string }[];
  clients: Client[];
}) {
  const [form, setForm] = useState({
    name: "",
    client: "",
    service_type: "",
    status: statuses[0]?.id || "",
    budget: "",
    deadline: "",
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client) return;
    onSubmit({
      ...form,
      budget: form.budget ? Number(form.budget) : undefined,
    });
  };

  const isValid = form.name.trim() && form.client;

  return (
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
          options={serviceTypes.map((st) => ({
            value: st.id,
            label: st.name,
          }))}
          value={form.service_type}
          onChange={(e) => setForm({ ...form, service_type: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Статус"
          options={statuses.map((s) => ({
            value: s.id,
            label: s.name,
          }))}
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
        <Button variant="secondary" type="button" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={!isValid}>
          Создать проект
        </Button>
      </div>
    </form>
  );
}
