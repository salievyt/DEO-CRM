"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  ClipboardList,
  Copy,
  ExternalLink,
  EyeOff,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";

import { surveysApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { toast } from "@/shared/ui/Toast";
import { SURVEYS_PATH } from "@/entities/surveys/access";
import { SURVEY_STATUS_LABELS, type Paginated, type Survey } from "@/entities/surveys/types";
import {
  STATUS_BADGE,
  absolutePublicUrl,
  copyToClipboard,
  extractError,
  formatDate,
} from "@/features/surveys/utils";

const PAGE_SIZE = 50;

export function SurveysListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<Survey | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: [QUERY_KEYS.SURVEYS],
    queryFn: () =>
      surveysApi.list({ page_size: PAGE_SIZE }).then((res) => res.data as Paginated<Survey>),
  });

  const surveys = useMemo(() => data?.results || [], [data]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SURVEYS] });

  const toggleMutation = useMutation({
    mutationFn: (survey: Survey) =>
      survey.is_active ? surveysApi.deactivate(survey.id) : surveysApi.activate(survey.id),
    onSuccess: (_res, survey) => {
      invalidate();
      toast({
        title: survey.is_active ? "Приём ответов отключён" : "Приём ответов включён",
        type: "success",
      });
    },
    onError: (err) =>
      toast({ title: "Не удалось изменить статус", message: extractError(err), type: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => surveysApi.remove(id),
    onSuccess: () => {
      invalidate();
      setToDelete(null);
      toast({ title: "Опрос удалён", type: "success" });
    },
    onError: (err) =>
      toast({ title: "Не удалось удалить", message: extractError(err), type: "error" }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return surveys;
    }
    return surveys.filter((s) => s.title.toLowerCase().includes(q));
  }, [surveys, search]);

  const totalResponses = surveys.reduce((sum, s) => sum + s.response_count, 0);
  const openCount = surveys.filter((s) => s.status === "open").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Опросы"
        description="Опросы сотрудников: конструктор, публичные ссылки и результаты"
        actions={
          <Link href={`${SURVEYS_PATH}/new`} className="btn-primary">
            <Plus className="h-4 w-4" />
            Создать опрос
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Опросов" value={data?.count ?? 0} />
        <StatCard label="Идёт сбор ответов" value={openCount} />
        <StatCard label="Всего ответов" value={totalResponses} />
      </div>

      <div className="relative sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию..."
          aria-label="Поиск опросов"
          className="input pl-10"
        />
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" text="Загружаем опросы..." />
          </div>
        ) : isError ? (
          <div className="p-6">
            <EmptyState
              title="Не удалось загрузить опросы"
              description="Обновите страницу или попробуйте позже."
            />
          </div>
        ) : surveys.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Опросов пока нет"
              description="Создайте первый опрос и отправьте ссылку команде"
              icon={<ClipboardList className="h-10 w-10" />}
              action={
                <Link href={`${SURVEYS_PATH}/new`} className="btn-primary">
                  <Plus className="h-4 w-4" />
                  Создать опрос
                </Link>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Ничего не найдено" icon={<Search className="h-10 w-10" />} />
          </div>
        ) : (
          <ul className="divide-y divide-surface-200 dark:divide-surface-700">
            {filtered.map((survey) => {
              const url = absolutePublicUrl(survey.public_url, survey.public_token);
              return (
                <li
                  key={survey.id}
                  className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-surface-50/60 dark:hover:bg-surface-700/30 sm:px-6 lg:flex-row lg:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`${SURVEYS_PATH}/${survey.id}`}
                          className="truncate font-medium text-surface-900 hover:text-brand-600 dark:text-white"
                        >
                          {survey.title}
                        </Link>
                        <Badge variant={STATUS_BADGE[survey.status]} dot>
                          {SURVEY_STATUS_LABELS[survey.status]}
                        </Badge>
                        {survey.is_anonymous ? (
                          <Badge variant="outline">
                            <EyeOff className="h-3 w-3" /> Анонимный
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <UserRound className="h-3 w-3" /> Именной
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-surface-500">
                        Ответов:{" "}
                        <span className="font-semibold text-surface-700 dark:text-surface-200">
                          {survey.response_count}
                        </span>
                        {" · "}вопросов: {survey.question_count}
                        {survey.starts_at || survey.ends_at
                          ? ` · ${survey.starts_at ? `с ${formatDate(survey.starts_at)}` : ""}${
                              survey.ends_at ? ` до ${formatDate(survey.ends_at)}` : ""
                            }`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <Button
                      size="sm"
                      variant={survey.is_active ? "secondary" : "primary"}
                      onClick={() => toggleMutation.mutate(survey)}
                      loading={
                        toggleMutation.isPending && toggleMutation.variables?.id === survey.id
                      }
                    >
                      {survey.is_active ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                      {survey.is_active ? "Выключить" : "Включить"}
                    </Button>
                    <IconAction
                      title="Копировать публичную ссылку"
                      onClick={() => copyToClipboard(url)}
                    >
                      <Copy className="h-4 w-4" />
                    </IconAction>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      title="Открыть публичную страницу"
                      aria-label="Открыть публичную страницу"
                      className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-brand-600 dark:hover:bg-surface-700 dark:hover:text-brand-300"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <Link
                      href={`${SURVEYS_PATH}/${survey.id}/results`}
                      title="Результаты"
                      aria-label="Результаты"
                      className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-200"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`${SURVEYS_PATH}/${survey.id}`}
                      title="Редактировать"
                      aria-label="Редактировать"
                      className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-200"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setToDelete(survey)}
                      title="Удалить"
                      aria-label="Удалить"
                      className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Удалить опрос?"
        description={
          toDelete
            ? `Опрос «${toDelete.title}» и все ответы (${toDelete.response_count}) будут удалены безвозвратно.`
            : undefined
        }
        confirmLabel="Удалить"
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-sm text-surface-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">{value}</p>
    </Card>
  );
}

function IconAction({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-200"
    >
      {children}
    </button>
  );
}
