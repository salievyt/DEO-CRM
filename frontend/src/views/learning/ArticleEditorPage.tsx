"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Plus,
  Save,
  Trash2,
  Wand2,
} from "lucide-react";

import { learningApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { CATEGORY_META } from "@/views/learning/learningMeta";
import type {
  ArticleBlockDraft,
  ArticleSectionDraft,
  LearningArticleDetail,
} from "@/entities/learning/types";

const BLOCK_TYPES = [
  { value: "paragraph", label: "Абзац" },
  { value: "list", label: "Список" },
  { value: "steps", label: "Шаги" },
  { value: "callout", label: "Выноска" },
];

const CALLOUT_TONES = [
  { value: "info", label: "Инфо" },
  { value: "tip", label: "Совет" },
  { value: "success", label: "Успех" },
  { value: "warning", label: "Предупреждение" },
];

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] || ch)
    .join("")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function emptySection(): ArticleSectionDraft {
  return { heading: "", blocks: [{ type: "paragraph", text: "" }] };
}

export function ArticleEditorPage({ isNew = false }: { isNew?: boolean }) {
  const params = useParams<{ id: string }>();
  const id = isNew ? undefined : params?.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: article, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.LEARNING_ADMIN_ARTICLE, id],
    queryFn: () => learningApi.admin.get(id as string),
    select: (res): LearningArticleDetail => res.data,
    enabled: Boolean(id),
  });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("basics");
  const [readingTime, setReadingTime] = useState(5);
  const [order, setOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [sections, setSections] = useState<ArticleSectionDraft[]>(() => [emptySection()]);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialize the form once the article loads (edit mode).
  useEffect(() => {
    if (!article) return;
    setTitle(article.title);
    setSlug(article.slug);
    setSummary(article.summary);
    setCategory(article.category);
    setReadingTime(article.reading_time_minutes);
    setOrder(article.order);
    setIsPublished(Boolean(article.is_published));
    setSections(
      article.sections.map((section) => ({
        heading: section.heading,
        blocks: section.blocks.map((block) => ({
          type: block.type,
          text: block.text,
          tone: block.tone,
          lines: block.items ? block.items.join("\n") : undefined,
        })),
      }))
    );
  }, [article]);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      id ? learningApi.admin.update(id, payload) : learningApi.admin.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEARNING_ADMIN_ARTICLES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEARNING_ARTICLES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEARNING_ARTICLE] });
      router.push("/admin/learning");
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response
        ?.data;
      const detail = data?.detail;
      let message: string | null = null;
      if (typeof detail === "string" && detail) {
        message = detail;
      } else if (detail && typeof detail === "object") {
        const first = Object.values(detail as Record<string, unknown>)[0];
        if (typeof first === "string") message = first;
        else if (Array.isArray(first)) message = String(first[0] ?? "");
      } else if (data) {
        const first = Object.values(data)[0];
        if (typeof first === "string") message = first;
        else if (Array.isArray(first)) message = String(first[0] ?? "");
      }
      setFormError(
        message || "Не удалось сохранить статью. Проверьте заполнение полей."
      );
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      setFormError("Укажите название статьи");
      return;
    }
    if (!summary.trim()) {
      setFormError("Укажите краткое описание");
      return;
    }
    setFormError(null);
    mutation.mutate({
      title,
      slug,
      summary,
      category,
      reading_time_minutes: Number(readingTime) || 0,
      order: Number(order) || 0,
      is_published: isPublished,
      sections: sections.map((section) => ({
        heading: section.heading,
        blocks: section.blocks
          .map((block) => serializeBlock(block))
          .filter((block) => block !== null),
      })),
    });
  };

  const updateSection = (index: number, patch: Partial<ArticleSectionDraft>) => {
    setSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
    setFormError(null);
  };

  const updateBlock = (
    sectionIndex: number,
    blockIndex: number,
    patch: Partial<ArticleBlockDraft>
  ) => {
    setSections((prev) => {
      const next = [...prev];
      const blocks = [...next[sectionIndex].blocks];
      blocks[blockIndex] = { ...blocks[blockIndex], ...patch };
      next[sectionIndex] = { ...next[sectionIndex], blocks };
      return next;
    });
    setFormError(null);
  };

  const move = <T,>(arr: T[], index: number, delta: number): T[] => {
    const next = [...arr];
    const target = index + delta;
    if (target < 0 || target >= next.length) return next;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  };

  const previewSlug = slug || toSlug(title);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" text="Загружаем статью..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/learning"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-surface-500 transition-colors hover:text-brand-600 dark:text-surface-400 dark:hover:text-brand-300"
        >
          <ArrowLeft className="h-4 w-4" />
          К списку статей
        </Link>
        <div className="flex items-center gap-2">
          {previewSlug && (
            <Link
              href={`/learning/${previewSlug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-2 text-sm font-medium text-surface-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-surface-700 dark:text-surface-300 dark:hover:border-brand-500/50 dark:hover:text-brand-300"
            >
              <ExternalLink className="h-4 w-4" />
              Просмотр
            </Link>
          )}
          <Button onClick={handleSave} loading={mutation.isPending}>
            <Save className="h-4 w-4" />
            {id ? "Сохранить изменения" : "Создать статью"}
          </Button>
        </div>
      </div>

      {formError && (
        <p className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {formError}
        </p>
      )}

      {/* Main fields */}
      <Card className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Input
            label="Название статьи"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Как работать с Канбан-доской"
            required
          />
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                Слаг (URL)
              </label>
              <button
                type="button"
                onClick={() => setSlug(toSlug(title))}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-300"
              >
                <Wand2 className="h-3 w-3" />
                Сгенерировать из названия
              </button>
            </div>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="kanban-board (пусто = автоматически)"
              className="input"
            />
            <p className="mt-1 text-xs text-surface-400">
              Оставьте пустым — слаг создастся автоматически из названия.
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-200">
            Краткое описание
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            placeholder="Одно-два предложения, которые видны в карточке статьи"
            className="input"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Категория"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={Object.entries(CATEGORY_META).map(([value, meta]) => ({
              value,
              label: meta.label,
            }))}
          />
          <Input
            label="Время чтения (мин)"
            type="number"
            min={1}
            value={readingTime}
            onChange={(e) => setReadingTime(Number(e.target.value))}
          />
          <Input
            label="Порядок"
            type="number"
            min={0}
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
          />
          <div className="flex items-end pb-1">
            <label className="flex cursor-pointer items-center gap-2.5">
              <button
                type="button"
                role="switch"
                aria-checked={isPublished}
                onClick={() => setIsPublished(!isPublished)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  isPublished
                    ? "bg-brand-600"
                    : "bg-surface-200 dark:bg-surface-600"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                    isPublished ? "left-[22px]" : "left-0.5"
                  )}
                />
              </button>
              <span className="text-sm font-medium text-surface-700 dark:text-surface-200">
                {isPublished ? "Опубликована" : "Черновик"}
              </span>
            </label>
          </div>
        </div>
      </Card>

      {/* Sections editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">
              Разделы статьи
            </h2>
            <p className="text-sm text-surface-500">
              {sections.length} разд. ·{" "}
              {sections.reduce((sum, s) => sum + s.blocks.length, 0)} блоков
            </p>
          </div>
        </div>

        {sections.map((section, sectionIndex) => (
          <Card key={sectionIndex} className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="flex flex-1 gap-2">
                <span className="mt-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
                  {sectionIndex + 1}
                </span>
                <input
                  type="text"
                  value={section.heading}
                  onChange={(e) => updateSection(sectionIndex, { heading: e.target.value })}
                  placeholder="Заголовок раздела"
                  className="input font-medium"
                />
              </div>
              <div className="flex items-center gap-1">
                <IconAction
                  title="Выше"
                  onClick={() => setSections((prev) => move(prev, sectionIndex, -1))}
                  icon={<ArrowUp className="h-4 w-4" />}
                />
                <IconAction
                  title="Ниже"
                  onClick={() => setSections((prev) => move(prev, sectionIndex, 1))}
                  icon={<ArrowDown className="h-4 w-4" />}
                />
                <IconAction
                  title="Удалить раздел"
                  danger
                  onClick={() =>
                    setSections((prev) => prev.filter((_, i) => i !== sectionIndex))
                  }
                  icon={<Trash2 className="h-4 w-4" />}
                />
              </div>
            </div>

            <div className="space-y-2 pl-9">
              {section.blocks.map((block, blockIndex) => (
                <div
                  key={blockIndex}
                  className="rounded-xl border border-surface-200 p-3 dark:border-surface-700"
                >
                  <div className="flex items-center gap-2">
                    <select
                      value={block.type}
                      onChange={(e) =>
                        updateBlock(sectionIndex, blockIndex, {
                          type: e.target.value as ArticleBlockDraft["type"],
                        })
                      }
                      className="input w-auto py-1.5 text-xs"
                    >
                      {BLOCK_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>

                    {block.type === "callout" && (
                      <select
                        value={block.tone || "info"}
                        onChange={(e) =>
                          updateBlock(sectionIndex, blockIndex, {
                            tone: e.target.value as ArticleBlockDraft["tone"],
                          })
                        }
                        className="input w-auto py-1.5 text-xs"
                      >
                        {CALLOUT_TONES.map((tone) => (
                          <option key={tone.value} value={tone.value}>
                            {tone.label}
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="ml-auto flex items-center gap-1">
                      <IconAction
                        title="Выше"
                        onClick={() =>
                          setSections((prev) => {
                            const next = [...prev];
                            next[sectionIndex] = {
                              ...next[sectionIndex],
                              blocks: move(next[sectionIndex].blocks, blockIndex, -1),
                            };
                            return next;
                          })
                        }
                        icon={<ArrowUp className="h-3.5 w-3.5" />}
                      />
                      <IconAction
                        title="Ниже"
                        onClick={() =>
                          setSections((prev) => {
                            const next = [...prev];
                            next[sectionIndex] = {
                              ...next[sectionIndex],
                              blocks: move(next[sectionIndex].blocks, blockIndex, 1),
                            };
                            return next;
                          })
                        }
                        icon={<ArrowDown className="h-3.5 w-3.5" />}
                      />
                      <IconAction
                        title="Удалить блок"
                        danger
                        onClick={() =>
                          setSections((prev) => {
                            const next = [...prev];
                            next[sectionIndex] = {
                              ...next[sectionIndex],
                              blocks: next[sectionIndex].blocks.filter(
                                (_, i) => i !== blockIndex
                              ),
                            };
                            return next;
                          })
                        }
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                      />
                    </div>
                  </div>

                  {block.type === "paragraph" && (
                    <textarea
                      value={block.text || ""}
                      onChange={(e) =>
                        updateBlock(sectionIndex, blockIndex, { text: e.target.value })
                      }
                      rows={2}
                      placeholder="Текст абзаца"
                      className="input mt-2 text-sm"
                    />
                  )}

                  {block.type === "callout" && (
                    <textarea
                      value={block.text || ""}
                      onChange={(e) =>
                        updateBlock(sectionIndex, blockIndex, { text: e.target.value })
                      }
                      rows={2}
                      placeholder="Текст выноски"
                      className="input mt-2 text-sm"
                    />
                  )}

                  {(block.type === "list" || block.type === "steps") && (
                    <textarea
                      value={block.lines || ""}
                      onChange={(e) =>
                        updateBlock(sectionIndex, blockIndex, { lines: e.target.value })
                      }
                      rows={4}
                      placeholder={"Каждый пункт с новой строки"}
                      className="input mt-2 font-mono text-xs"
                    />
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setSections((prev) => {
                    const next = [...prev];
                    next[sectionIndex] = {
                      ...next[sectionIndex],
                      blocks: [...next[sectionIndex].blocks, { type: "paragraph", text: "" }],
                    };
                    return next;
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-surface-300 px-3 py-1.5 text-xs font-medium text-surface-500 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-surface-600 dark:hover:border-brand-500/50 dark:hover:text-brand-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Добавить блок
              </button>
            </div>
          </Card>
        ))}

        <Button variant="secondary" onClick={() => setSections((prev) => [...prev, emptySection()])}>
          <Plus className="h-4 w-4" />
          Добавить раздел
        </Button>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-end gap-2 border-t border-surface-200 pt-5 dark:border-surface-700">
        <Link href="/admin/learning">
          <Button variant="secondary" type="button">
            Отмена
          </Button>
        </Link>
        <Button onClick={handleSave} loading={mutation.isPending}>
          <Save className="h-4 w-4" />
          {id ? "Сохранить изменения" : "Создать статью"}
        </Button>
      </div>
    </div>
  );
}

function IconAction({
  title,
  onClick,
  icon,
  danger = false,
}: {
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-lg p-1.5 text-surface-400 transition-colors",
        danger
          ? "hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          : "hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-200"
      )}
    >
      {icon}
    </button>
  );
}

/** Convert a draft block into the backend's JSON shape (null = skip empty). */
function serializeBlock(block: ArticleBlockDraft): Record<string, unknown> | null {
  if (block.type === "list" || block.type === "steps") {
    const items = (block.lines || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (items.length === 0) return null;
    return { type: block.type, items };
  }
  const text = (block.text || "").trim();
  if (!text) return null;
  if (block.type === "callout") {
    return { type: block.type, text, tone: block.tone || "info" };
  }
  return { type: block.type, text };
}
