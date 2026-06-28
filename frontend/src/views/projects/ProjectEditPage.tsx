"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { ClientSearchSelect } from "@/shared/ui/ClientSearchSelect";
import { projectsApi, clientsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import type { Project } from "@/entities/project/types";
import type { Client } from "@/entities/client/types";

export function ProjectEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id ?? "";
  const [error, setError] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: [QUERY_KEYS.PROJECT, id],
    queryFn: () => projectsApi.get(id),
    select: (res) => res.data as Project,
    enabled: !!id,
  });

  const { data: statuses } = useQuery({
    queryKey: [QUERY_KEYS.PROJECT_STATUSES],
    queryFn: () => projectsApi.statuses(),
    select: (res) => (res.data?.results || res.data || []) as { id: string; name: string }[],
  });

  const { data: serviceTypes } = useQuery({
    queryKey: [QUERY_KEYS.SERVICE_TYPES],
    queryFn: () => projectsApi.serviceTypes(),
    select: (res) => (res.data?.results || res.data || []) as { id: string; name: string }[],
  });

  const { data: clientsData } = useQuery({
    queryKey: [QUERY_KEYS.CLIENTS],
    queryFn: () => clientsApi.list(),
    select: (res) => (res.data?.results || []) as Client[],
  });

  const clients = clientsData || [];
  const statusList = Array.isArray(statuses) ? statuses : [];
  const serviceList = Array.isArray(serviceTypes) ? serviceTypes : [];

  const [form, setForm] = useState({
    name: "",
    client: "",
    service_type: "",
    status: "",
    budget: "",
    cost: "",
    deadline: "",
    progress: "",
    description: "",
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || "",
        client: project.client || "",
        service_type: project.service_type || "",
        status: project.status || "",
        budget: project.budget ? String(project.budget) : "",
        cost: project.cost ? String(project.cost) : "",
        deadline: project.deadline || "",
        progress: String(project.progress || 0),
        description: project.description || "",
      });
    }
  }, [project]);

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECTS, "stats"] });
      router.push("/projects");
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string") {
        setError("Ошибка при удалении: " + detail);
      } else {
        setError("Не удалось удалить проект. Попробуйте снова.");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => projectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECT, id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECTS, "stats"] });
      router.push(`/projects/${id}`);
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (err?.response?.data) {
        const msgs = Object.values(err.response.data).flat().join(". ");
        setError(msgs || "Ошибка при сохранении");
      } else {
        setError("Ошибка при сохранении. Попробуйте снова.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.client) {
      setError("Заполните название проекта и выберите клиента");
      return;
    }
    updateMutation.mutate({
      name: form.name,
      client: form.client,
      service_type: form.service_type || undefined,
      status: form.status || undefined,
      budget: form.budget ? Number(form.budget) : undefined,
      cost: form.cost ? Number(form.cost) : undefined,
      deadline: form.deadline || undefined,
      progress: form.progress ? Number(form.progress) : undefined,
      description: form.description || undefined,
    });
  };

  if (projectLoading || !statusList.length) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-surface-500">Проект не найден</p>
        <Link href="/projects" className="btn-secondary mt-4">
          ← Назад к проектам
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к проекту
      </Link>

      <PageHeader
        title="Редактировать проект"
        description={project.name}
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Название проекта"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Например: Разработка сайта"
            required
          />

          <div className="grid gap-5 sm:grid-cols-2">
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

          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              label="Статус"
              options={statusList.map((s) => ({ value: s.id, label: s.name }))}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              required
            />
            <Input
              label="Прогресс (%)"
              type="number"
              min={0}
              max={100}
              value={form.progress}
              onChange={(e) => setForm({ ...form, progress: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Бюджет"
              type="number"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              placeholder="0"
            />
            <Input
              label="Себестоимость"
              type="number"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
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
              rows={4}
              className="input mt-1"
              placeholder="Полное описание проекта"
            />
          </div>

          {error && (
            <div className="animate-fade-in rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-100 dark:border-surface-700">
            <Link href={`/projects/${id}`}>
              <Button variant="secondary" type="button">
                Отмена
              </Button>
            </Link>
            <Button type="submit" loading={updateMutation.isPending} disabled={!form.name.trim() || !form.client}>
              <Save className="h-4 w-4" />
              Сохранить изменения
            </Button>
          </div>
        </form>
      </Card>

      {/* Danger Zone — удаление проекта */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-danger-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-surface-900 dark:text-white">
                Опасная зона
              </h3>
              <p className="text-xs text-surface-500">
                После удаления проект нельзя восстановить
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            onClick={() => setDeleteModalOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Удалить проект
          </Button>
        </div>

        <Modal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Удалить проект?"
          description={`Вы уверены, что хотите удалить проект «${project.name}»? Это действие необратимо.`}
          size="sm"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Все данные проекта, включая задачи, команду и документы, будут безвозвратно удалены.
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteMutation.isPending}
              >
                Отмена
              </Button>
              <Button
                variant="danger"
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </Button>
            </div>
          </div>
        </Modal>
      </Card>
    </div>
  );
}
