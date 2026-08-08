"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  History,
  ListTodo,
  Filter,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Select } from "@/shared/ui/Select";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { crmApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { timeAgo, formatDate, cn } from "@/shared/utils/formatters";

const typeIcons: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  message: MessageSquare,
  note: FileText,
  task: ListTodo,
  history: History,
};

const typeColors: Record<string, string> = {
  call: "bg-green-50 text-green-600 dark:bg-green-900/20",
  email: "bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300",
  meeting: "bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300",
  message: "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20",
  note: "bg-amber-50 text-amber-600 dark:bg-amber-900/20",
  task: "bg-orange-50 text-orange-600 dark:bg-orange-900/20",
  history: "bg-brand-50 text-brand-600 dark:bg-brand-900/20",
};

const typeLabels: Record<string, string> = {
  call: "Звонок",
  email: "Email",
  meeting: "Встреча",
  message: "Сообщение",
  note: "Заметка",
  task: "Задача",
  history: "Изменение этапа",
};

export function ActivitiesPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const { data: allActivities, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.LEADS, "activities"],
    queryFn: () => crmApi.leads.activities({ limit: 100 }),
    select: (res) => res.data as any[],
  });

  const filtered = (allActivities || []).filter((act) => {
    if (typeFilter !== "all" && act.type !== typeFilter) return false;
    if (dateFilter === "today") {
      const today = new Date().toISOString().slice(0, 10);
      if (act.created_at?.slice(0, 10) !== today) return false;
    }
    if (dateFilter === "week") {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      if (act.created_at < weekAgo) return false;
    }
    return true;
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Активности"
        description="Лента звонков, встреч, писем, сообщений и задач"
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-surface-500">
          <Filter className="h-4 w-4" />
          Фильтр:
        </div>
        <Select
          options={[
            { value: "all", label: "Все типы" },
            { value: "history", label: "Изменения этапов" },
            { value: "call", label: "Звонки" },
            { value: "email", label: "Email" },
            { value: "meeting", label: "Встречи" },
            { value: "message", label: "Сообщения" },
            { value: "note", label: "Заметки" },
            { value: "task", label: "Задачи" },
          ]}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-48"
        />
        <Select
          options={[
            { value: "all", label: "За всё время" },
            { value: "today", label: "Сегодня" },
            { value: "week", label: "За неделю" },
          ]}
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-40"
        />
      </div>

      {/* Activity Feed */}
      {filtered && filtered.length > 0 ? (
        <div className="space-y-1">
          {filtered.map((act: any, idx: number) => {
            const Icon = typeIcons[act.type] || History;
            const colorClass = typeColors[act.type] || typeColors.history;
            const label = typeLabels[act.type] || act.action;
            return (
              <div
                key={act.id || idx}
                className="flex items-start gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50"
              >
                <div className={cn("mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl", colorClass)}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-surface-900 dark:text-white">
                      {label}
                    </span>
                    {act.lead_name && (
                      <>
                        <span className="text-surface-300">·</span>
                        <span className="text-sm text-surface-500 truncate">{act.lead_name}</span>
                      </>
                    )}
                  </div>
                  {act.description && (
                    <p className="mt-0.5 text-sm text-surface-500 line-clamp-2">{act.description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-surface-400">
                    {act.user_name && <span>{act.user_name}</span>}
                    <span>·</span>
                    <span>{timeAgo(act.created_at)}</span>
                    <span>·</span>
                    <span>{formatDate(act.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Нет активностей"
          description="Здесь будут отображаться звонки, встречи, письма и задачи"
        />
      )}
    </div>
  );
}
