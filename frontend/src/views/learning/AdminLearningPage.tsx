"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Clock,
  ExternalLink,
  Eye,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { learningApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { cn } from "@/shared/utils/cn";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { CATEGORY_META } from "@/views/learning/learningMeta";
import type { LearningAdminArticle } from "@/entities/learning/types";

export function AdminLearningPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [toDelete, setToDelete] = useState<LearningAdminArticle | null>(null);
  const queryClient = useQueryClient();

  const { data: articles, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.LEARNING_ADMIN_ARTICLES],
    queryFn: () => learningApi.admin.list(),
    select: (res): LearningAdminArticle[] => res.data?.results || [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => learningApi.admin.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEARNING_ADMIN_ARTICLES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEARNING_ARTICLES] });
      setToDelete(null);
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (articles || []).filter((article) => {
      if (status === "published" && !article.is_published) return false;
      if (status === "draft" && article.is_published) return false;
      if (!q) return true;
      return (
        article.title.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q)
      );
    });
  }, [articles, search, status]);

  const publishedCount = articles?.filter((a) => a.is_published).length || 0;
  const draftCount = (articles?.length || 0) - publishedCount;
  const totalMinutes =
    articles?.reduce((sum, a) => sum + a.reading_time_minutes, 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="База знаний"
        description="Управление статьями и контентом раздела «Обучение»"
        actions={
          <Link href="/admin/learning/new">
            <Button>
              <Plus className="h-4 w-4" />
              Создать статью
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpen} label="Всего статей" value={articles?.length || 0} />
        <StatCard icon={Eye} label="Опубликовано" value={publishedCount} />
        <StatCard icon={Layers} label="Черновиков" value={draftCount} />
        <StatCard icon={Clock} label="Минут чтения" value={totalMinutes} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={status === "all"} onClick={() => setStatus("all")} label="Все" />
          <FilterChip active={status === "published"} onClick={() => setStatus("published")} label="Опубликованные" />
          <FilterChip active={status === "draft"} onClick={() => setStatus("draft")} label="Черновики" />
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по статьям..."
            className="input pl-10"
          />
        </div>
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" text="Загружаем статьи..." />
          </div>
        ) : !articles || articles.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Статей пока нет"
              description="Создайте первую статью для раздела «Обучение»"
              icon={<BookOpen className="h-10 w-10" />}
              action={
                <Link href="/admin/learning/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Создать статью
                  </Button>
                </Link>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Ничего не найдено"
              description="Попробуйте изменить запрос или сбросить фильтры"
              icon={<Search className="h-10 w-10" />}
            />
          </div>
        ) : (
          <div className="divide-y divide-surface-200 dark:divide-surface-700">
            {filtered.map((article) => {
              const meta = CATEGORY_META[article.category] || CATEGORY_META.basics;
              const Icon = meta.icon;
              return (
                <div
                  key={article.id}
                  className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-surface-50/60 dark:hover:bg-surface-700/30 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg", meta.chip)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/learning/${article.id}`}
                          className="truncate font-medium text-surface-900 transition-colors hover:text-brand-700 dark:text-white dark:hover:text-brand-300"
                        >
                          {article.title}
                        </Link>
                        {article.is_published ? (
                          <Badge variant="success" dot>Опубликована</Badge>
                        ) : (
                          <Badge variant="warning" dot>Черновик</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-surface-500">
                        {article.category_display} · {article.reading_time_minutes} мин ·{" "}
                        {article.section_count} разд.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2">
                    <IconButton
                      href={`/learning/${article.slug}`}
                      title="Открыть статью"
                      icon={<ExternalLink className="h-4 w-4" />}
                    />
                    <IconButton
                      href={`/admin/learning/${article.id}`}
                      title="Редактировать"
                      icon={<Pencil className="h-4 w-4" />}
                    />
                    <button
                      type="button"
                      onClick={() => setToDelete(article)}
                      title="Удалить"
                      className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Удалить статью?"
        description={
          toDelete
            ? `Статья «${toDelete.title}» будет удалена безвозвратно.`
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

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-sm text-surface-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
          {value}
        </p>
      </div>
      <div className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
        <Icon className="h-5 w-5" />
      </div>
    </Card>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
        active
          ? "border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-600/20"
          : "border-surface-200 bg-white text-surface-600 hover:border-brand-300 hover:text-brand-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:border-brand-500/50 dark:hover:text-brand-300"
      )}
    >
      {label}
    </button>
  );
}

function IconButton({
  href,
  title,
  icon,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={title}
      className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-200"
    >
      {icon}
    </Link>
  );
}
