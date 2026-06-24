"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, List, Columns } from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { leadsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatCurrency, formatDate, timeAgo, cn } from "@/shared/utils/formatters";
import type { Lead, LeadKanbanColumn } from "@/entities/lead/types";

export function LeadListPage() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: kanbanData, isLoading: kanbanLoading } = useQuery({
    queryKey: [QUERY_KEYS.LEAD_KANBAN],
    queryFn: () => leadsApi.kanban(),
    select: (res) => res.data as LeadKanbanColumn[],
  });

  const { data: statsData } = useQuery({
    queryKey: [QUERY_KEYS.LEADS, "stats"],
    queryFn: () => leadsApi.stats(),
    select: (res) => res.data,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => leadsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEADS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEAD_KANBAN] });
      setShowCreateModal(false);
    },
  });

  if (kanbanLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Лиды"
        description="Воронка продаж и управление лидами"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-surface-200 p-0.5 dark:border-surface-700">
              <button
                onClick={() => setView("kanban")}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  view === "kanban"
                    ? "bg-brand-600 text-white"
                    : "text-surface-500 hover:text-surface-700"
                )}
              >
                <Columns className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  view === "list"
                    ? "bg-brand-600 text-white"
                    : "text-surface-500 hover:text-surface-700"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              Добавить лид
            </Button>
          </div>
        }
      />

      {/* Stats */}
      {statsData && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-sm text-surface-500">Всего лидов</p>
            <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
              {statsData.total}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-surface-500">Активные</p>
            <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
              {statsData.active}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-surface-500">Этапов воронки</p>
            <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
              {statsData.stages?.length || 0}
            </p>
          </Card>
        </div>
      )}

      {/* Kanban Board */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanData?.map((column) => (
            <div key={column.id} className="min-w-[300px] flex-shrink-0">
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <h3 className="font-medium text-surface-900 dark:text-white">
                  {column.title}
                </h3>
                <Badge variant="default">{column.leads.length}</Badge>
              </div>

              <div className="space-y-2">
                {(column.leads || []).length === 0 ? (
                  <p className="py-8 text-center text-sm text-surface-400">
                    Нет лидов
                  </p>
                ) : (
                  column.leads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <Card>
          <div className="space-y-2">
            {kanbanData?.flatMap((c) => c.leads).map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between rounded-lg border border-surface-200 p-4 dark:border-surface-700"
              >
                <div>
                  <p className="font-medium text-surface-900 dark:text-white">
                    {lead.contact_name}
                  </p>
                  <p className="text-sm text-surface-500">{lead.company_name}</p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge
                    variant="default"
                    style={{ backgroundColor: lead.stage_color + "20", color: lead.stage_color }}
                  >
                    {lead.stage_name}
                  </Badge>
                  {lead.budget && (
                    <span className="text-sm font-medium">
                      {formatCurrency(lead.budget)}
                    </span>
                  )}
                  <span className="text-sm text-surface-400">
                    {timeAgo(lead.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(!kanbanData || kanbanData.every((c) => c.leads.length === 0)) &&
        view === "kanban" && (
          <EmptyState
            title="Нет лидов"
            description="Добавьте первый лид в воронку продаж"
            action={
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4" />
                Добавить лид
              </Button>
            }
          />
        )}

      {/* Create Lead Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Новый лид"
      >
        <LeadForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowCreateModal(false)}
          stages={kanbanData?.map((c) => ({
            value: c.id,
            label: c.title,
          })) || []}
        />
      </Modal>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <div className="rounded-lg border border-surface-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-surface-700 dark:bg-surface-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-900 dark:text-white">
            {lead.contact_name}
          </p>
          {lead.company_name && (
            <p className="text-xs text-surface-500">{lead.company_name}</p>
          )}
        </div>
        {lead.budget && (
          <span className="text-xs font-medium text-success-600">
            {formatCurrency(lead.budget)}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-surface-500">{lead.phone}</span>
        {lead.assigned_to_name && (
          <>
            <span className="text-surface-300">·</span>
            <span className="text-xs text-surface-500">
              {lead.assigned_to_name}
            </span>
          </>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded bg-surface-100 px-1.5 py-0.5 text-xs text-surface-600 dark:bg-surface-700 dark:text-surface-300">
          {lead.source}
        </span>
      </div>
    </div>
  );
}

function LeadForm({
  onSubmit,
  onCancel,
  stages,
}: {
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  stages: { value: string; label: string }[];
}) {
  const [form, setForm] = useState({
    contact_name: "",
    company_name: "",
    phone: "",
    email: "",
    source: "other",
    current_stage: stages[0]?.value || "",
    budget: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      budget: form.budget ? Number(form.budget) : undefined,
      current_stage: form.current_stage || stages[0]?.value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Контактное имя"
        value={form.contact_name}
        onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
        required
      />
      <Input
        label="Компания"
        value={form.company_name}
        onChange={(e) => setForm({ ...form, company_name: e.target.value })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Телефон"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Источник"
          options={[
            { value: "website", label: "Сайт" },
            { value: "referral", label: "Рекомендация" },
            { value: "instagram", label: "Instagram" },
            { value: "facebook", label: "Facebook" },
            { value: "telegram", label: "Telegram" },
            { value: "call", label: "Звонок" },
            { value: "other", label: "Другое" },
          ]}
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
        />
        <Select
          label="Этап"
          options={stages}
          value={form.current_stage}
          onChange={(e) => setForm({ ...form, current_stage: e.target.value })}
        />
      </div>
      <Input
        label="Бюджет"
        type="number"
        value={form.budget}
        onChange={(e) => setForm({ ...form, budget: e.target.value })}
      />
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">
          Заметки
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className="input mt-1"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit">Создать</Button>
      </div>
    </form>
  );
}
