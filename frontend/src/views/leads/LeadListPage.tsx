"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, List, Columns, Edit3, GripVertical } from "lucide-react";
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const dragLeadRef = useRef<{ id: string; fromStage: string } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollAnimRef = useRef<number | null>(null);
  const mouseXRef = useRef(0);
  const queryClient = useQueryClient();

  // Auto-scroll kanban during drag
  useEffect(() => {
    const tick = () => {
      const el = scrollContainerRef.current;
      if (!el || dragLeadRef.current === null) {
        autoScrollAnimRef.current = null;
        return;
      }

      const rect = el.getBoundingClientRect();
      const x = mouseXRef.current;
      const speed = 12;
      const threshold = 80;

      if (x < rect.left + threshold) {
        const factor = Math.max(0.3, 1 - (x - rect.left) / threshold);
        el.scrollLeft -= Math.round(speed * factor);
        autoScrollAnimRef.current = requestAnimationFrame(tick);
      } else if (x > rect.right - threshold) {
        const factor = Math.max(0.3, (x - (rect.right - threshold)) / threshold);
        el.scrollLeft += Math.round(speed * factor);
        autoScrollAnimRef.current = requestAnimationFrame(tick);
      } else {
        autoScrollAnimRef.current = null;
      }
    };

    const onDragOver = (e: DragEvent) => {
      mouseXRef.current = e.clientX;
      if (dragLeadRef.current !== null && autoScrollAnimRef.current === null) {
        autoScrollAnimRef.current = requestAnimationFrame(tick);
      }
    };

    const onDragEnd = () => {
      dragLeadRef.current = null;
    };

    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragend", onDragEnd);

    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragend", onDragEnd);
      if (autoScrollAnimRef.current !== null) {
        cancelAnimationFrame(autoScrollAnimRef.current);
      }
    };
  }, []);

  const { data: kanbanData, isLoading: kanbanLoading } = useQuery({
    queryKey: [QUERY_KEYS.LEAD_KANBAN],
    queryFn: () => leadsApi.kanban(),
    select: (res) => res.data as LeadKanbanColumn[],
  });

  const moveMutation = useMutation({
    mutationFn: ({ leadId, stageId }: { leadId: string; stageId: string }) =>
      leadsApi.move(leadId, stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEAD_KANBAN] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEADS] });
    },
  });

  // Drag & Drop handlers
  const handleDragStart = useCallback((leadId: string, fromStage: string) => {
    dragLeadRef.current = { id: leadId, fromStage };
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(stageId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toStage: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const lead = dragLeadRef.current;
    if (!lead) return;
    if (lead.fromStage === toStage) return; // same column, no move needed
    moveMutation.mutate({ leadId: lead.id, stageId: toStage });
    dragLeadRef.current = null;
  }, [moveMutation]);

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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      leadsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEADS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEAD_KANBAN] });
      setShowEditModal(false);
      setEditingLead(null);
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
        <div ref={scrollContainerRef} className="flex gap-4 overflow-x-auto pb-4">
          {kanbanData?.map((column) => {
            const isDragOver = dragOverColumn === column.id;
            return (
              <div
                key={column.id}
                className={cn(
                  "min-w-[300px] flex-shrink-0 rounded-xl transition-all",
                  isDragOver && "bg-brand-50/50 ring-2 ring-brand-300 dark:bg-brand-900/20 dark:ring-brand-700"
                )}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="mb-3 flex items-center gap-2 px-3 pt-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <h3 className="font-medium text-surface-900 dark:text-white">
                    {column.title}
                  </h3>
                  <Badge variant="default">{column.leads.length}</Badge>
                </div>

                <div className="space-y-2 px-3 pb-3">
                  {(column.leads || []).length === 0 ? (
                    <div className="flex min-h-[100px] items-center justify-center rounded-lg border-2 border-dashed border-surface-200 dark:border-surface-700">
                      <p className="text-sm text-surface-400">
                        Перетащите лид сюда
                      </p>
                    </div>
                  ) : (
                    column.leads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        stageId={column.id}
                        onDragStart={handleDragStart}
                        onEdit={() => {
                          setEditingLead(lead);
                          setShowEditModal(true);
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
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

      {/* Edit Lead Modal */}
      <Modal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingLead(null);
        }}
        title={`Редактировать: ${editingLead?.contact_name || ""}`}
      >
        {editingLead && (
          <LeadForm
            initial={editingLead}
            onSubmit={(data) =>
              updateMutation.mutate({ id: editingLead.id, data })
            }
            onCancel={() => {
              setShowEditModal(false);
              setEditingLead(null);
            }}
            stages={kanbanData?.map((c) => ({
              value: c.id,
              label: c.title,
            })) || []}
            submitLabel="Сохранить"
          />
        )}
      </Modal>
    </div>
  );
}

function LeadCard({
  lead,
  stageId,
  onDragStart,
  onEdit,
}: {
  lead: Lead;
  stageId: string;
  onDragStart: (leadId: string, stageId: string) => void;
  onEdit: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(lead.id, stageId)}
      className="group/card cursor-grab rounded-lg border border-surface-200 bg-white p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing active:opacity-60 dark:border-surface-700 dark:bg-surface-800"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <GripVertical className="mt-0.5 h-4 w-4 flex-shrink-0 text-surface-300 opacity-0 transition-opacity group-hover/card:opacity-100 dark:text-surface-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
              {lead.contact_name}
            </p>
            {lead.company_name && (
              <p className="text-xs text-surface-500 truncate">{lead.company_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {lead.budget && (
            <span className="text-xs font-medium text-success-600">
              {formatCurrency(lead.budget)}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded-md p-1 text-surface-400 opacity-0 transition-all hover:bg-surface-100 hover:text-brand-600 group-hover/card:opacity-100 dark:hover:bg-surface-700"
            title="Редактировать"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </div>
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
        <span
          className="rounded px-1.5 py-0.5 text-xs"
          style={{
            backgroundColor: lead.stage_color + "20",
            color: lead.stage_color,
          }}
        >
          {lead.stage_name}
        </span>
      </div>
    </div>
  );
}

function LeadForm({
  onSubmit,
  onCancel,
  stages,
  initial,
  submitLabel = "Создать",
}: {
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  stages: { value: string; label: string }[];
  initial?: Lead;
  submitLabel?: string;
}) {
  const [form, setForm] = useState({
    contact_name: initial?.contact_name || "",
    company_name: initial?.company_name || "",
    phone: initial?.phone || "",
    email: initial?.email || "",
    source: initial?.source || "other",
    current_stage: initial?.current_stage || stages[0]?.value || "",
    budget: initial?.budget != null ? String(initial.budget) : "",
    notes: initial?.notes || "",
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
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
