"use client";

import { useQuery } from "@tanstack/react-query";
import {
  FolderKanban,
  FileText,
  DollarSign,
  MessageSquare,
  CheckCircle,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { cabinetApi } from "@/shared/api/base";
import { formatDate, formatCurrency } from "@/shared/utils/formatters";
import type { Project } from "@/entities/project/types";

export function CabinetPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["cabinet-dashboard"],
    queryFn: () => cabinetApi.dashboard(),
    select: (res) => res.data,
  });

  const { data: projects } = useQuery({
    queryKey: ["cabinet-projects"],
    queryFn: () => cabinetApi.projects(),
    select: (res) => res.data as Project[],
  });

  const { data: documents } = useQuery({
    queryKey: ["cabinet-documents"],
    queryFn: () => cabinetApi.documents(),
    select: (res) => res.data,
  });

  const { data: invoices } = useQuery({
    queryKey: ["cabinet-invoices"],
    queryFn: () => cabinetApi.invoices(),
    select: (res) => res.data,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Мой кабинет"
        description="Личный кабинет клиента"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center gap-2 text-brand-600">
            <FolderKanban className="h-5 w-5" />
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {dashboard?.active_projects || 0}
          </p>
          <p className="text-sm text-surface-500">Активные проекты</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-purple-600">
            <FileText className="h-5 w-5" />
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {dashboard?.total_documents || 0}
          </p>
          <p className="text-sm text-surface-500">Документы</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-warning-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {dashboard?.open_invoices || 0}
          </p>
          <p className="text-sm text-surface-500">Открытые счета</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-success-600">
            <MessageSquare className="h-5 w-5" />
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {dashboard?.unread_messages || 0}
          </p>
          <p className="text-sm text-surface-500">Непрочитанные</p>
        </Card>
      </div>

      {/* My Projects */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">
          Мои проекты
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(projects || []).map((project: any) => (
            <Card key={project.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-white">
                    {project.name}
                  </h3>
                  <StatusBadge status={project.status_name} />
                </div>
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

              {project.deadline && (
                <div className="mt-3 flex items-center gap-1 text-xs text-surface-500">
                  <Clock className="h-3 w-3" />
                  Срок: {formatDate(project.deadline)}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Documents & Invoices Preview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Последние документы
          </h3>
          {(!documents || documents.length === 0) ? (
            <p className="py-4 text-center text-sm text-surface-400">
              Нет документов
            </p>
          ) : (
            <div className="space-y-2">
              {(documents as any[]).slice(0, 5).map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-surface-100 p-3 dark:border-surface-700"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-surface-400" />
                    <span className="text-sm text-surface-700 dark:text-surface-300">
                      {doc.title}
                    </span>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Последние счета
          </h3>
          {(!invoices || invoices.length === 0) ? (
            <p className="py-4 text-center text-sm text-surface-400">
              Нет счетов
            </p>
          ) : (
            <div className="space-y-2">
              {(invoices as any[]).slice(0, 5).map((inv: any) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border border-surface-100 p-3 dark:border-surface-700"
                >
                  <div>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">
                      {inv.number}
                    </p>
                    <p className="text-xs text-surface-500">
                      {formatCurrency(inv.amount)}
                    </p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
