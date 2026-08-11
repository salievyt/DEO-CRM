"use client";

import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Edit2,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  NotebookPen,
  Phone,
  PhoneCall,
  Plus,
  Send,
  ShoppingCart,
  Target,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Tabs } from "@/shared/ui/Tabs";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import {
  client360Api,
  clientPurchasesApi,
  documentsApi,
  financeApi,
  leadsApi,
  messengerApi,
  projectsApi,
  tasksApi,
} from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import {
  formatCurrency,
  formatDate,
  getInitials,
  stringToColor,
  timeAgo,
} from "@/shared/utils/formatters";
import type {
  ActivityItem,
  Client,
  ClientOverview,
  ClientPurchase,
  Paginated,
} from "@/entities/client/types";
import {
  DealModal,
  DocumentModal,
  NoteModal,
  TaskModal,
} from "@/features/client-360/QuickActionModals";

const HEALTH_META: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "default" }
> = {
  healthy: { label: "Здоров", variant: "success" },
  at_risk: { label: "В зоне риска", variant: "warning" },
  critical: { label: "Критично", variant: "danger" },
};

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-surface-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-surface-900 dark:text-white">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-surface-400">{hint}</p>}
    </Card>
  );
}

const ACTIVITY_ICONS: Record<string, { icon: React.ReactNode; className: string }> = {
  interaction: {
    icon: <NotebookPen className="h-4 w-4" />,
    className: "bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400",
  },
  deal: {
    icon: <Target className="h-4 w-4" />,
    className: "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
  },
  project: {
    icon: <ClipboardList className="h-4 w-4" />,
    className: "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400",
  },
  task: {
    icon: <ClipboardList className="h-4 w-4" />,
    className: "bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400",
  },
  invoice: {
    icon: <FileText className="h-4 w-4" />,
    className: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  },
  payment: {
    icon: <CreditCard className="h-4 w-4" />,
    className: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
  },
  document: {
    icon: <FileText className="h-4 w-4" />,
    className: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  },
  purchase: {
    icon: <ShoppingCart className="h-4 w-4" />,
    className: "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400",
  },
  message: {
    icon: <MessageSquare className="h-4 w-4" />,
    className: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
  },
};

function ActivityIcon({ type }: { type: string }) {
  const meta = ACTIVITY_ICONS[type] || {
    icon: <Plus className="h-4 w-4" />,
    className: "bg-surface-100 text-surface-500",
  };
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.className}`}
    >
      {meta.icon}
    </div>
  );
}

export function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [activeTab, setActiveTab] = useState("overview");
  const [noteModal, setNoteModal] = useState(false);
  const [dealModal, setDealModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [documentModal, setDocumentModal] = useState(false);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: [QUERY_KEYS.CLIENT, "360", id],
    queryFn: () => client360Api.overview(id),
    select: (res) => res.data as ClientOverview,
    enabled: !!id,
  });
  const client: Client | undefined = overview?.client;

  const clientProjects = useQuery({
    queryKey: [QUERY_KEYS.PROJECTS, "client", id],
    queryFn: () => projectsApi.list({ client: id }),
    select: (res) => res.data?.results,
    enabled: !!id,
  });

  const dealsQuery = useQuery({
    queryKey: [QUERY_KEYS.LEADS, "client", id],
    queryFn: () => leadsApi.list({ client: id }),
    select: (res) => res.data?.results,
    enabled: !!id && activeTab === "deals",
  });

  const chatsQuery = useQuery({
    queryKey: [QUERY_KEYS.CHATS, "client", id],
    queryFn: () => messengerApi.chats.list({ client: id }),
    select: (res) => res.data?.results,
    enabled: !!id && activeTab === "messages",
  });

  const tasksQuery = useQuery({
    queryKey: [QUERY_KEYS.TASKS, "client", id],
    queryFn: () => tasksApi.list({ client: id }),
    select: (res) => res.data?.results,
    enabled: !!id && activeTab === "tasks",
  });

  const documentsQuery = useQuery({
    queryKey: [QUERY_KEYS.DOCUMENTS, "client", id],
    queryFn: () => documentsApi.list({ client: id }),
    select: (res) => res.data?.results,
    enabled: !!id && activeTab === "documents",
  });

  const purchasesQuery = useQuery({
    queryKey: [QUERY_KEYS.INVOICES, "purchases", "client", id],
    queryFn: () => clientPurchasesApi.list(id),
    select: (res) => res.data as Paginated<ClientPurchase>,
    enabled: !!id && activeTab === "products",
  });

  const paymentsQuery = useQuery({
    queryKey: [QUERY_KEYS.INVOICES, "payments", "client", id],
    queryFn: () => financeApi.payments.list({ client: id }),
    select: (res) => res.data?.results,
    enabled: !!id && activeTab === "payments",
  });

  const activityQuery = useInfiniteQuery({
    queryKey: [QUERY_KEYS.CLIENT_INTERACTIONS, "activity", id],
    queryFn: ({ pageParam = 1 }) =>
      client360Api.activity(id, { page: pageParam }).then((res) => res.data),
    select: (data) => data.pages.flatMap((page) => page.results as ActivityItem[]),
    getNextPageParam: (lastPage) => (lastPage.next ? lastPage.next : undefined),
    initialPageParam: 1,
    enabled: !!id && activeTab === "activity",
  });

  if (overviewLoading && !client) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-surface-500">Клиент не найден</p>
      </div>
    );
  }

  const tabs = [
    { value: "overview", label: "Обзор" },
    { value: "activity", label: "Активность" },
    { value: "deals", label: "Сделки" },
    { value: "messages", label: "Сообщения" },
    { value: "tasks", label: "Задачи" },
    { value: "documents", label: "Документы" },
    { value: "products", label: "Товары" },
    { value: "payments", label: "Платежи" },
    { value: "notes", label: "Заметки" },
  ];

  const health = client.health;
  const healthMeta = health ? HEALTH_META[health.level] : undefined;
  const summary = overview?.summary;
  const activityItems = activityQuery.data ?? [];
  const hasMore =
    activityQuery.hasNextPage && activityItems.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.full_name}
        description={client.company_name || "Частное лицо"}
        actions={
          <Button variant="secondary">
            <Edit2 className="h-4 w-4" />
            Редактировать
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: contacts + quick actions */}
        <div className="space-y-4">
          <Card>
            <div className="text-center">
              <div
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
                style={{ backgroundColor: stringToColor(client.full_name) }}
              >
                {getInitials(client.first_name, client.last_name)}
              </div>
              <h2 className="mt-3 text-xl font-bold text-surface-900 dark:text-white">
                {client.full_name}
              </h2>
              {client.company_name && (
                <p className="text-sm text-surface-500">{client.company_name}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {client.status && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: client.status.color + "20",
                      color: client.status.color,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: client.status.color }}
                    />
                    {client.status.name}
                  </span>
                )}
                {healthMeta && (
                  <Badge variant={healthMeta.variant} dot>
                    {healthMeta.label}
                  </Badge>
                )}
                {!client.is_active && (
                  <Badge variant="danger" dot>
                    Неактивен
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <a
                href={`/calls?client_id=${id}`}
                title="Журнал звонков клиента"
                className="group flex items-center gap-2 text-sm text-surface-600 hover:text-brand-600 dark:text-surface-300"
              >
                <Phone className="h-4 w-4 text-surface-400" />
                <span className="font-mono">{client.phone}</span>
                <PhoneCall className="ml-auto h-3.5 w-3.5 text-surface-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-surface-500" />
              </a>
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-2 text-sm text-surface-600 hover:text-brand-600 dark:text-surface-300"
                >
                  <Mail className="h-4 w-4 text-surface-400" />
                  {client.email}
                </a>
              )}
              {client.telegram && (
                <a
                  href={`https://t.me/${client.telegram.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-surface-600 hover:text-brand-600 dark:text-surface-300"
                >
                  <Send className="h-4 w-4 text-surface-400" />
                  {client.telegram}
                </a>
              )}
              {client.whatsapp && (
                <a
                  href={`https://wa.me/${client.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-surface-600 hover:text-brand-600 dark:text-surface-300"
                >
                  <MessageCircle className="h-4 w-4 text-surface-400" />
                  {client.whatsapp}
                </a>
              )}
              {client.address && (
                <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                  <MapPin className="h-4 w-4 text-surface-400" />
                  {client.address}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                <Calendar className="h-4 w-4 text-surface-400" />
                Клиент с {formatDate(client.created_at)}
              </div>
            </div>

            {client.tags && client.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {client.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: tag.color + "20", color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
              Быстрые действия
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={`tel:${client.phone}`}>
                <Button variant="secondary" size="sm" fullWidth>
                  <PhoneCall className="h-4 w-4" />
                  Позвонить
                </Button>
              </a>
              <a href={`/calls?client_id=${id}`}>
                <Button variant="secondary" size="sm" fullWidth>
                  <Phone className="h-4 w-4" />
                  Звонки
                </Button>
              </a>
              <a
                href={`https://wa.me/${
                  client.whatsapp
                    ? client.whatsapp.replace(/[^0-9]/g, "")
                    : client.phone.replace(/[^0-9]/g, "")
                }`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="secondary" size="sm" fullWidth>
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              </a>
              <a href={client.email ? `mailto:${client.email}` : undefined}>
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  disabled={!client.email}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              </a>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => setTaskModal(true)}
              >
                <ClipboardList className="h-4 w-4" />
                Задача
              </Button>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => setDealModal(true)}
              >
                <Target className="h-4 w-4" />
                Сделка
              </Button>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => setDocumentModal(true)}
              >
                <FileText className="h-4 w-4" />
                Документ
              </Button>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => setNoteModal(true)}
              >
                <NotebookPen className="h-4 w-4" />
                Заметка
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
              Финансовая статистика
            </h3>
            <div className="mt-3 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Проекты</span>
                <span className="font-medium">{client.total_projects}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Выручка</span>
                <span className="font-medium text-success-600">
                  {formatCurrency(Number(client.total_revenue || 0))}
                </span>
              </div>
              {health && (
                <div className="border-t border-surface-100 pt-3 dark:border-surface-700">
                  {[...health.reasons.critical, ...health.reasons.at_risk].map(
                    (reason) => (
                      <p key={reason} className="text-xs text-surface-500">
                        • {reason}
                      </p>
                    )
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right column: summary + tabs */}
        <div className="space-y-6 lg:col-span-2">
          {summary && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <SummaryCard
                label="Выручка"
                value={formatCurrency(Number(summary.total_revenue))}
                hint={`${summary.deals_won} выигранных сделок`}
              />
              <SummaryCard
                label="Активные сделки"
                value={String(summary.deals_active)}
                hint={`Всего: ${summary.deals_total}`}
              />
              <SummaryCard
                label="Средний чек"
                value={formatCurrency(Number(summary.avg_deal_size))}
              />
              <SummaryCard
                label="Последний контакт"
                value={summary.last_contact ? timeAgo(summary.last_contact) : "—"}
              />
              <SummaryCard
                label="Следующее действие"
                value={summary.next_action || "—"}
                hint={
                  summary.next_action_at
                    ? formatDate(summary.next_action_at)
                    : undefined
                }
              />
              <SummaryCard
                label="Этап сделки"
                value={summary.current_stage || "—"}
              />
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} tabs={tabs} />

          {activeTab === "overview" && (
            <Card>
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
                Информация
              </h3>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-surface-500">Источник</p>
                  <p className="text-surface-900 dark:text-white">
                    {client.source}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-500">
                    Показатели
                  </p>
                  <p className="text-sm text-surface-700 dark:text-surface-200">
                    Счета: {overview?.counts.invoices} · Платежи:{" "}
                    {overview?.counts.payments}
                  </p>
                  <p className="text-sm text-surface-700 dark:text-surface-200">
                    Задачи: {overview?.counts.tasks} · Документы:{" "}
                    {overview?.counts.documents}
                  </p>
                  <p className="text-sm text-surface-700 dark:text-surface-200">
                    Сообщения: {overview?.counts.messages} · Покупки:{" "}
                    {overview?.counts.purchases}
                  </p>
                </div>
              </div>
              {client.notes && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-surface-500">Заметки</p>
                  <p className="whitespace-pre-wrap text-surface-900 dark:text-white">
                    {client.notes}
                  </p>
                </div>
              )}
            </Card>
          )}

          {activeTab === "activity" && (
            <Card
              padding="none"
              className="divide-y divide-surface-100 dark:divide-surface-700"
            >
              {activityQuery.isLoading && <LoadingSpinner className="my-10" />}
              {!activityQuery.isLoading && activityItems.length === 0 && (
                <EmptyState
                  title="Нет активности"
                  description="Пока нет записей в хронологии клиента"
                  className="m-4"
                />
              )}
              {activityItems.map((item) => (
                <div key={item.id} className="flex gap-3 p-4">
                  <ActivityIcon type={item.entity_type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                        {item.title}
                      </p>
                      <span className="shrink-0 text-xs text-surface-400">
                        {timeAgo(item.timestamp)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-surface-500">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-surface-400">
                      {item.ref_label && (
                        <Badge variant="default">{item.ref_label}</Badge>
                      )}
                      {item.actor && <span>{item.actor}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {hasMore && (
                <div className="p-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    loading={activityQuery.isFetchingNextPage}
                    onClick={() => activityQuery.fetchNextPage()}
                  >
                    <ChevronDown className="h-4 w-4" />
                    Показать еще
                  </Button>
                </div>
              )}
            </Card>
          )}

          {activeTab === "deals" && (
            <div className="space-y-3">
              {dealsQuery.isLoading && <LoadingSpinner className="my-10" />}
              {!dealsQuery.isLoading &&
                (!dealsQuery.data || dealsQuery.data.length === 0) && (
                  <EmptyState
                    title="Нет сделок"
                    description="Создайте сделку через быстрые действия"
                  />
                )}
              {(dealsQuery.data ?? []).map((deal: any) => (
                <a
                  key={deal.id}
                  href={`/leads/${deal.id}`}
                  className="block rounded-lg border border-surface-200 p-4 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-surface-900 dark:text-white">
                        {deal.contact_name}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-surface-500">
                        <StatusBadge status={deal.stage_name} />
                        {deal.budget && (
                          <span>{formatCurrency(Number(deal.budget))}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-surface-400">
                      {formatDate(deal.created_at)}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}

          {activeTab === "messages" && (
            <div className="space-y-3">
              {chatsQuery.isLoading && <LoadingSpinner className="my-10" />}
              {!chatsQuery.isLoading &&
                (!chatsQuery.data || chatsQuery.data.length === 0) && (
                  <EmptyState
                    title="Нет чатов"
                    description="Чаты с клиентом появятся здесь"
                  />
                )}
              {(chatsQuery.data ?? []).map((chat: any) => (
                <a
                  key={chat.id}
                  href={`/messenger?chat=${chat.id}`}
                  className="block rounded-lg border border-surface-200 p-4 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-surface-400" />
                      <div>
                        <p className="font-medium text-surface-900 dark:text-white">
                          {chat.name || "Чат"}
                        </p>
                        <p className="text-xs text-surface-500">
                          {chat.last_message}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-surface-400">
                      {formatDate(chat.updated_at)}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="space-y-3">
              {tasksQuery.isLoading && <LoadingSpinner className="my-10" />}
              {!tasksQuery.isLoading &&
                (!tasksQuery.data || tasksQuery.data.length === 0) && (
                  <EmptyState
                    title="Нет задач"
                    description="Задачи по проектам клиента появятся здесь"
                  />
                )}
              {(tasksQuery.data ?? []).map((task: any) => (
                <a
                  key={task.id}
                  href="/tasks"
                  className="block rounded-lg border border-surface-200 p-4 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-surface-900 dark:text-white">
                        {task.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-surface-500">
                        <StatusBadge status={task.status_name} />
                        <span>{task.project_name}</span>
                      </div>
                    </div>
                    {task.deadline && (
                      <span className="text-xs text-surface-400">
                        До {formatDate(task.deadline)}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-3">
              {documentsQuery.isLoading && <LoadingSpinner className="my-10" />}
              {!documentsQuery.isLoading &&
                (!documentsQuery.data || documentsQuery.data.length === 0) && (
                  <EmptyState
                    title="Нет документов"
                    description="Договоры, счета, КП и акты клиента"
                  />
                )}
              {(documentsQuery.data ?? []).map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-surface-200 p-4 dark:border-surface-700"
                >
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {doc.title}
                    </p>
                    <p className="text-xs text-surface-500">
                      {doc.document_type_name} · {formatDate(doc.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              ))}
            </div>
          )}

          {activeTab === "products" && (
            <div className="space-y-3">
              {purchasesQuery.isLoading && <LoadingSpinner className="my-10" />}
              {!purchasesQuery.isLoading &&
                (!purchasesQuery.data?.results ||
                  purchasesQuery.data.results.length === 0) && (
                  <EmptyState
                    title="Нет покупок"
                    description="Купленные товары и услуги клиента"
                  />
                )}
              {(purchasesQuery.data?.results ?? []).map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between rounded-lg border border-surface-200 p-4 dark:border-surface-700"
                >
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {purchase.product_name}
                    </p>
                    <p className="text-xs text-surface-500">
                      {purchase.quantity} ×{" "}
                      {formatCurrency(Number(purchase.unit_price))} ·{" "}
                      {formatDate(purchase.purchased_at)}
                    </p>
                  </div>
                  <span className="font-medium text-surface-900 dark:text-white">
                    {formatCurrency(Number(purchase.total_price))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "payments" && (
            <div className="space-y-3">
              {paymentsQuery.isLoading && <LoadingSpinner className="my-10" />}
              {!paymentsQuery.isLoading &&
                (!paymentsQuery.data || paymentsQuery.data.length === 0) && (
                  <EmptyState
                    title="Нет платежей"
                    description="Поступления по счетам клиента"
                  />
                )}
              {(paymentsQuery.data ?? []).map((payment: any) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border border-surface-200 p-4 dark:border-surface-700"
                >
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {formatCurrency(Number(payment.amount))}
                    </p>
                    <p className="text-xs text-surface-500">
                      Счет {payment.invoice_number} · {payment.method}
                    </p>
                  </div>
                  <span className="text-xs text-surface-400">
                    {formatDate(payment.paid_at)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-3">
              <Button size="sm" onClick={() => setNoteModal(true)}>
                <NotebookPen className="h-4 w-4" />
                Добавить заметку
              </Button>
              {client.notes && (
                <Card>
                  <p className="whitespace-pre-wrap text-sm text-surface-700 dark:text-surface-200">
                    {client.notes}
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      <NoteModal
        clientId={id}
        open={noteModal}
        onClose={() => setNoteModal(false)}
      />
      <DealModal
        clientId={id}
        clientName={client.full_name}
        clientPhone={client.phone}
        open={dealModal}
        onClose={() => setDealModal(false)}
      />
      <TaskModal clientId={id} open={taskModal} onClose={() => setTaskModal(false)} />
      <DocumentModal
        clientId={id}
        open={documentModal}
        onClose={() => setDocumentModal(false)}
      />
    </div>
  );
}
