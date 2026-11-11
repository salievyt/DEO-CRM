"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";

import { surveysApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { cn } from "@/shared/utils/cn";
import {
  QUESTION_TYPE_LABELS,
  type ChoiceResult,
  type NumberResult,
  type NumericStats,
  type QuestionResult,
  type ScaleResult,
  type SurveyResults,
  type TextResult,
} from "@/entities/surveys/types";
import { SurveyHeader } from "@/features/surveys/SurveyHeader";
import { extractError, formatNumber } from "@/features/surveys/utils";

export function SurveyResultsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEYS.SURVEY_RESULTS, id],
    queryFn: () => surveysApi.results(id).then((res) => res.data as SurveyResults),
    enabled: Boolean(id),
  });

  return (
    <div className="space-y-6">
      <SurveyHeader id={id} active="results" title={data?.survey.title} />
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" text="Считаем результаты..." />
        </div>
      ) : error || !data ? (
        <EmptyState title="Не удалось загрузить результаты" description={extractError(error)} />
      ) : (
        <SurveyResultsView results={data} />
      )}
    </div>
  );
}

/** Pure view over `GET /surveys/{id}/results/` (exported for tests). */
export function SurveyResultsView({ results }: { results: SurveyResults }) {
  const sections = useMemo(() => {
    const seen = new Map<string, { id: string; title: string; count: number }>();
    for (const q of results.questions) {
      const entry = seen.get(q.section.id);
      if (entry) {
        entry.count += 1;
      } else {
        seen.set(q.section.id, { id: q.section.id, title: q.section.title, count: 1 });
      }
    }
    return Array.from(seen.values());
  }, [results.questions]);

  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const visible =
    sectionFilter === "all"
      ? results.questions
      : results.questions.filter((q) => q.section.id === sectionFilter);

  if (results.total_responses === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-10 w-10" />}
        title="Ответов пока нет"
        description="Когда сотрудники заполнят опрос, здесь появятся распределения и ответы по каждому вопросу."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-surface-500">
          Всего ответов:{" "}
          <span className="font-semibold text-surface-900 dark:text-white">
            {results.total_responses}
          </span>
        </p>
        {sections.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр по разделам">
            <Chip active={sectionFilter === "all"} onClick={() => setSectionFilter("all")}>
              Все разделы
            </Chip>
            {sections.map((s) => (
              <Chip
                key={s.id}
                active={sectionFilter === s.id}
                onClick={() => setSectionFilter(s.id)}
              >
                {s.title} <span className="opacity-60">· {s.count}</span>
              </Chip>
            ))}
          </div>
        )}
      </div>

      {visible.map((question, index) => {
        const showSection = index === 0 || visible[index - 1].section.id !== question.section.id;
        return (
          <div key={question.id} className="space-y-3">
            {showSection && (
              <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-surface-500">
                {question.section.title}
              </h2>
            )}
            <QuestionResultCard question={question} total={results.total_responses} />
          </div>
        );
      })}
    </div>
  );
}

function QuestionResultCard({ question, total }: { question: QuestionResult; total: number }) {
  return (
    <Card>
      <header className="mb-4">
        <h3 className="font-medium text-surface-900 dark:text-white">
          {question.code && (
            <span className="mr-1.5 font-semibold text-surface-400">{question.code}</span>
          )}
          {question.text}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-surface-500">
          <Badge variant="info">{QUESTION_TYPE_LABELS[question.type]}</Badge>
          <span>
            Ответили: {question.answered_count} из {total}
          </span>
          {question.skipped_count > 0 && <span>· пропустили: {question.skipped_count}</span>}
        </div>
      </header>
      {renderBody(question)}
    </Card>
  );
}

function renderBody(question: QuestionResult) {
  switch (question.type) {
    case "single_choice":
    case "multiple_choice":
      return <ChoiceBody question={question} />;
    case "scale":
      return <ScaleBody question={question} />;
    case "number":
      return <NumberBody question={question} />;
    case "short_text":
    case "long_text":
      return <TextBody question={question} />;
    default:
      return null;
  }
}

function Bar({
  label,
  count,
  percent,
}: {
  label: React.ReactNode;
  count: number;
  percent: number;
}) {
  return (
    <li>
      <div className="mb-1 flex items-start justify-between gap-3 text-sm">
        <span className="min-w-0 text-surface-700 dark:text-surface-200">{label}</span>
        <span className="flex-shrink-0 tabular-nums text-surface-500">
          <span className="font-semibold text-surface-900 dark:text-white">{count}</span> ·{" "}
          {formatNumber(percent)}%
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-brand-600"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </li>
  );
}

function ChoiceBody({ question }: { question: ChoiceResult }) {
  return (
    <div className="space-y-4">
      {question.type === "multiple_choice" && (
        <p className="text-xs text-surface-500">
          Можно было выбрать несколько — сумма процентов больше 100.
        </p>
      )}
      <ul className="space-y-3">
        {question.options.map((option) => (
          <Bar key={option.id} label={option.text} count={option.count} percent={option.percent} />
        ))}
        {question.other && (
          <Bar
            label={<em className="not-italic">{question.other.label}</em>}
            count={question.other.count}
            percent={question.other.percent}
          />
        )}
      </ul>
      {question.other && question.other.answers.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
            «{question.other.label}» — ответы ({question.other.answers.length})
          </p>
          <AnswerList items={question.other.answers.map((text, i) => ({ key: String(i), text }))} />
        </div>
      )}
    </div>
  );
}

function StatsRow({ stats }: { stats: NumericStats }) {
  const items: { label: string; value: number | null }[] = [
    { label: "Среднее", value: stats.average },
    { label: "Медиана", value: stats.median },
    { label: "Мин.", value: stats.min },
    { label: "Макс.", value: stats.max },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-700/40">
          <dt className="text-xs text-surface-500">{item.label}</dt>
          <dd className="text-lg font-semibold tabular-nums text-surface-900 dark:text-white">
            {formatNumber(item.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ScaleBody({ question }: { question: ScaleResult }) {
  const answered = question.distribution.reduce((sum, d) => sum + d.count, 0);
  const max = Math.max(1, ...question.distribution.map((d) => d.count));
  const labels = question.scale.labels || {};
  return (
    <div className="space-y-4">
      <StatsRow stats={question.stats} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[18rem] text-sm">
          <caption className="sr-only">Распределение по значениям шкалы</caption>
          <tbody>
            {question.distribution.map((d) => {
              const percent = answered ? (d.count * 100) / answered : 0;
              return (
                <tr key={d.value}>
                  <th
                    scope="row"
                    className="w-10 py-1 pr-2 text-left font-semibold tabular-nums text-surface-600"
                  >
                    {d.value}
                  </th>
                  <td className="py-1">
                    <div className="h-5 overflow-hidden rounded bg-surface-100 dark:bg-surface-700">
                      <div
                        className="h-full rounded bg-brand-500"
                        style={{ width: `${(d.count / max) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="w-24 py-1 pl-3 text-right tabular-nums text-surface-500">
                    <span className="font-semibold text-surface-900 dark:text-white">
                      {d.count}
                    </span>{" "}
                    · {formatNumber(Math.round(percent * 10) / 10)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {Object.keys(labels).length > 0 && (
        <p className="text-xs text-surface-500">
          {Object.entries(labels)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([value, label]) => `${value} — ${label}`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

function NumberBody({ question }: { question: NumberResult }) {
  const sorted = [...question.values].sort((a, b) => a - b);
  return (
    <div className="space-y-4">
      <StatsRow stats={question.stats} />
      {question.stats.sum != null && (
        <p className="text-xs text-surface-500">Сумма: {formatNumber(question.stats.sum)}</p>
      )}
      {sorted.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
            Все значения (по возрастанию)
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {sorted.map((value, i) => (
              <li
                key={i}
                className="rounded-md bg-surface-100 px-2 py-0.5 text-sm tabular-nums text-surface-700 dark:bg-surface-700 dark:text-surface-200"
              >
                {formatNumber(value)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TextBody({ question }: { question: TextResult }) {
  if (question.answers.length === 0) {
    return <p className="text-sm text-surface-500">Текстовых ответов нет.</p>;
  }
  return (
    <AnswerList
      items={question.answers.map((a) => ({
        key: a.response_id,
        text: a.text,
        author: a.respondent_name,
      }))}
    />
  );
}

function AnswerList({ items }: { items: { key: string; text: string; author?: string | null }[] }) {
  return (
    <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
      {items.map((item) => (
        <li
          key={item.key}
          className="whitespace-pre-line rounded-lg border border-surface-200 bg-surface-50/60 px-3 py-2 text-sm text-surface-700 dark:border-surface-700 dark:bg-surface-700/30 dark:text-surface-200"
        >
          {item.text}
          {item.author && (
            <span className="mt-1 block text-xs text-surface-400">— {item.author}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-surface-200 bg-white text-surface-600 hover:border-brand-300 hover:text-brand-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
      )}
    >
      {children}
    </button>
  );
}
