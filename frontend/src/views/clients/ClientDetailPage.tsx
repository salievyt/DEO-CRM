"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  Phone,
  Mail,
  Send,
  MessageCircle,
  MapPin,
  Calendar,
  Building2,
  Edit2,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Tabs } from "@/shared/ui/Tabs";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { clientsApi, projectsApi, financeApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDate, formatCurrency, getInitials, stringToColor } from "@/shared/utils/formatters";
import { useState } from "react";

export function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [activeTab, setActiveTab] = useState("overview");

  const { data: client, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.CLIENT, id],
    queryFn: () => clientsApi.get(id),
    select: (res) => res.data,
    enabled: !!id,
  });

  const { data: clientProjects } = useQuery({
    queryKey: [QUERY_KEYS.PROJECTS, "client", id],
    queryFn: () => projectsApi.list({ client: id }),
    select: (res) => res.data?.results,
    enabled: !!id,
  });

  const { data: invoices } = useQuery({
    queryKey: [QUERY_KEYS.INVOICES, "client", id],
    queryFn: () => financeApi.invoices.list({ client: id }),
    select: (res) => res.data?.results,
    enabled: !!id,
  });

  if (isLoading) {
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
    { value: "projects", label: "Проекты" },
    { value: "invoices", label: "Счета" },
    { value: "interactions", label: "История" },
  ];

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

      {/* Client Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
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
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                <Phone className="h-4 w-4 text-surface-400" />
                {client.phone}
              </div>
              {client.email && (
                <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                  <Mail className="h-4 w-4 text-surface-400" />
                  {client.email}
                </div>
              )}
              {client.telegram && (
                <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                  <Send className="h-4 w-4 text-surface-400" />
                  {client.telegram}
                </div>
              )}
              {client.whatsapp && (
                <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                  <MessageCircle className="h-4 w-4 text-surface-400" />
                  {client.whatsapp}
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                  <MapPin className="h-4 w-4 text-surface-400" />
                  {client.address}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                <Calendar className="h-4 w-4 text-surface-400" />
                С {formatDate(client.created_at)}
              </div>
            </div>

            {client.tags && client.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {client.tags.map((tag: any) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: tag.color + "20",
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </Card>

          <Card className="mt-4">
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
                  {formatCurrency(client.total_revenue)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            tabs={tabs}
          />

          {activeTab === "projects" && (
            <div className="space-y-3">
              {(!clientProjects || clientProjects.length === 0) ? (
                <div className="rounded-xl border border-dashed border-surface-300 p-8 text-center text-sm text-surface-500">
                  Нет проектов
                </div>
              ) : (
                clientProjects.map((project: any) => (
                  <a
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block rounded-lg border border-surface-200 p-4 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-surface-900 dark:text-white">
                          {project.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-surface-500">
                          <StatusBadge status={project.status_name} />
                          {project.deadline && (
                            <span>До {formatDate(project.deadline)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-surface-500">{project.progress}%</div>
                        <div className="mt-1 h-1.5 w-20 rounded-full bg-surface-200">
                          <div
                            className="h-1.5 rounded-full bg-brand-600"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </a>
                ))
              )}
            </div>
          )}

          {activeTab === "invoices" && (
            <div className="space-y-3">
              {(!invoices || invoices.length === 0) ? (
                <div className="rounded-xl border border-dashed border-surface-300 p-8 text-center text-sm text-surface-500">
                  Нет счетов
                </div>
              ) : (
                invoices.map((inv: any) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border border-surface-200 p-4 dark:border-surface-700"
                  >
                    <div>
                      <p className="font-medium text-surface-900 dark:text-white">
                        {inv.number}
                      </p>
                      <p className="text-xs text-surface-500">
                        Создан {formatDate(inv.issued_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{formatCurrency(inv.amount)}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "overview" && (
            <Card>
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
                Информация
              </h3>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-surface-500">Источник</p>
                  <p className="text-surface-900 dark:text-white">{client.source}</p>
                </div>
                {client.notes && (
                  <div>
                    <p className="text-sm font-medium text-surface-500">Заметки</p>
                    <p className="text-surface-900 dark:text-white">{client.notes}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === "interactions" && (
            <div className="rounded-xl border border-dashed border-surface-300 p-8 text-center text-sm text-surface-500">
              История взаимодействий
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
