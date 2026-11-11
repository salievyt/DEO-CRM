"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import {
  CHOICE_TYPES,
  QUESTION_TYPE_LABELS,
  TEXT_TYPES,
  type Question,
  type QuestionInput,
  type QuestionOption,
  type QuestionType,
  type SurveySection,
} from "@/entities/surveys/types";

const TYPE_OPTIONS = (Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((value) => ({
  value,
  label: QUESTION_TYPE_LABELS[value],
}));

const SCALE_LIMIT = 10;

const textareaClass =
  "block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50";

interface Draft {
  section: string;
  code: string;
  text: string;
  help_text: string;
  type: QuestionType;
  required: boolean;
  scale_min: string;
  scale_max: string;
  scale_labels: Record<string, string>;
  max_choices: string;
  has_other: boolean;
  other_label: string;
  min_value: string;
  max_value: string;
  max_length: string;
  identifies_respondent: boolean;
  options: QuestionOption[];
}

function toDraft(question: Question | null, sectionId: string): Draft {
  return {
    section: question?.section || sectionId,
    code: question?.code || "",
    text: question?.text || "",
    help_text: question?.help_text || "",
    type: question?.type || "single_choice",
    required: question?.required ?? true,
    scale_min: String(question?.scale_min ?? 1),
    scale_max: String(question?.scale_max ?? 5),
    scale_labels: { ...(question?.scale_labels || {}) },
    max_choices: question?.max_choices != null ? String(question.max_choices) : "",
    has_other: question?.has_other ?? false,
    other_label: question?.other_label || "Другое",
    min_value: question?.min_value != null ? String(question.min_value) : "",
    max_value: question?.max_value != null ? String(question.max_value) : "",
    max_length: question?.max_length != null ? String(question.max_length) : "",
    identifies_respondent: question?.identifies_respondent ?? false,
    options: (question?.options || []).map((o) => ({ ...o })),
  };
}

const toNumberOrNull = (value: string): number | null => {
  const text = value.trim().replace(",", ".");
  if (!text) {
    return null;
  }
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
};

/** Build the API payload; fields of other types are reset so validation passes. */
function buildQuestionPayload(draft: Draft, order: number): QuestionInput {
  const isChoice = CHOICE_TYPES.includes(draft.type);
  const isScale = draft.type === "scale";
  const scaleMin = Number(draft.scale_min) || 0;
  const scaleMax = Number(draft.scale_max) || 0;
  const labels: Record<string, string> = {};
  if (isScale) {
    for (const [key, label] of Object.entries(draft.scale_labels)) {
      const k = Number(key);
      if (label.trim() && k >= scaleMin && k <= scaleMax) {
        labels[key] = label.trim();
      }
    }
  }
  return {
    section: draft.section,
    code: draft.code.trim(),
    text: draft.text.trim(),
    help_text: draft.help_text.trim(),
    type: draft.type,
    required: draft.required,
    order,
    scale_min: isScale ? scaleMin : 1,
    scale_max: isScale ? scaleMax : 5,
    scale_labels: labels,
    max_choices: draft.type === "multiple_choice" ? toNumberOrNull(draft.max_choices) : null,
    has_other: isChoice ? draft.has_other : false,
    other_label: draft.other_label.trim() || "Другое",
    min_value: draft.type === "number" ? toNumberOrNull(draft.min_value) : null,
    max_value: draft.type === "number" ? toNumberOrNull(draft.max_value) : null,
    max_length: TEXT_TYPES.includes(draft.type) ? toNumberOrNull(draft.max_length) : null,
    identifies_respondent: draft.type === "short_text" ? draft.identifies_respondent : false,
    options: isChoice
      ? draft.options
          .filter((o) => o.text.trim())
          .map((o, index) => ({
            ...(o.id ? { id: o.id } : {}),
            text: o.text.trim(),
            order: index,
            is_exclusive: draft.type === "multiple_choice" ? o.is_exclusive : false,
          }))
      : [],
  };
}

function validateDraft(draft: Draft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.text.trim()) {
    errors.text = "Введите текст вопроса.";
  }
  if (draft.type === "scale") {
    const lo = Number(draft.scale_min);
    const hi = Number(draft.scale_max);
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 0 || hi > SCALE_LIMIT || lo >= hi) {
      errors.scale_max = `Шкала: 0 ≤ от < до ≤ ${SCALE_LIMIT}.`;
    }
  }
  if (CHOICE_TYPES.includes(draft.type) && !draft.options.some((o) => o.text.trim())) {
    errors.options = "Добавьте хотя бы один вариант.";
  }
  if (draft.type === "multiple_choice" && draft.max_choices.trim()) {
    const n = Number(draft.max_choices);
    if (!Number.isInteger(n) || n < 1) {
      errors.max_choices = "Лимит — целое число от 1.";
    }
  }
  if (draft.type === "number") {
    const lo = toNumberOrNull(draft.min_value);
    const hi = toNumberOrNull(draft.max_value);
    if (draft.min_value.trim() && lo === null) {
      errors.min_value = "Нужно число.";
    }
    if (draft.max_value.trim() && hi === null) {
      errors.max_value = "Нужно число.";
    }
    if (lo !== null && hi !== null && lo > hi) {
      errors.max_value = "Максимум меньше минимума.";
    }
  }
  if (TEXT_TYPES.includes(draft.type) && draft.max_length.trim()) {
    const n = Number(draft.max_length);
    if (!Number.isInteger(n) || n < 1) {
      errors.max_length = "Целое число от 1.";
    }
  }
  return errors;
}

export function QuestionEditorModal({
  question,
  sectionId,
  sections,
  isAnonymous,
  nextOrderFor,
  saving,
  serverErrors,
  onSave,
  onClose,
}: {
  question: Question | null;
  sectionId: string;
  sections: SurveySection[];
  isAnonymous: boolean;
  /** Order for a question appended to the given section. */
  nextOrderFor: (_sectionId: string) => number;
  saving: boolean;
  serverErrors: Record<string, string>;
  onSave: (_payload: QuestionInput) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(question, sectionId));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const hasAnswers = (question?.answer_count || 0) > 0;
  const allErrors = { ...serverErrors, ...errors };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) {
        return prev;
      }
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const setOption = (index: number, patch: Partial<QuestionOption>) =>
    set(
      "options",
      draft.options.map((o, i) => (i === index ? { ...o, ...patch } : o))
    );

  const moveOption = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= draft.options.length) {
      return;
    }
    const next = [...draft.options];
    [next[index], next[target]] = [next[target], next[index]];
    set("options", next);
  };

  const handleSave = () => {
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) {
      return;
    }
    const order =
      question && question.section === draft.section ? question.order : nextOrderFor(draft.section);
    onSave(buildQuestionPayload(draft, order));
  };

  const scaleValues: number[] = [];
  const lo = Number(draft.scale_min);
  const hi = Number(draft.scale_max);
  if (Number.isInteger(lo) && Number.isInteger(hi) && lo >= 0 && hi <= SCALE_LIMIT && lo < hi) {
    for (let v = lo; v <= hi; v += 1) {
      scaleValues.push(v);
    }
  }

  const isChoice = CHOICE_TYPES.includes(draft.type);

  return (
    <Modal
      open
      onClose={onClose}
      title={question ? "Редактировать вопрос" : "Новый вопрос"}
      size="lg"
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6 pt-2">
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <Input
            id="question-code"
            label="Номер"
            placeholder="2.1"
            value={draft.code}
            maxLength={20}
            onChange={(e) => set("code", e.target.value)}
            error={allErrors.code}
          />
          <Select
            id="question-type"
            label="Тип вопроса"
            options={TYPE_OPTIONS}
            value={draft.type}
            disabled={hasAnswers}
            onChange={(e) => set("type", e.target.value as QuestionType)}
            error={allErrors.type}
          />
        </div>
        {hasAnswers && (
          <p className="text-xs text-warning-600">
            На вопрос уже есть ответы ({question?.answer_count}): тип менять нельзя, удалять
            выбранные варианты тоже — их можно переименовать.
          </p>
        )}

        <div className="space-y-1">
          <label
            htmlFor="question-text"
            className="block text-sm font-medium text-surface-700 dark:text-surface-200"
          >
            Текст вопроса
          </label>
          <textarea
            id="question-text"
            rows={2}
            value={draft.text}
            onChange={(e) => set("text", e.target.value)}
            className={textareaClass}
            aria-invalid={Boolean(allErrors.text)}
          />
          {allErrors.text && <p className="text-sm text-danger-600">{allErrors.text}</p>}
        </div>

        <Input
          id="question-help"
          label="Подсказка (необязательно)"
          value={draft.help_text}
          onChange={(e) => set("help_text", e.target.value)}
          error={allErrors.help_text}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="question-section"
            label="Раздел"
            options={sections.map((s) => ({ value: s.id, label: s.title }))}
            value={draft.section}
            onChange={(e) => set("section", e.target.value)}
            error={allErrors.section}
          />
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-surface-700 dark:text-surface-200">
            <input
              type="checkbox"
              checked={draft.required}
              onChange={(e) => set("required", e.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
            Обязательный вопрос
          </label>
        </div>

        {draft.type === "scale" && (
          <fieldset className="space-y-3 rounded-xl border border-surface-200 p-4 dark:border-surface-700">
            <legend className="px-1 text-sm font-medium text-surface-700 dark:text-surface-200">
              Шкала
            </legend>
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="scale-min"
                label="От"
                type="number"
                min={0}
                max={SCALE_LIMIT}
                value={draft.scale_min}
                onChange={(e) => set("scale_min", e.target.value)}
              />
              <Input
                id="scale-max"
                label="До"
                type="number"
                min={1}
                max={SCALE_LIMIT}
                value={draft.scale_max}
                onChange={(e) => set("scale_max", e.target.value)}
              />
            </div>
            {allErrors.scale_max && (
              <p className="text-sm text-danger-600">{allErrors.scale_max}</p>
            )}
            {scaleValues.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-surface-500">
                  Подписи значений: обычно заполняют крайние, промежуточные — по желанию.
                </p>
                {scaleValues.map((v) => (
                  <div key={v} className="flex items-center gap-2">
                    <span className="w-6 text-right text-sm font-semibold text-surface-600">
                      {v}
                    </span>
                    <input
                      aria-label={`Подпись для значения ${v}`}
                      value={draft.scale_labels[String(v)] || ""}
                      onChange={(e) =>
                        set("scale_labels", { ...draft.scale_labels, [String(v)]: e.target.value })
                      }
                      placeholder={
                        v === lo
                          ? "например, «совсем нет»"
                          : v === hi
                            ? "например, «полностью»"
                            : ""
                      }
                      className="input py-1.5"
                    />
                  </div>
                ))}
              </div>
            )}
            {allErrors.scale_labels && (
              <p className="text-sm text-danger-600">{allErrors.scale_labels}</p>
            )}
          </fieldset>
        )}

        {isChoice && (
          <fieldset className="space-y-3 rounded-xl border border-surface-200 p-4 dark:border-surface-700">
            <legend className="px-1 text-sm font-medium text-surface-700 dark:text-surface-200">
              Варианты ответа
            </legend>
            {draft.options.map((option, index) => (
              <div key={option.id || `new-${index}`} className="flex flex-wrap items-center gap-2">
                <input
                  aria-label={`Вариант ${index + 1}`}
                  value={option.text}
                  onChange={(e) => setOption(index, { text: e.target.value })}
                  className="input min-w-0 flex-1 py-1.5"
                />
                {draft.type === "multiple_choice" && (
                  <label
                    className="flex items-center gap-1 text-xs text-surface-600"
                    title="Нельзя выбрать вместе с другими (например, «ничего из перечисленного»)"
                  >
                    <input
                      type="checkbox"
                      checked={option.is_exclusive}
                      onChange={(e) => setOption(index, { is_exclusive: e.target.checked })}
                      className="h-4 w-4 accent-brand-600"
                    />
                    Исключающий
                  </label>
                )}
                <div className="flex">
                  <IconBtn
                    label="Выше"
                    disabled={index === 0}
                    onClick={() => moveOption(index, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    label="Ниже"
                    disabled={index === draft.options.length - 1}
                    onClick={() => moveOption(index, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    label="Удалить вариант"
                    danger
                    onClick={() =>
                      set(
                        "options",
                        draft.options.filter((_, i) => i !== index)
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </div>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                set("options", [
                  ...draft.options,
                  { text: "", order: draft.options.length, is_exclusive: false },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Добавить вариант
            </Button>
            {allErrors.options && <p className="text-sm text-danger-600">{allErrors.options}</p>}

            <div className="grid gap-3 border-t border-surface-200 pt-3 dark:border-surface-700 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-200">
                <input
                  type="checkbox"
                  checked={draft.has_other}
                  onChange={(e) => set("has_other", e.target.checked)}
                  className="h-4 w-4 accent-brand-600"
                />
                Вариант «Другое» со своим ответом
              </label>
              {draft.has_other && (
                <Input
                  id="other-label"
                  aria-label="Подпись «Другое»"
                  placeholder="Другое"
                  value={draft.other_label}
                  onChange={(e) => set("other_label", e.target.value)}
                  error={allErrors.other_label || allErrors.has_other}
                />
              )}
              {draft.type === "multiple_choice" && (
                <Input
                  id="max-choices"
                  label="Не более N вариантов (пусто — без лимита)"
                  type="number"
                  min={1}
                  value={draft.max_choices}
                  onChange={(e) => set("max_choices", e.target.value)}
                  error={allErrors.max_choices}
                />
              )}
            </div>
          </fieldset>
        )}

        {draft.type === "number" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="min-value"
              label="Минимум (необязательно)"
              inputMode="decimal"
              value={draft.min_value}
              onChange={(e) => set("min_value", e.target.value)}
              error={allErrors.min_value}
            />
            <Input
              id="max-value"
              label="Максимум (необязательно)"
              inputMode="decimal"
              value={draft.max_value}
              onChange={(e) => set("max_value", e.target.value)}
              error={allErrors.max_value}
              hint="Ответ — число, до 2 знаков после запятой."
            />
          </div>
        )}

        {TEXT_TYPES.includes(draft.type) && (
          <Input
            id="max-length"
            label="Макс. длина ответа"
            type="number"
            min={1}
            placeholder={draft.type === "short_text" ? "255" : "5000"}
            value={draft.max_length}
            onChange={(e) => set("max_length", e.target.value)}
            error={allErrors.max_length}
          />
        )}

        {draft.type === "short_text" && !isAnonymous && (
          <label className="flex items-start gap-2 text-sm text-surface-700 dark:text-surface-200">
            <input
              type="checkbox"
              checked={draft.identifies_respondent}
              onChange={(e) => set("identifies_respondent", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <span>
              Это имя респондента
              <span className="block text-xs text-surface-500">
                Ответ попадёт в колонку «Имя» в таблице ответов.
              </span>
            </span>
          </label>
        )}
        {allErrors.identifies_respondent && (
          <p className="text-sm text-danger-600">{allErrors.identifies_respondent}</p>
        )}
        {allErrors.non_field_errors && (
          <p className="text-sm text-danger-600">{allErrors.non_field_errors}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-surface-200 p-4 dark:border-surface-700">
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button type="button" onClick={handleSave} loading={saving}>
          Сохранить
        </Button>
      </div>
    </Modal>
  );
}

function IconBtn({
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
          ? "rounded-lg p-2 text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:opacity-30"
          : "rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 disabled:opacity-30 dark:hover:bg-surface-700"
      }
    >
      {children}
    </button>
  );
}
