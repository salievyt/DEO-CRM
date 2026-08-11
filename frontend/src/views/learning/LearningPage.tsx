"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  Library,
  Search,
} from "lucide-react";

import { learningApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { cn } from "@/shared/utils/cn";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import {
  CATEGORY_META,
  migrateLegacyReads,
} from "@/views/learning/learningMeta";
import type {
  LearningArticle,
  LearningCategory,
  LearningListResponse,
} from "@/entities/learning/types";

export function LearningPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<LearningCategory | "all">("all");

  // One-time migration of progress saved under the old localStorage key.
  useEffect(() => {
    migrateLegacyReads();
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: [QUERY_KEYS.LEARNING_ARTICLES],
    queryFn: () => learningApi.list(),
    select: (res): LearningListResponse => res.data,
  });

  const articles = data?.results || [];
  const categories = data?.categories || [];
  const read = data?.read || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter((article) => {
      if (category !== "all" && article.category !== category) return false;
      if (!q) return true;
      return (
        article.title.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q)
      );
    });
  }, [articles, category, search]);

  const totalMinutes = useMemo(
    () => articles.reduce((sum, a) => sum + a.reading_time_minutes, 0),
    [articles]
  );
  const readCount = articles.filter((a) => read.includes(a.slug)).length;
  const progress = articles.length ? Math.round((readCount / articles.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 p-6 text-white shadow-lg shadow-brand-900/10 sm:p-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-indigo-400/20 blur-2xl"
          aria-hidden
        />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-brand-50 backdrop-blur">
            <Library className="h-3.5 w-3.5" />
            База знаний
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Обучение DEO CRM
          </h1>
          <p className="mt-2 text-sm text-brand-100 sm:text-base">
            Статьи и видеоуроки по работе с системой — от первых шагов до
            продвинутых настроек.
          </p>

          <div className="relative mt-6 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-200" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по статьям..."
              className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder-brand-200 outline-none backdrop-blur transition focus:border-white/40 focus:bg-white/15"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-200" />
              <span className="font-semibold">{articles.length}</span>
              <span className="text-brand-100">статей</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-200" />
              <span className="font-semibold">{totalMinutes} мин</span>
              <span className="text-brand-100">чтения</span>
            </div>
            <div className="flex min-w-40 items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-brand-100">
                {readCount}/{articles.length} прочитано
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <CategoryChip
          active={category === "all"}
          onClick={() => setCategory("all")}
          label="Все статьи"
          count={articles.length}
        />
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat.value];
          const Icon = meta.icon;
          return (
            <CategoryChip
              key={cat.value}
              active={category === cat.value}
              onClick={() => setCategory(cat.value)}
              label={cat.label}
              count={cat.count}
              icon={<Icon className="h-3.5 w-3.5" />}
            />
          );
        })}
      </div>

      {/* Articles grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" text="Загружаем статьи..." />
        </div>
      ) : isError ? (
        <EmptyState
          title="Не удалось загрузить статьи"
          description="Проверьте подключение к серверу и попробуйте ещё раз."
          icon={<BookOpen className="h-10 w-10" />}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description={
            search || category !== "all"
              ? "Попробуйте изменить запрос или сбросить фильтры."
              : "Статьи появятся здесь после публикации."
          }
          icon={<Search className="h-10 w-10" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((article) => (
            <ArticleCard key={article.slug} article={article} read={read.includes(article.slug)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
        active
          ? "border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-600/20"
          : "border-surface-200 bg-white text-surface-600 hover:border-brand-300 hover:text-brand-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:border-brand-500/50 dark:hover:text-brand-300"
      )}
    >
      {icon}
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-xs font-semibold",
          active ? "bg-white/20 text-white" : "bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-400"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ArticleCard({
  article,
  read,
}: {
  article: LearningArticle;
  read: boolean;
}) {
  const meta = CATEGORY_META[article.category] || CATEGORY_META.basics;
  const Icon = meta.icon;

  return (
    <Link
      href={`/learning/${article.slug}`}
      className="group relative flex flex-col rounded-2xl border border-surface-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/5 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-brand-500/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105", meta.chip)}>
          <Icon className="h-5 w-5" />
        </div>
        {read ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-semibold text-success-600 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            Прочитано
          </span>
        ) : (
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.badge)}>
            {article.category_display}
          </span>
        )}
      </div>

      <h3 className="mt-4 line-clamp-2 text-base font-semibold text-surface-900 transition-colors group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
        {article.title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-surface-500">
        {article.summary}
      </p>

      <div className="mt-4 flex items-center gap-4 border-t border-surface-100 pt-4 text-xs text-surface-500 dark:border-surface-700">
        <span className="inline-flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          {article.section_count} разд.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {article.reading_time_minutes} мин
        </span>
        <span className="ml-auto inline-flex items-center gap-1 font-medium text-brand-600 opacity-0 transition-all duration-200 group-hover:opacity-100 dark:text-brand-300">
          Читать
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
