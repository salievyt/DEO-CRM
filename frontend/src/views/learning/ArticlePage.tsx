"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Info,
  Layers,
  Lightbulb,
  ListChecks,
  type LucideIcon,
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
  ArticleBlock,
  ArticleSection,
  LearningArticle,
  LearningArticleDetail,
} from "@/entities/learning/types";

export function ArticlePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";

  const [progress, setProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: article, isLoading, isError } = useQuery({
    queryKey: [QUERY_KEYS.LEARNING_ARTICLE, slug],
    queryFn: () => learningApi.get(slug),
    select: (res): LearningArticleDetail => res.data,
    enabled: Boolean(slug),
  });

  const { data: listData } = useQuery({
    queryKey: [QUERY_KEYS.LEARNING_ARTICLES],
    queryFn: () => learningApi.list(),
    select: (res): LearningArticle[] => res.data?.results || [],
  });

  // Record the read on the backend once the article loads, then refresh the
  // hub's progress (learning-articles query) so the badge updates on return.
  useEffect(() => {
    if (!article?.slug) return;
    let cancelled = false;
    learningApi.read
      .mark(article.slug)
      .then(() => {
        if (!cancelled) {
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.LEARNING_ARTICLES],
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [article?.slug, queryClient]);

  // One-time migration of progress saved under the old localStorage key.
  useEffect(() => {
    migrateLegacyReads();
  }, []);

  // Reading progress on scroll.
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the TOC entry of the section currently in view.
  useEffect(() => {
    if (!article) return;
    const headings = Array.from(
      contentRef.current?.querySelectorAll<HTMLElement>("[data-section-heading]") || []
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveHeading(
            (visible[0].target as HTMLElement).dataset.sectionHeading || ""
          );
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [article]);

  const neighbors = useMemo(() => {
    if (!article || !listData?.length) return { prev: null, next: null };
    const sorted = [...listData].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((a) => a.slug === article.slug);
    return {
      prev: index > 0 ? sorted[index - 1] : null,
      next: index >= 0 && index < sorted.length - 1 ? sorted[index + 1] : null,
    };
  }, [article, listData]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" text="Загружаем статью..." />
      </div>
    );
  }

  if (isError || !article) {
    return (
      <EmptyState
        title="Статья не найдена"
        description="Возможно, она была перемещена или ещё не опубликована."
        icon={<Layers className="h-10 w-10" />}
        action={
          <Link
            href="/learning"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Все статьи
          </Link>
        }
      />
    );
  }

  const meta = CATEGORY_META[article.category] || CATEGORY_META.basics;
  const Icon = meta.icon;

  return (
    <div className="space-y-6">
      {/* Reading progress bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <Link
        href="/learning"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-surface-500 transition-colors hover:text-brand-600 dark:text-surface-400 dark:hover:text-brand-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Все статьи
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        {/* Article body */}
        <article className="min-w-0 rounded-3xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-800 sm:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", meta.badge)}>
              <Icon className="h-3.5 w-3.5" />
              {article.category_display}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-3 py-1 text-xs font-medium text-surface-600 dark:bg-surface-700 dark:text-surface-300">
              <Clock className="h-3.5 w-3.5" />
              {article.reading_time_minutes} мин чтения
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-3 py-1 text-xs font-medium text-surface-600 dark:bg-surface-700 dark:text-surface-300">
              <Layers className="h-3.5 w-3.5" />
              {article.section_count} раздела
            </span>
          </div>

          <h1 className="mt-5 text-2xl font-bold leading-tight tracking-tight text-surface-900 dark:text-white sm:text-3xl">
            {article.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-surface-500">
            {article.summary}
          </p>

          <div ref={contentRef} className="mt-8 space-y-10">
            {article.sections.map((section, index) => (
              <Section
                key={`${article.slug}-${index}`}
                section={section}
                index={index}
              />
            ))}
          </div>
        </article>

        {/* Table of contents */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-800">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-surface-400">
                <ListChecks className="h-4 w-4" />
                Содержание
              </p>
              <nav className="mt-3 space-y-1">
                {article.sections.map((section, index) => (
                  <a
                    key={`toc-${index}`}
                    href={`#section-${index}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document
                        .getElementById(`section-${index}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={cn(
                      "block rounded-lg px-3 py-1.5 text-sm leading-snug transition-colors",
                      activeHeading === section.heading
                        ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                        : "text-surface-600 hover:bg-surface-50 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200"
                    )}
                  >
                    {index + 1}. {section.heading}
                  </a>
                ))}
              </nav>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-800 p-5 text-white">
              <p className="text-sm font-semibold">Нужна помощь?</p>
              <p className="mt-1 text-xs text-brand-100">
                Не нашли ответ — напишите в поддержку или спросите коллег в команде.
              </p>
              <Link
                href="/settings"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur transition hover:bg-white/25"
              >
                Открыть настройки
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Prev / next navigation */}
      <nav className="grid gap-4 sm:grid-cols-2">
        {neighbors.prev ? (
          <Link
            href={`/learning/${neighbors.prev.slug}`}
            className="group rounded-2xl border border-surface-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md dark:border-surface-700 dark:bg-surface-800 dark:hover:border-brand-500/40"
          >
            <span className="inline-flex items-center gap-1 text-xs font-medium text-surface-400">
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              Предыдущая статья
            </span>
            <p className="mt-2 line-clamp-1 text-sm font-semibold text-surface-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
              {neighbors.prev.title}
            </p>
          </Link>
        ) : (
          <span />
        )}
        {neighbors.next && (
          <Link
            href={`/learning/${neighbors.next.slug}`}
            className="group rounded-2xl border border-surface-200 bg-white p-5 text-right transition-all hover:border-brand-300 hover:shadow-md dark:border-surface-700 dark:bg-surface-800 dark:hover:border-brand-500/40"
          >
            <span className="inline-flex items-center gap-1 text-xs font-medium text-surface-400">
              Следующая статья
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
            <p className="mt-2 line-clamp-1 text-sm font-semibold text-surface-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
              {neighbors.next.title}
            </p>
          </Link>
        )}
      </nav>
    </div>
  );
}

function Section({
  section,
  index,
}: {
  section: ArticleSection;
  index: number;
}) {
  return (
    <section id={`section-${index}`} className="scroll-mt-24">
      <div data-section-heading={section.heading} className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
          {index + 1}
        </span>
        <h2 className="text-xl font-bold tracking-tight text-surface-900 dark:text-white">
          {section.heading}
        </h2>
      </div>
      <div className="mt-4 space-y-4 pl-10">
        {section.blocks.map((block, blockIndex) => (
          <Block key={`${index}-${blockIndex}`} block={block} />
        ))}
      </div>
    </section>
  );
}

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-[15px] leading-relaxed text-surface-600 dark:text-surface-300">
          {block.text}
        </p>
      );
    case "list":
      return (
        <ul className="space-y-2">
          {block.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-surface-600 dark:text-surface-300">
              <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-brand-500 dark:text-brand-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="space-y-3">
          {block.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed text-surface-600 dark:text-surface-300">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-surface-100 text-xs font-bold text-surface-600 dark:bg-surface-700 dark:text-surface-200">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );
    case "callout":
      return <Callout block={block} />;
    default:
      return null;
  }
}

const CALLOUT_STYLES: Record<
  NonNullable<ArticleBlock["tone"]>,
  { wrapper: string; icon: LucideIcon; iconColor: string }
> = {
  info: {
    wrapper: "border-brand-200 bg-brand-50/70 dark:border-brand-800 dark:bg-brand-900/15",
    icon: Info,
    iconColor: "text-brand-600 dark:text-brand-400",
  },
  tip: {
    wrapper: "border-violet-200 bg-violet-50/70 dark:border-violet-800 dark:bg-violet-900/15",
    icon: Lightbulb,
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  success: {
    wrapper: "border-success-200 bg-success-50/70 dark:border-green-800 dark:bg-green-900/15",
    icon: CheckCircle2,
    iconColor: "text-success-600 dark:text-green-400",
  },
  warning: {
    wrapper: "border-warning-200 bg-warning-50/70 dark:border-yellow-800 dark:bg-yellow-900/15",
    icon: AlertTriangle,
    iconColor: "text-warning-600 dark:text-yellow-400",
  },
};

function Callout({ block }: { block: ArticleBlock }) {
  const tone = block.tone || "info";
  const style = CALLOUT_STYLES[tone];
  const Icon = style.icon;
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-4", style.wrapper)}>
      <Icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0", style.iconColor)} />
      <p className="text-sm leading-relaxed text-surface-700 dark:text-surface-200">
        {block.text}
      </p>
    </div>
  );
}
