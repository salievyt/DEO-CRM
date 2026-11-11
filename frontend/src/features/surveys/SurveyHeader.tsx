"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, EyeOff, UserRound } from "lucide-react";

import { surveysApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Badge } from "@/shared/ui/Badge";
import { cn } from "@/shared/utils/cn";
import { SURVEYS_PATH } from "@/entities/surveys/access";
import { SURVEY_STATUS_LABELS, type SurveyDetail } from "@/entities/surveys/types";
import { STATUS_BADGE } from "./utils";

export type SurveyTab = "builder" | "results" | "responses";

const TABS: { value: SurveyTab; label: string; href: (_id: string) => string }[] = [
  { value: "builder", label: "Конструктор", href: (id) => `${SURVEYS_PATH}/${id}` },
  { value: "results", label: "По вопросам", href: (id) => `${SURVEYS_PATH}/${id}/results` },
  {
    value: "responses",
    label: "Таблица ответов",
    href: (id) => `${SURVEYS_PATH}/${id}/responses`,
  },
];

export function useSurveyDetail(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SURVEY, id],
    queryFn: () => surveysApi.get(id as string).then((res) => res.data as SurveyDetail),
    enabled: Boolean(id),
  });
}

/** Back link, title, status and tabs shared by builder / results / table. */
export function SurveyHeader({
  id,
  active,
  title,
  actions,
}: {
  id: string;
  active: SurveyTab;
  /** Fallback while the survey detail is loading. */
  title?: string;
  actions?: React.ReactNode;
}) {
  const { data: survey } = useSurveyDetail(id);
  const heading = survey?.title || title || "Опрос";

  return (
    <div className="space-y-4">
      <Link
        href={SURVEYS_PATH}
        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Все опросы
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{heading}</h1>
          {survey && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-surface-500">
              <Badge variant={STATUS_BADGE[survey.status]} dot>
                {SURVEY_STATUS_LABELS[survey.status]}
              </Badge>
              <Badge variant="outline">
                {survey.is_anonymous ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <UserRound className="h-3 w-3" />
                )}
                {survey.is_anonymous ? "Анонимный" : "Именной"}
              </Badge>
              <span>Ответов: {survey.response_count}</span>
            </div>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <nav aria-label="Разделы опроса" className="-mx-1 overflow-x-auto">
        <ul className="flex min-w-max border-b border-surface-200 px-1 dark:border-surface-700">
          {TABS.map((tab) => {
            const current = tab.value === active;
            return (
              <li key={tab.value}>
                <Link
                  href={tab.href(id)}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-medium transition-colors",
                    current
                      ? "border-brand-600 text-brand-600 dark:text-brand-400"
                      : "border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200"
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
