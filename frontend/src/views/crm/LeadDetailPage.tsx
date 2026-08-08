"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  Send,
  Building2,
  Target,
  Calendar,
  User,
  MessageSquare,
  MessageCircle,
  Loader2,
  Plus,
  FileText,
  History,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Tabs } from "@/shared/ui/Tabs";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { leadsApi, tasksApi, crmApi, messagingApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDate, formatCurrency, timeAgo, cn } from "@/shared/utils/formatters";
import type { Lead } from "@/entities/lead/types";

const sourceLabels: Record<string, string> = {
  website: "Сайт",
  referral: "Рекомендация",
  instagram: "Instagram",
  facebook: "Facebook",
  telegram: "Telegram",
  call: "Звонок",
  other: "Другое",
};

export function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";
  const [activeTab, setActiveTab] = useState("overview");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const queryClient = useQueryClient();

  const { data: lead, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.LEAD, id],
    queryFn: () => leadsApi.get(id),
    select: (res) => res.data as Lead,
    enabled: !!id,
  });

  const { data: activities } = useQuery({
    queryKey: [QUERY_KEYS.LEADS, "activities", id],
    queryFn: () => crmApi.leads.activities({ lead_id: id }),
    select: (res) => res.data as any[],
    enabled: !!id,
  });

  const { data: followup } = useQuery({
    queryKey: [QUERY_KEYS.LEADS, "followup", id],
    queryFn: () => crmApi.leads.followup({ lead_id: id }),
    select: (res) => res.data as { overdue: any[]; today: any[]; upcoming: any[] },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => leadsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEAD, id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEADS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEAD_KANBAN] });
      setShowEditModal(false);
    },
  });

  const { data: stages } = useQuery({
    queryKey: [QUERY_KEYS.LEAD_STAGES],
    queryFn: () => leadsApi.stages.list(),
    select: (res) => res.data,
    enabled: !!id,
  });

  // WhatsApp widget
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null);
  const [whatsAppPending, setWhatsAppPending] = useState(false);

  const openWhatsApp = async () => {
    if (whatsAppPending) return;
    setWhatsAppError(null);
    setWhatsAppPending(true);
    try {
      const res = await messagingApi.conversations.fromLead(id);
      const conv = res.data as { id: string };
      window.open(`/inbox?conversation=${conv.id}`, "_self");
    } catch (err: any) {
      setWhatsAppError(
        err?.response?.data?.error || "Не удалось открыть WhatsApp-диалог"
      );
    } finally {
      setWhatsAppPending(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!lead) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-surface-500">Лид не найден</p>
      </div>
    );
  }

  const stageOptions = Array.isArray(stages)
    ? stages.map((s: any) => ({ value: s.id, label: s.name }))
    : (stages as any)?.results?.map((s: any) => ({ value: s.id, label: s.name })) || [];

  const tabs = [
    { value: "overview", label: "Обзор" },
    { value: "activity", label: "Активности" },
    { value: "tasks", label: "Задачи" },
    { value: "history", label: "История" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.contact_name}
        description={lead.company_name || "Лид"}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => router.push("/leads")}>
              <ArrowLeft className="h-4 w-4" />
              К списку
            </Button>
            <Button onClick={() => { setEditingLead(lead); setShowEditModal(true); }}>
              Редактировать
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Profile card */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-2xl font-semibold text-white">
                {lead.contact_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <h2 className="mt-3 text-xl font-bold text-surface-900 dark:text-white">
                {lead.contact_name}
              </h2>
              {lead.company_name && (
                <p className="text-sm text-surface-500">{lead.company_name}</p>
              )}
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                <Phone className="h-4 w-4 text-surface-400" />
                <a href={`tel:${lead.phone}`} className="hover:text-brand-600">{lead.phone}</a>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                  <Mail className="h-4 w-4 text-surface-400" />
                  <a href={`mailto:${lead.email}`} className="hover:text-brand-600">{lead.email}</a>
                </div>
              )}
              {lead.telegram && (
                <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                  <Send className="h-4 w-4 text-surface-400" />
                  {lead.telegram}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                <Calendar className="h-4 w-4 text-surface-400" />
                С {formatDate(lead.created_at)}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium text-surface-600 dark:bg-surface-700 dark:text-surface-300">
                {sourceLabels[lead.source] || lead.source}
              </span>
              <span
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: `${lead.stage_color}20`, color: lead.stage_color }}
              >
                {lead.stage_name}
              </span>
            </div>
          </Card>

          {/* WhatsApp widget */}
          <Card>
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: "#25D366" }}
              >
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-surface-900 dark:text-white">
                  WhatsApp
                </p>
                <p className="truncate text-xs text-surface-500">
                  {lead.phone || "Номер не указан"}
                </p>
              </div>
              <Button
                variant="primary"
                disabled={!lead.phone || whatsAppPending}
                onClick={openWhatsApp}
              >
                {whatsAppPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                Написать
              </Button>
            </div>
            {whatsAppError && (
              <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-600 dark:bg-red-900/20 dark:text-red-300">
                {whatsAppError}
              </p>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
              Детали сделки
            </h3>
            <div className="mt-3 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Бюджет</span>
                <span className="font-medium text-success-600">
                  {lead.budget ? formatCurrency(lead.budget) : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Ответственный</span>
                <span className="font-medium">{lead.assigned_to_name || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Создал</span>
                <span className="font-medium">{lead.created_by_name || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Обновлён</span>
                <span className="font-medium">{formatDate(lead.updated_at)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column - Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} tabs={tabs} />

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">Заметки</h3>
                <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">
                  {lead.notes || "Нет заметок"}
                </p>
              </Card>

              {/* Tasks summary */}
              {followup && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card className="border-l-4 border-l-danger-500">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-danger-500" />
                      <span className="text-sm text-surface-500">Просрочено</span>
                    </div>
                    <p className="mt-1 text-xl font-bold text-surface-900 dark:text-white">
                      {followup.overdue?.length || 0}
                    </p>
                  </Card>
                  <Card className="border-l-4 border-l-warning-500">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-warning-500" />
                      <span className="text-sm text-surface-500">На сегодня</span>
                    </div>
                    <p className="mt-1 text-xl font-bold text-surface-900 dark:text-white">
                      {followup.today?.length || 0}
                    </p>
                  </Card>
                  <Card className="border-l-4 border-l-brand-500">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-brand-500" />
                      <span className="text-sm text-surface-500">На неделе</span>
                    </div>
                    <p className="mt-1 text-xl font-bold text-surface-900 dark:text-white">
                      {followup.upcoming?.length || 0}
                    </p>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <Card>
              <div className="space-y-0 divide-y divide-surface-100 dark:divide-surface-700">
                {activities && activities.length > 0 ? (
                  activities.slice(0, 20).map((act: any) => (
                    <div key={act.id} className="flex items-start gap-3 px-1 py-3">
                      <div className={cn(
                        "mt-0.5 flex h-8 w-8 items-center justify-center rounded-full",
                        act.type === "history" ? "bg-brand-50 text-brand-600 dark:bg-brand-900/20" :
                        act.type === "interaction" ? "bg-success-50 text-success-600 dark:bg-green-900/20" :
                        "bg-surface-100 text-surface-500 dark:bg-surface-700"
                      )}>
                        {act.type === "history" ? <History className="h-4 w-4" /> :
                         act.type === "interaction" ? <MessageSquare className="h-4 w-4" /> :
                         <FileText className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-white">
                          {act.action}
                        </p>
                        {act.description && (
                          <p className="mt-0.5 text-sm text-surface-500 line-clamp-2">{act.description}</p>
                        )}
                        <p className="mt-1 text-xs text-surface-400">
                          {act.user_name && <>{act.user_name} · </>}
                          {timeAgo(act.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="Нет активностей" description="История взаимодействий появится здесь" />
                )}
              </div>
            </Card>
          )}

          {/* Tasks Tab */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              {followup ? (
                <>
                  {followup.overdue?.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-danger-600">
                        <AlertCircle className="h-4 w-4" />
                        Просроченные ({followup.overdue.length})
                      </h4>
                      <div className="space-y-2">
                        {followup.overdue.map((task: any) => (
                          <TaskRow key={task.id} task={task} />
                        ))}
                      </div>
                    </div>
                  )}
                  {followup.today?.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-warning-600">
                        <Clock className="h-4 w-4" />
                        На сегодня ({followup.today.length})
                      </h4>
                      <div className="space-y-2">
                        {followup.today.map((task: any) => (
                          <TaskRow key={task.id} task={task} />
                        ))}
                      </div>
                    </div>
                  )}
                  {followup.upcoming?.length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                        <Target className="h-4 w-4" />
                        На неделе ({followup.upcoming.length})
                      </h4>
                      <div className="space-y-2">
                        {followup.upcoming.map((task: any) => (
                          <TaskRow key={task.id} task={task} />
                        ))}
                      </div>
                    </div>
                  )}
                  {(!followup.overdue?.length && !followup.today?.length && !followup.upcoming?.length) && (
                    <EmptyState title="Нет задач" description="Связанные задачи появятся здесь" />
                  )}
                </>
              ) : (
                <LoadingSpinner />
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <Card>
              <div className="space-y-0 divide-y divide-surface-100 dark:divide-surface-700">
                {activities && activities.length > 0 ? (
                  activities.filter((a: any) => a.type === "history").map((act: any) => (
                    <div key={act.id} className="flex items-start gap-3 px-1 py-3">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/20">
                        <History className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-white">
                          {act.action}
                        </p>
                        {act.description && (
                          <p className="mt-0.5 text-sm text-surface-500">{act.description}</p>
                        )}
                        <p className="mt-1 text-xs text-surface-400">
                          {act.user_name && <>{act.user_name} · </>}
                          {timeAgo(act.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="Нет истории" description="Изменения лида появятся здесь" />
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title={`Редактировать: ${lead.contact_name}`}>
        {editingLead && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data: Record<string, unknown> = {};
              formData.forEach((v, k) => { data[k] = v; });
              updateMutation.mutate(data);
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Контактное имя" name="contact_name" defaultValue={editingLead.contact_name} required />
              <Input label="Компания" name="company_name" defaultValue={editingLead.company_name} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Телефон" name="phone" defaultValue={editingLead.phone} required />
              <Input label="Email" name="email" defaultValue={editingLead.email} />
            </div>
            <Input label="Telegram" name="telegram" defaultValue={editingLead.telegram} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Источник"
                name="source"
                options={[
                  { value: "website", label: "Сайт" },
                  { value: "referral", label: "Рекомендация" },
                  { value: "instagram", label: "Instagram" },
                  { value: "facebook", label: "Facebook" },
                  { value: "telegram", label: "Telegram" },
                  { value: "call", label: "Звонок" },
                  { value: "other", label: "Другое" },
                ]}
                defaultValue={editingLead.source}
              />
              <Select
                label="Этап"
                name="current_stage"
                options={stageOptions}
                defaultValue={editingLead.current_stage}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Бюджет" name="budget" type="number" defaultValue={editingLead.budget ?? ""} />
              <Select
                label="Ответственный"
                name="assigned_to"
                options={[{ value: "", label: "Не назначен" }]}
                defaultValue={editingLead.assigned_to || ""}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">Заметки</label>
              <textarea name="notes" defaultValue={editingLead.notes} rows={3} className="input mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>Отмена</Button>
              <Button type="submit">Сохранить</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function TaskRow({ task }: { task: any }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-surface-200 px-3 py-2 dark:border-surface-700">
      <div className="flex items-center gap-2 min-w-0">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-surface-400" />
        <span className="text-sm font-medium text-surface-900 dark:text-white truncate">
          {task.title}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {task.project_name && (
          <span className="text-xs text-surface-500">{task.project_name}</span>
        )}
        {task.deadline && (
          <span className={cn(
            "text-xs whitespace-nowrap",
            new Date(task.deadline) < new Date() ? "text-danger-500" : "text-surface-400"
          )}>
            {formatDate(task.deadline)}
          </span>
        )}
        {task.status_name && (
          <span
            className="rounded px-1.5 py-0.5 text-xs"
            style={{ backgroundColor: `${task.status_color}20`, color: task.status_color }}
          >
            {task.status_name}
          </span>
        )}
      </div>
    </div>
  );
}
