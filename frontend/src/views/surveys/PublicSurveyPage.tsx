"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle,
  ClipboardList,
  EyeOff,
  Loader2,
  Lock,
  UserRound,
} from "lucide-react";

import { surveysApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/utils/cn";
import { publicSurveyPath } from "@/entities/surveys/access";
import type { PublicQuestion, PublicSubmitResult, PublicSurvey } from "@/entities/surveys/types";
import {
  OTHER_MAX_LENGTH,
  buildAnswers,
  emptyDraft,
  formatStampDate,
  markSubmitted,
  readSubmittedAt,
  serverAnswerErrors,
  validateQuestions,
  type AnswerDraft,
  type Drafts,
} from "@/features/surveys/publicAnswers";
import {
  errorDetail,
  errorField,
  extractError,
  formatDate,
  formatDateTime,
  httpStatusOf,
} from "@/features/surveys/utils";

const UNAVAILABLE: Record<number, { title: string; text: string }> = {
  404: {
    title: "Опрос не найден",
    text: "Ссылка неверная, опрос отключён или ссылку перевыпустили. Уточните актуальную ссылку у HR.",
  },
  403: {
    title: "Опрос ещё не начался",
    text: "Приём ответов пока не открыт. Загляните по этой ссылке позже.",
  },
  410: {
    title: "Приём ответов завершён",
    text: "Срок опроса истёк. Спасибо за интерес!",
  },
  429: {
    title: "Слишком много запросов",
    text: "Подождите несколько минут и обновите страницу.",
  },
};

export function PublicSurveyPage({ token }: { token: string }) {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: [QUERY_KEYS.SURVEY_PUBLIC, token],
    queryFn: () => surveysApi.public.get(token).then((res) => res.data as PublicSurvey),
    retry: false,
  });

  if (isLoading) {
    return (
      <PublicShell>
        <div
          className="flex items-center justify-center gap-2 py-10 text-surface-500"
          role="status"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          Загружаем опрос...
        </div>
      </PublicShell>
    );
  }

  if (error || !data) {
    const status = httpStatusOf(error);
    const known = status ? UNAVAILABLE[status] : undefined;
    const startsAt = status === 403 ? errorField(error, "starts_at") : null;
    const startsText =
      typeof startsAt === "string" && startsAt
        ? `Приём ответов откроется ${formatDateTime(startsAt)}. Загляните по этой ссылке позже.`
        : null;
    return (
      <PublicShell>
        <StateMessage
          tone="danger"
          icon={
            status === 403 ? (
              <CalendarClock className="h-8 w-8" />
            ) : (
              <ClipboardList className="h-8 w-8" />
            )
          }
          title={known?.title || "Не удалось загрузить опрос"}
          text={
            startsText || known?.text || "Проверьте подключение к интернету и попробуйте ещё раз."
          }
          action={
            status === 404 || status === 410 ? undefined : (
              <Button variant="secondary" onClick={() => refetch()} loading={isRefetching}>
                Попробовать снова
              </Button>
            )
          }
        />
      </PublicShell>
    );
  }

  return <SurveyForm token={token} survey={data} />;
}

function SurveyForm({ token, survey }: { token: string; survey: PublicSurvey }) {
  const sections = useMemo(
    () => survey.sections.filter((section) => section.questions.length > 0),
    [survey.sections]
  );
  const allQuestions = useMemo(() => sections.flatMap((s) => s.questions), [sections]);

  const [step, setStep] = useState(0);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submittedBefore, setSubmittedBefore] = useState<string | null>(null);
  const [result, setResult] = useState<PublicSubmitResult | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSubmittedBefore(readSubmittedAt(token));
  }, [token]);

  const submit = useMutation({
    mutationFn: () =>
      surveysApi.public
        .submit(token, buildAnswers(allQuestions, drafts), !survey.is_anonymous)
        .then((res) => res.data as PublicSubmitResult),
    onSuccess: (data) => {
      markSubmitted(token);
      topRef.current?.scrollIntoView?.({ block: "start" });
      setResult(data);
    },
    onError: (err) => {
      const status = httpStatusOf(err);
      if (status === 400) {
        const { byQuestion, general } = serverAnswerErrors(errorDetail(err));
        setErrors(byQuestion);
        const fallback = Object.keys(byQuestion).length
          ? "Проверьте отмеченные вопросы."
          : extractError(err);
        setGeneralError(general.length ? general.join(" ") : fallback);
        goToFirstError(byQuestion);
        return;
      }
      setGeneralError(
        (status && UNAVAILABLE[status]?.title) ||
          "Не удалось отправить ответы. Проверьте интернет и попробуйте ещё раз — ответы на странице сохранены."
      );
    },
  });

  const multiStep = sections.length > 1;
  const section = sections[step];
  const isLast = step === sections.length - 1;

  const scrollTop = () => {
    topRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const goToFirstError = (errs: Record<string, string>) => {
    const index = sections.findIndex((s) => s.questions.some((q) => errs[q.id]));
    if (index >= 0) {
      setStep(index);
    }
    const firstId = allQuestions.find((q) => errs[q.id])?.id;
    if (firstId) {
      setTimeout(
        () =>
          document
            .getElementById(`q-${firstId}`)
            ?.scrollIntoView?.({ behavior: "smooth", block: "center" }),
        0
      );
    }
  };

  const updateDraft = (id: string, patch: Partial<AnswerDraft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] || emptyDraft()), ...patch } }));
    setErrors((prev) => {
      if (!prev[id]) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleNext = () => {
    const sectionErrors = validateQuestions(section.questions, drafts);
    setErrors((prev) => ({ ...prev, ...sectionErrors }));
    if (Object.keys(sectionErrors).length) {
      setGeneralError(null);
      goToFirstError(sectionErrors);
      return;
    }
    setStep((s) => Math.min(s + 1, sections.length - 1));
    scrollTop();
  };

  const handleSubmit = () => {
    setGeneralError(null);
    const allErrors = validateQuestions(allQuestions, drafts);
    setErrors(allErrors);
    if (Object.keys(allErrors).length) {
      setGeneralError("Проверьте отмеченные вопросы.");
      goToFirstError(allErrors);
      return;
    }
    submit.mutate();
  };

  if (result) {
    const followUp = result.follow_up;
    return (
      <PublicShell>
        <StateMessage
          tone="success"
          icon={<CheckCircle className="h-8 w-8" />}
          title="Спасибо!"
          text={result.thank_you_text || "Ваши ответы сохранены."}
          action={
            followUp ? (
              <a
                href={followUp.url || publicSurveyPath(followUp.token)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                {followUp.title}
                <ArrowRight className="h-4 w-4" />
              </a>
            ) : undefined
          }
        />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div ref={topRef} className="scroll-mt-4" />
      <header className="mb-6">
        <h1 className="text-xl font-bold leading-tight text-surface-900 dark:text-white sm:text-2xl">
          {survey.title}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {survey.is_anonymous ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success-700 dark:bg-green-900/20 dark:text-green-300">
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              Опрос анонимный
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              Опрос именной
            </span>
          )}
          {survey.ends_at && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-3 py-1 text-xs font-medium text-surface-600 dark:bg-surface-700 dark:text-surface-300">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              Ответы до {formatDate(survey.ends_at)}
            </span>
          )}
        </div>
        {survey.is_anonymous && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-surface-500">
            <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            Имя, аккаунт и точное время не сохраняются — только дата отправки.
          </p>
        )}
        {survey.description && step === 0 && (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-surface-600 dark:text-surface-300">
            {survey.description}
          </p>
        )}
      </header>

      {submittedBefore && (
        <div
          role="note"
          className="mb-5 flex items-start gap-2 rounded-xl border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>
            С этого устройства ответы уже отправлялись {formatStampDate(submittedBefore)}. Повторная
            отправка добавит ещё один ответ.
          </span>
        </div>
      )}

      {sections.length === 0 ? (
        <p className="py-6 text-center text-sm text-surface-500">В опросе пока нет вопросов.</p>
      ) : (
        <>
          {multiStep && (
            <div className="mb-5">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-surface-500">
                <span>
                  Раздел {step + 1} из {sections.length}
                </span>
                <span>{Math.round(((step + 1) / sections.length) * 100)}%</span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={sections.length}
                aria-valuenow={step + 1}
                aria-label="Прогресс опроса"
              >
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{ width: `${((step + 1) / sections.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          <section aria-labelledby={`section-${section.id}`}>
            <h2
              id={`section-${section.id}`}
              className="text-lg font-semibold text-surface-900 dark:text-white"
            >
              {section.title}
            </h2>
            {section.description && (
              <p className="mt-1 whitespace-pre-line text-sm text-surface-500">
                {section.description}
              </p>
            )}
            <div className="mt-5 space-y-6">
              {section.questions.map((question) => (
                <QuestionField
                  key={question.id}
                  question={question}
                  draft={drafts[question.id] || emptyDraft()}
                  error={errors[question.id]}
                  onChange={(patch) => updateDraft(question.id, patch)}
                />
              ))}
            </div>
          </section>

          {generalError && (
            <p
              role="alert"
              className="mt-6 rounded-xl bg-danger-50 p-3 text-sm text-danger-700 dark:bg-red-900/20 dark:text-red-300"
            >
              {generalError}
            </p>
          )}

          <div className="sticky bottom-0 -mx-4 mt-6 flex gap-3 border-t border-surface-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-surface-700 dark:bg-surface-800/95 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
            {multiStep && step > 0 && (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 flex-1 sm:flex-none"
                onClick={() => {
                  setStep((s) => Math.max(0, s - 1));
                  scrollTop();
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
            )}
            {isLast ? (
              <Button
                type="button"
                className="min-h-11 flex-1 sm:ml-auto sm:flex-none"
                onClick={handleSubmit}
                loading={submit.isPending}
              >
                Отправить
              </Button>
            ) : (
              <Button
                type="button"
                className="min-h-11 flex-1 sm:ml-auto sm:flex-none"
                onClick={handleNext}
              >
                Далее
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </>
      )}
    </PublicShell>
  );
}

// --- question inputs ---------------------------------------------------------

const inputClass =
  "block w-full rounded-xl border border-surface-300 bg-white px-3 py-2.5 text-base text-surface-900 transition-colors placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50 sm:text-sm";

export function QuestionField({
  question,
  draft,
  error,
  onChange,
}: {
  question: PublicQuestion;
  draft: AnswerDraft;
  error?: string;
  onChange: (_patch: Partial<AnswerDraft>) => void;
}) {
  const id = `q-${question.id}`;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const describedBy =
    [question.help_text ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;
  const label = (
    <>
      {question.code && <span className="mr-1 text-surface-400">{question.code}</span>}
      {question.text}
      {question.required ? (
        <span className="ml-1 text-danger-500" aria-hidden="true">
          *
        </span>
      ) : (
        <span className="ml-1.5 text-xs font-normal text-surface-400">(необязательно)</span>
      )}
    </>
  );

  const isGroup =
    question.type !== "number" && question.type !== "short_text" && question.type !== "long_text";

  const body = (() => {
    switch (question.type) {
      case "scale":
        return (
          <ScaleInput
            question={question}
            draft={draft}
            onChange={onChange}
            describedBy={describedBy}
          />
        );
      case "single_choice":
      case "multiple_choice":
        return <ChoiceInput question={question} draft={draft} onChange={onChange} />;
      case "number":
        return (
          <input
            id={`${id}-input`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={draft.value}
            onChange={(e) => onChange({ value: e.target.value })}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            aria-required={question.required}
            placeholder={numberHint(question)}
            className={cn(inputClass, "max-w-xs", error && "border-danger-500")}
          />
        );
      case "short_text":
        return (
          <input
            id={`${id}-input`}
            type="text"
            value={draft.value}
            maxLength={question.max_length || 255}
            onChange={(e) => onChange({ value: e.target.value })}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            aria-required={question.required}
            className={cn(inputClass, error && "border-danger-500")}
          />
        );
      case "long_text":
        return (
          <div>
            <textarea
              id={`${id}-input`}
              rows={4}
              value={draft.value}
              maxLength={question.max_length || 5000}
              onChange={(e) => onChange({ value: e.target.value })}
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy}
              aria-required={question.required}
              className={cn(inputClass, "min-h-[7rem] resize-y", error && "border-danger-500")}
            />
            {question.max_length && (
              <p className="mt-1 text-right text-xs text-surface-400">
                {draft.value.length} / {question.max_length}
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  })();

  const footer = (
    <>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-danger-600 dark:text-danger-400">
          {error}
        </p>
      )}
    </>
  );

  const help = question.help_text ? (
    <p id={helpId} className="mb-2 text-sm text-surface-500">
      {question.help_text}
    </p>
  ) : null;

  if (isGroup) {
    return (
      <fieldset id={id} className="scroll-mt-20" aria-describedby={describedBy}>
        <legend className="mb-2 text-base font-medium leading-snug text-surface-900 dark:text-white">
          {label}
        </legend>
        {help}
        {body}
        {footer}
      </fieldset>
    );
  }

  return (
    <div id={id} className="scroll-mt-20">
      <label
        htmlFor={`${id}-input`}
        className="mb-2 block text-base font-medium leading-snug text-surface-900 dark:text-white"
      >
        {label}
      </label>
      {help}
      {body}
      {footer}
    </div>
  );
}

function numberHint(question: PublicQuestion): string {
  const { min_value: min, max_value: max } = question;
  if (min != null && max != null) {
    return `от ${min} до ${max}`;
  }
  if (min != null) {
    return `не меньше ${min}`;
  }
  if (max != null) {
    return `не больше ${max}`;
  }
  return "Число";
}

function ScaleInput({
  question,
  draft,
  onChange,
  describedBy,
}: {
  question: PublicQuestion;
  draft: AnswerDraft;
  onChange: (_patch: Partial<AnswerDraft>) => void;
  describedBy?: string;
}) {
  const values: number[] = [];
  for (let v = question.scale_min; v <= question.scale_max; v += 1) {
    values.push(v);
  }
  const labels = question.scale_labels || {};
  const minLabel = labels[String(question.scale_min)];
  const maxLabel = labels[String(question.scale_max)];
  const middle = values
    .filter((v) => v !== question.scale_min && v !== question.scale_max && labels[String(v)])
    .map((v) => ({ value: v, label: labels[String(v)] }));

  return (
    <div>
      <div role="radiogroup" aria-describedby={describedBy} className="flex flex-wrap gap-2">
        {values.map((value) => {
          const selected = draft.value === String(value);
          const hint = labels[String(value)];
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={hint ? `${value} — ${hint}` : String(value)}
              onClick={() =>
                onChange({ value: selected && !question.required ? "" : String(value) })
              }
              className={cn(
                "flex h-11 min-w-11 flex-1 items-center justify-center rounded-xl border text-base font-semibold transition-colors sm:flex-none sm:px-4",
                selected
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-surface-300 bg-white text-surface-700 hover:border-brand-400 hover:text-brand-700 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200"
              )}
            >
              {value}
            </button>
          );
        })}
      </div>
      {(minLabel || maxLabel) && (
        <div className="mt-2 flex justify-between gap-4 text-xs text-surface-500">
          <span>{minLabel ? `${question.scale_min} — ${minLabel}` : ""}</span>
          <span className="text-right">
            {maxLabel ? `${question.scale_max} — ${maxLabel}` : ""}
          </span>
        </div>
      )}
      {middle.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-xs text-surface-500">
          {middle.map((item) => (
            <li key={item.value}>
              {item.value} — {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChoiceInput({
  question,
  draft,
  onChange,
}: {
  question: PublicQuestion;
  draft: AnswerDraft;
  onChange: (_patch: Partial<AnswerDraft>) => void;
}) {
  const multiple = question.type === "multiple_choice";
  const name = `q-${question.id}-choice`;
  const otherLabel = question.other_label || "Другое";
  const exclusiveIds = question.options.filter((o) => o.is_exclusive).map((o) => o.id);
  const count = draft.values.length + (draft.other ? 1 : 0);
  const limitReached =
    multiple && Boolean(question.max_choices) && count >= (question.max_choices || 0);

  const toggleMulti = (optionId: string) => {
    const isSelected = draft.values.includes(optionId);
    if (isSelected) {
      onChange({ values: draft.values.filter((v) => v !== optionId) });
      return;
    }
    if (exclusiveIds.includes(optionId)) {
      onChange({ values: [optionId], other: false, otherText: "" });
      return;
    }
    onChange({ values: [...draft.values.filter((v) => !exclusiveIds.includes(v)), optionId] });
  };

  const optionClass = (checked: boolean, disabled: boolean) =>
    cn(
      "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
      checked
        ? "border-brand-500 bg-brand-50 text-surface-900 dark:border-brand-400 dark:bg-brand-900/20 dark:text-white"
        : "border-surface-200 bg-white text-surface-700 hover:border-brand-300 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200",
      disabled && "cursor-not-allowed opacity-50"
    );

  return (
    <div className="space-y-2">
      {multiple && question.max_choices ? (
        <p className="text-xs text-surface-500">Можно выбрать не более {question.max_choices}.</p>
      ) : null}
      {question.options.map((option) => {
        const checked = multiple
          ? draft.values.includes(option.id)
          : !draft.other && draft.value === option.id;
        const disabled = multiple && !checked && limitReached && !option.is_exclusive;
        return (
          <label key={option.id} className={optionClass(checked, disabled)}>
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={option.id}
              checked={checked}
              disabled={disabled}
              onChange={() =>
                multiple
                  ? toggleMulti(option.id)
                  : onChange({ value: option.id, other: false, otherText: "" })
              }
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand-600"
            />
            <span className="leading-snug">{option.text}</span>
          </label>
        );
      })}
      {question.has_other && (
        <div>
          <label className={optionClass(draft.other, multiple && !draft.other && limitReached)}>
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value="__other__"
              checked={draft.other}
              disabled={multiple && !draft.other && limitReached}
              onChange={() => {
                if (multiple) {
                  onChange(
                    draft.other
                      ? { other: false, otherText: "" }
                      : {
                          other: true,
                          values: draft.values.filter((v) => !exclusiveIds.includes(v)),
                        }
                  );
                } else {
                  onChange({ other: true, value: "" });
                }
              }}
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand-600"
            />
            <span className="leading-snug">{otherLabel}</span>
          </label>
          {draft.other && (
            <input
              type="text"
              autoFocus
              value={draft.otherText}
              maxLength={OTHER_MAX_LENGTH}
              onChange={(e) => onChange({ otherText: e.target.value })}
              aria-label={`${otherLabel}: свой вариант`}
              placeholder="Ваш вариант"
              className={cn(inputClass, "mt-2")}
            />
          )}
        </div>
      )}
    </div>
  );
}

// --- layout -------------------------------------------------------------------

function StateMessage({
  tone,
  icon,
  title,
  text,
  action,
}: {
  tone: "success" | "danger";
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-4 text-center">
      <div
        className={cn(
          "mx-auto flex h-16 w-16 items-center justify-center rounded-full",
          tone === "success"
            ? "bg-success-50 text-success-600 dark:bg-green-900/20"
            : "bg-danger-50 text-danger-500 dark:bg-red-900/20"
        )}
      >
        {icon}
      </div>
      <h1 className="mt-4 text-xl font-bold text-surface-900 dark:text-white">{title}</h1>
      <p className="mx-auto mt-2 max-w-md whitespace-pre-line text-sm text-surface-500">{text}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-surface-50 dark:bg-surface-950 sm:flex sm:items-start sm:justify-center sm:px-4 sm:py-10">
      <div className="w-full bg-white px-4 py-6 dark:bg-surface-800 sm:max-w-2xl sm:rounded-2xl sm:border sm:border-surface-200 sm:p-8 sm:shadow-xl sm:shadow-surface-200/20 dark:sm:border-surface-700">
        {children}
      </div>
    </main>
  );
}
