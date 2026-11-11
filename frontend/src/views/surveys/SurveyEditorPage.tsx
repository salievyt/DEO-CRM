"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { surveysApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { toast } from "@/shared/ui/Toast";
import { SURVEYS_PATH } from "@/entities/surveys/access";
import {
  QUESTION_TYPE_LABELS,
  SURVEY_STATUS_LABELS,
  type Paginated,
  type PublicLink,
  type Question,
  type QuestionInput,
  type Survey,
  type SurveyDetail,
  type SurveyInput,
  type SurveySection,
} from "@/entities/surveys/types";
import { SurveyHeader, useSurveyDetail } from "@/features/surveys/SurveyHeader";
import { QuestionEditorModal } from "@/features/surveys/QuestionEditorModal";
import {
  STATUS_BADGE,
  absolutePublicUrl,
  copyToClipboard,
  extractError,
  fieldErrors,
  fromLocalInput,
  httpStatusOf,
  toLocalInput,
} from "@/features/surveys/utils";

const textareaClass =
  "block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50";

export function SurveyEditorPage({ isNew = false }: { isNew?: boolean }) {
  const params = useParams<{ id: string }>();
  const id = isNew ? undefined : params?.id;

  if (isNew) {
    return (
      <div className="space-y-6">
        <Link
          href={SURVEYS_PATH}
          className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Все опросы
        </Link>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Новый опрос</h1>
        <SurveyPropertiesForm survey={null} />
      </div>
    );
  }

  return <ExistingSurveyEditor id={id as string} />;
}

function ExistingSurveyEditor({ id }: { id: string }) {
  const { data: survey, isLoading, error } = useSurveyDetail(id);

  return (
    <div className="space-y-6">
      <SurveyHeader id={id} active="builder" />
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" text="Загружаем опрос..." />
        </div>
      ) : error || !survey ? (
        <EmptyState
          title={httpStatusOf(error) === 404 ? "Опрос не найден" : "Не удалось загрузить опрос"}
          description={extractError(error, "Обновите страницу или вернитесь к списку.")}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-6">
            <SurveyPropertiesForm survey={survey} />
            <SectionsEditor survey={survey} />
          </div>
          <div className="space-y-6 xl:sticky xl:top-4 xl:self-start">
            <PublicLinkPanel survey={survey} />
          </div>
        </div>
      )}
    </div>
  );
}

// --- survey properties ---------------------------------------------------------

function SurveyPropertiesForm({ survey }: { survey: SurveyDetail | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SurveyInput>(() => toInput(survey));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(toInput(survey));
    // Re-sync only when another survey is opened or it was saved elsewhere.
  }, [survey?.id, survey?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: others } = useQuery({
    queryKey: [QUERY_KEYS.SURVEYS, "follow-up-options"],
    queryFn: () => surveysApi.list({ page_size: 100 }).then((res) => res.data as Paginated<Survey>),
    select: (data) => data.results.filter((s) => s.id !== survey?.id),
  });

  const save = useMutation({
    mutationFn: (payload: SurveyInput) =>
      survey ? surveysApi.update(survey.id, { ...payload }) : surveysApi.create({ ...payload }),
    onSuccess: (res) => {
      setErrors({});
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SURVEYS] });
      if (survey) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SURVEY, survey.id] });
        toast({ title: "Сохранено", type: "success" });
      } else {
        const created = res.data as Survey;
        toast({ title: "Опрос создан", message: "Добавьте разделы и вопросы.", type: "success" });
        router.replace(`${SURVEYS_PATH}/${created.id}`);
      }
    },
    onError: (err) => {
      setErrors(fieldErrors(err));
      toast({ title: "Не удалось сохранить", message: extractError(err), type: "error" });
    },
  });

  const set = <K extends keyof SurveyInput>(key: K, value: SurveyInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrors({ title: "Введите название." });
      return;
    }
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      setErrors({ ends_at: "Окончание раньше начала." });
      return;
    }
    save.mutate({ ...form, title: form.title.trim() });
  };

  const anonymityLocked = Boolean(
    survey && (survey.anonymity_locked || survey.response_count > 0),
  );

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Свойства опроса</h2>
        <Input
          id="survey-title"
          label="Название"
          value={form.title}
          maxLength={255}
          onChange={(e) => set("title", e.target.value)}
          error={errors.title}
        />
        <TextArea
          id="survey-description"
          label="Вступление"
          hint="Показывается над вопросами: зачем опрос и сколько времени займёт."
          value={form.description}
          onChange={(v) => set("description", v)}
          error={errors.description}
          rows={4}
        />
        <TextArea
          id="survey-thanks"
          label="Текст после отправки"
          value={form.thank_you_text}
          onChange={(v) => set("thank_you_text", v)}
          error={errors.thank_you_text}
          rows={2}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="survey-starts"
            label="Начало приёма (необязательно)"
            type="datetime-local"
            value={toLocalInput(form.starts_at)}
            onChange={(e) => set("starts_at", fromLocalInput(e.target.value))}
            error={errors.starts_at}
          />
          <Input
            id="survey-ends"
            label="Окончание приёма (необязательно)"
            type="datetime-local"
            value={toLocalInput(form.ends_at)}
            onChange={(e) => set("ends_at", fromLocalInput(e.target.value))}
            error={errors.ends_at}
          />
        </div>
        <Select
          id="survey-follow-up"
          label="После отправки предложить опрос"
          placeholder="— не предлагать —"
          options={(others || []).map((s) => ({ value: s.id, label: s.title }))}
          value={form.follow_up_survey || ""}
          onChange={(e) => set("follow_up_survey", e.target.value || null)}
          error={errors.follow_up_survey}
        />
        <p className="-mt-2 text-xs text-surface-500">
          Например, именная форма «Готов участвовать» после анонимного опроса. Ответы двух опросов
          не связываются. Кнопка видна, только когда второй опрос принимает ответы.
        </p>
        <label className="flex items-start gap-2 text-sm text-surface-700 dark:text-surface-200">
          <input
            type="checkbox"
            checked={form.is_anonymous}
            disabled={anonymityLocked}
            onChange={(e) => set("is_anonymous", e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-600"
          />
          <span>
            Анонимный опрос
            <span className="block text-xs text-surface-500">
              {anonymityLocked
                ? "Нельзя менять: опрос уже запускался или есть ответы."
                : "Не сохраняются имя, аккаунт, IP и точное время — только дата."}
            </span>
          </span>
        </label>
        {errors.is_anonymous && <p className="text-sm text-danger-600">{errors.is_anonymous}</p>}
        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending}>
            {survey ? "Сохранить" : "Создать опрос"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function toInput(survey: SurveyDetail | null): SurveyInput {
  return {
    title: survey?.title || "",
    description: survey?.description || "",
    thank_you_text: survey?.thank_you_text || "",
    is_anonymous: survey?.is_anonymous ?? true,
    starts_at: survey?.starts_at || null,
    ends_at: survey?.ends_at || null,
    follow_up_survey: survey?.follow_up_survey || null,
  };
}

function TextArea({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  rows = 3,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (_value: string) => void;
  error?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-surface-700 dark:text-surface-200"
      >
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={textareaClass}
      />
      {error ? (
        <p className="text-sm text-danger-600">{error}</p>
      ) : (
        hint && <p className="text-xs text-surface-500">{hint}</p>
      )}
    </div>
  );
}

// --- public link ---------------------------------------------------------------

function PublicLinkPanel({ survey }: { survey: SurveyDetail }) {
  const queryClient = useQueryClient();
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const url = absolutePublicUrl(survey.public_url, survey.public_token);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SURVEY, survey.id] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SURVEYS] });
  };

  const toggle = useMutation({
    mutationFn: () =>
      survey.is_active ? surveysApi.deactivate(survey.id) : surveysApi.activate(survey.id),
    onSuccess: () => {
      refresh();
      toast({
        title: survey.is_active ? "Приём ответов отключён" : "Приём ответов включён",
        type: "success",
      });
    },
    onError: (err) =>
      toast({ title: "Не удалось изменить статус", message: extractError(err), type: "error" }),
  });

  const regenerate = useMutation({
    mutationFn: () => surveysApi.regenerateLink(survey.id).then((res) => res.data as PublicLink),
    onSuccess: (link) => {
      setConfirmRegenerate(false);
      refresh();
      toast({
        title: "Ссылка перевыпущена",
        message: "Старая ссылка больше не работает.",
        type: "success",
      });
      copyToClipboard(
        absolutePublicUrl(link.public_url, link.public_token),
        "Новая ссылка скопирована"
      );
    },
    onError: (err) =>
      toast({
        title: "Не удалось перевыпустить ссылку",
        message: extractError(err),
        type: "error",
      }),
  });

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Публичная ссылка</h2>
        <Badge variant={STATUS_BADGE[survey.status]} dot>
          {SURVEY_STATUS_LABELS[survey.status]}
        </Badge>
      </div>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          aria-label="Публичная ссылка на опрос"
          onFocus={(e) => e.currentTarget.select()}
          className="input min-w-0 flex-1 py-2 font-mono text-xs"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => copyToClipboard(url)}
          aria-label="Копировать ссылку"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="Открыть публичную страницу"
          title="Открыть"
          className="btn-secondary px-3 py-2"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <p className="text-xs text-surface-500">
        Ссылка открывается без входа в CRM. Ответы принимаются, только когда опрос включён и
        попадает в сроки.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={survey.is_active ? "secondary" : "primary"}
          onClick={() => toggle.mutate()}
          loading={toggle.isPending}
        >
          {survey.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          {survey.is_active ? "Выключить приём" : "Включить приём"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmRegenerate(true)}>
          <RefreshCw className="h-4 w-4" />
          Перевыпустить ссылку
        </Button>
      </div>
      <ConfirmDialog
        open={confirmRegenerate}
        title="Перевыпустить ссылку?"
        description="Старая ссылка сразу перестанет работать. Новую нужно будет заново разослать команде."
        confirmLabel="Перевыпустить"
        onConfirm={() => regenerate.mutate()}
        onCancel={() => setConfirmRegenerate(false)}
        loading={regenerate.isPending}
      />
    </Card>
  );
}

// --- sections & questions --------------------------------------------------------

type QuestionEditorState = { question: Question | null; sectionId: string };

function SectionsEditor({ survey }: { survey: SurveyDetail }) {
  const queryClient = useQueryClient();
  const sections = useMemo(
    () => [...survey.sections].sort((a, b) => a.order - b.order),
    [survey.sections]
  );
  const [editingSection, setEditingSection] = useState<SurveySection | "new" | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<SurveySection | null>(null);
  const [questionEditor, setQuestionEditor] = useState<QuestionEditorState | null>(null);
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SURVEY, survey.id] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SURVEYS] });
  };

  const onError = (title: string) => (err: unknown) =>
    toast({
      title,
      message:
        httpStatusOf(err) === 409
          ? "На вопросы уже есть ответы — удалить нельзя. Можно отредактировать текст или отключить опрос."
          : extractError(err),
      type: "error",
    });

  const saveSection = useMutation({
    mutationFn: (data: { id?: string; title: string; description: string; order: number }) =>
      data.id
        ? surveysApi.sections.update(data.id, { title: data.title, description: data.description })
        : surveysApi.sections.create({
            survey: survey.id,
            title: data.title,
            description: data.description,
            order: data.order,
          }),
    onSuccess: () => {
      setEditingSection(null);
      refresh();
    },
    onError: onError("Не удалось сохранить раздел"),
  });

  const deleteSection = useMutation({
    mutationFn: (id: string) => surveysApi.sections.remove(id),
    onSuccess: () => {
      setSectionToDelete(null);
      refresh();
      toast({ title: "Раздел удалён", type: "success" });
    },
    onError: (err) => {
      setSectionToDelete(null);
      onError("Не удалось удалить раздел")(err);
    },
  });

  const reorder = useMutation({
    mutationFn: async (items: { id: string; kind: "section" | "question"; order: number }[]) => {
      await Promise.all(
        items.map((item) =>
          item.kind === "section"
            ? surveysApi.sections.update(item.id, { order: item.order })
            : surveysApi.questions.update(item.id, { order: item.order })
        )
      );
    },
    onSettled: refresh,
    onError: onError("Не удалось изменить порядок"),
  });

  const saveQuestion = useMutation({
    mutationFn: (data: { id?: string; payload: QuestionInput }) =>
      data.id
        ? surveysApi.questions.update(data.id, { ...data.payload })
        : surveysApi.questions.create({ ...data.payload }),
    onSuccess: () => {
      setQuestionEditor(null);
      setQuestionErrors({});
      refresh();
      toast({ title: "Вопрос сохранён", type: "success" });
    },
    onError: (err) => {
      setQuestionErrors(fieldErrors(err));
      toast({ title: "Не удалось сохранить вопрос", message: extractError(err), type: "error" });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: (id: string) => surveysApi.questions.remove(id),
    onSuccess: () => {
      setQuestionToDelete(null);
      refresh();
      toast({ title: "Вопрос удалён", type: "success" });
    },
    onError: (err) => {
      setQuestionToDelete(null);
      onError("Не удалось удалить вопрос")(err);
    },
  });

  /** Swap with a neighbour and renumber the list so orders stay unique. */
  const move = <T extends { id: string; order: number }>(
    list: T[],
    index: number,
    delta: number,
    kind: "section" | "question"
  ) => {
    const target = index + delta;
    if (target < 0 || target >= list.length) {
      return;
    }
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    const changes = next
      .map((item, i) => ({ id: item.id, kind, order: i }))
      .filter((item, i) => next[i].order !== item.order);
    reorder.mutate(changes);
  };

  const nextOrderFor = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    const orders = section?.questions.map((q) => q.order) || [];
    return orders.length ? Math.max(...orders) + 1 : 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
          Разделы и вопросы
        </h2>
        <Button type="button" size="sm" onClick={() => setEditingSection("new")}>
          <Plus className="h-4 w-4" />
          Раздел
        </Button>
      </div>

      {editingSection === "new" && (
        <SectionForm
          initial={null}
          saving={saveSection.isPending}
          onCancel={() => setEditingSection(null)}
          onSave={(title, description) =>
            saveSection.mutate({
              title,
              description,
              order: sections.length ? Math.max(...sections.map((s) => s.order)) + 1 : 0,
            })
          }
        />
      )}

      {sections.length === 0 && editingSection !== "new" && (
        <EmptyState
          title="Разделов пока нет"
          description="Опрос состоит из разделов: на телефоне каждый раздел — отдельный шаг."
          action={
            <Button type="button" onClick={() => setEditingSection("new")}>
              <Plus className="h-4 w-4" />
              Добавить раздел
            </Button>
          }
        />
      )}

      {sections.map((section, sectionIndex) => {
        const questions = [...section.questions].sort((a, b) => a.order - b.order);
        const editing = editingSection !== "new" && editingSection?.id === section.id;
        return (
          <Card key={section.id} padding="none">
            <div className="flex flex-col gap-2 border-b border-surface-200 px-4 py-3 dark:border-surface-700 sm:flex-row sm:items-start sm:px-6">
              {editing ? (
                <div className="flex-1">
                  <SectionForm
                    initial={section}
                    saving={saveSection.isPending}
                    onCancel={() => setEditingSection(null)}
                    onSave={(title, description) =>
                      saveSection.mutate({
                        id: section.id,
                        title,
                        description,
                        order: section.order,
                      })
                    }
                  />
                </div>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-surface-400">
                      Раздел {sectionIndex + 1}
                    </p>
                    <h3 className="font-semibold text-surface-900 dark:text-white">
                      {section.title}
                    </h3>
                    {section.description && (
                      <p className="mt-0.5 whitespace-pre-line text-sm text-surface-500">
                        {section.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <RowAction
                      label="Раздел выше"
                      disabled={sectionIndex === 0 || reorder.isPending}
                      onClick={() => move(sections, sectionIndex, -1, "section")}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </RowAction>
                    <RowAction
                      label="Раздел ниже"
                      disabled={sectionIndex === sections.length - 1 || reorder.isPending}
                      onClick={() => move(sections, sectionIndex, 1, "section")}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </RowAction>
                    <RowAction
                      label="Переименовать раздел"
                      onClick={() => setEditingSection(section)}
                    >
                      <Pencil className="h-4 w-4" />
                    </RowAction>
                    <RowAction
                      label="Удалить раздел"
                      danger
                      onClick={() => setSectionToDelete(section)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </RowAction>
                  </div>
                </>
              )}
            </div>

            {questions.length === 0 ? (
              <p className="px-4 py-4 text-sm text-surface-500 sm:px-6">В разделе нет вопросов.</p>
            ) : (
              <ol className="divide-y divide-surface-100 dark:divide-surface-700">
                {questions.map((question, index) => (
                  <li
                    key={question.id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-6"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-surface-900 dark:text-white">
                        {question.code && (
                          <span className="mr-1.5 font-semibold text-surface-400">
                            {question.code}
                          </span>
                        )}
                        {question.text}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge variant="info">{QUESTION_TYPE_LABELS[question.type]}</Badge>
                        {question.required ? (
                          <Badge>Обязательный</Badge>
                        ) : (
                          <Badge variant="outline">Необязательный</Badge>
                        )}
                        {question.options.length > 0 && (
                          <Badge variant="outline">вариантов: {question.options.length}</Badge>
                        )}
                        {question.has_other && (
                          <Badge variant="outline">+ «{question.other_label}»</Badge>
                        )}
                        {question.identifies_respondent && (
                          <Badge variant="warning">Имя респондента</Badge>
                        )}
                        {question.answer_count > 0 && (
                          <Badge variant="success">ответов: {question.answer_count}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <RowAction
                        label="Вопрос выше"
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => move(questions, index, -1, "question")}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </RowAction>
                      <RowAction
                        label="Вопрос ниже"
                        disabled={index === questions.length - 1 || reorder.isPending}
                        onClick={() => move(questions, index, 1, "question")}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </RowAction>
                      <RowAction
                        label="Редактировать вопрос"
                        onClick={() => {
                          setQuestionErrors({});
                          setQuestionEditor({ question, sectionId: section.id });
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </RowAction>
                      <RowAction
                        label="Удалить вопрос"
                        danger
                        onClick={() => setQuestionToDelete(question)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </RowAction>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <div className="border-t border-surface-100 px-4 py-3 dark:border-surface-700 sm:px-6">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setQuestionErrors({});
                  setQuestionEditor({ question: null, sectionId: section.id });
                }}
              >
                <Plus className="h-4 w-4" />
                Вопрос
              </Button>
            </div>
          </Card>
        );
      })}

      {questionEditor && (
        <QuestionEditorModal
          question={questionEditor.question}
          sectionId={questionEditor.sectionId}
          sections={sections}
          isAnonymous={survey.is_anonymous}
          nextOrderFor={nextOrderFor}
          saving={saveQuestion.isPending}
          serverErrors={questionErrors}
          onClose={() => setQuestionEditor(null)}
          onSave={(payload) => saveQuestion.mutate({ id: questionEditor.question?.id, payload })}
        />
      )}

      <ConfirmDialog
        open={Boolean(sectionToDelete)}
        title="Удалить раздел?"
        description={
          sectionToDelete
            ? `Раздел «${sectionToDelete.title}» и его вопросы (${sectionToDelete.questions.length}) будут удалены. Если на вопросы уже отвечали, удалить не получится.`
            : undefined
        }
        confirmLabel="Удалить"
        onConfirm={() => sectionToDelete && deleteSection.mutate(sectionToDelete.id)}
        onCancel={() => setSectionToDelete(null)}
        loading={deleteSection.isPending}
      />
      <ConfirmDialog
        open={Boolean(questionToDelete)}
        title="Удалить вопрос?"
        description={questionToDelete ? `«${questionToDelete.text}»` : undefined}
        confirmLabel="Удалить"
        onConfirm={() => questionToDelete && deleteQuestion.mutate(questionToDelete.id)}
        onCancel={() => setQuestionToDelete(null)}
        loading={deleteQuestion.isPending}
      />
    </div>
  );
}

function SectionForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: SurveySection | null;
  saving: boolean;
  onSave: (_title: string, _description: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [error, setError] = useState<string | undefined>();

  return (
    <form
      className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-800 dark:bg-brand-900/10"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) {
          setError("Введите название раздела.");
          return;
        }
        onSave(title.trim(), description.trim());
      }}
    >
      <Input
        id={`section-title-${initial?.id || "new"}`}
        label="Название раздела"
        value={title}
        maxLength={255}
        autoFocus
        onChange={(e) => {
          setTitle(e.target.value);
          setError(undefined);
        }}
        error={error}
      />
      <TextArea
        id={`section-description-${initial?.id || "new"}`}
        label="Пояснение (необязательно)"
        value={description}
        onChange={setDescription}
        rows={2}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" size="sm" loading={saving}>
          Сохранить
        </Button>
      </div>
    </form>
  );
}

function RowAction({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={
        danger
          ? "rounded-lg p-2 text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:opacity-30 dark:hover:bg-red-900/20"
          : "rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 disabled:opacity-30 dark:hover:bg-surface-700 dark:hover:text-surface-200"
      }
    >
      {children}
    </button>
  );
}
