// Client-side validation and payload building for the public survey form.
// Rules mirror backend/apps/surveys/answers.py so most mistakes are caught
// before the request; the server stays the source of truth.

import type { AnswerInput, PublicQuestion } from "@/entities/surveys/types";

export const REQUIRED_MSG = "Обязательный вопрос.";
export const OTHER_MAX_LENGTH = 500;
const DEFAULT_MAX_LENGTH: Record<string, number> = { short_text: 255, long_text: 5000 };

/** Editable state of one answer. */
export interface AnswerDraft {
  /** scale / number / text value, or option id for single choice. */
  value: string;
  /** Selected option ids for multiple choice. */
  values: string[];
  /** "Другое" is selected. */
  other: boolean;
  otherText: string;
}

export const emptyDraft = (): AnswerDraft => ({
  value: "",
  values: [],
  other: false,
  otherText: "",
});

export type Drafts = Record<string, AnswerDraft>;

export function parseNumber(raw: string): number | null {
  const text = raw.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    return null;
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function isEmpty(question: PublicQuestion, draft: AnswerDraft): boolean {
  switch (question.type) {
    case "single_choice":
      return !draft.value && !(draft.other && draft.otherText.trim());
    case "multiple_choice":
      return draft.values.length === 0 && !(draft.other && draft.otherText.trim());
    case "short_text":
    case "long_text":
      return !draft.value.trim();
    default:
      return draft.value.trim() === "";
  }
}

/** Returns an error message or `null` when the answer is acceptable. */
export function validateAnswer(
  question: PublicQuestion,
  draft: AnswerDraft = emptyDraft()
): string | null {
  const isChoice = question.type === "single_choice" || question.type === "multiple_choice";

  if (isChoice && draft.other && !draft.otherText.trim()) {
    return `Заполните поле «${question.other_label || "Другое"}» или снимите отметку.`;
  }
  if (isEmpty(question, draft)) {
    return question.required ? REQUIRED_MSG : null;
  }

  switch (question.type) {
    case "scale": {
      const n = parseNumber(draft.value);
      if (n === null || !Number.isInteger(n)) {
        return "Выберите значение шкалы.";
      }
      if (n < question.scale_min || n > question.scale_max) {
        return `Значение должно быть от ${question.scale_min} до ${question.scale_max}.`;
      }
      return null;
    }
    case "number": {
      const n = parseNumber(draft.value);
      if (n === null) {
        return "Введите число.";
      }
      if (question.min_value != null && n < question.min_value) {
        return `Значение должно быть не меньше ${question.min_value}.`;
      }
      if (question.max_value != null && n > question.max_value) {
        return `Значение должно быть не больше ${question.max_value}.`;
      }
      if (Math.abs(n) >= 1e10) {
        return "Слишком большое число.";
      }
      const decimals = draft.value.trim().replace(",", ".").split(".")[1];
      if (decimals && decimals.replace(/0+$/, "").length > 2) {
        return "Не более двух знаков после запятой.";
      }
      return null;
    }
    case "short_text":
    case "long_text": {
      const limit = question.max_length || DEFAULT_MAX_LENGTH[question.type];
      if (draft.value.trim().length > limit) {
        return `Не более ${limit} символов.`;
      }
      return null;
    }
    case "single_choice":
    case "multiple_choice": {
      if (draft.other && draft.otherText.trim().length > OTHER_MAX_LENGTH) {
        return `«${question.other_label || "Другое"}»: не более ${OTHER_MAX_LENGTH} символов.`;
      }
      if (question.type === "multiple_choice") {
        const count = draft.values.length + (draft.other && draft.otherText.trim() ? 1 : 0);
        if (question.max_choices && count > question.max_choices) {
          return `Можно выбрать не более ${question.max_choices}.`;
        }
        const exclusive = question.options.filter((o) => o.is_exclusive).map((o) => o.id);
        if (count > 1 && draft.values.some((id) => exclusive.includes(id))) {
          return "Этот вариант нельзя совмещать с другими.";
        }
      }
      return null;
    }
    default:
      return null;
  }
}

export function validateQuestions(
  questions: PublicQuestion[],
  drafts: Drafts
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const question of questions) {
    const error = validateAnswer(question, drafts[question.id]);
    if (error) {
      errors[question.id] = error;
    }
  }
  return errors;
}

/** Payload for `POST /surveys/public/{token}/`. Empty optional answers are omitted. */
export function buildAnswers(questions: PublicQuestion[], drafts: Drafts): AnswerInput[] {
  const answers: AnswerInput[] = [];
  for (const question of questions) {
    const draft = drafts[question.id] || emptyDraft();
    if (isEmpty(question, draft)) {
      continue;
    }
    const otherText = draft.other ? draft.otherText.trim() : "";
    switch (question.type) {
      case "scale":
      case "number":
        answers.push({ question: question.id, value: parseNumber(draft.value) });
        break;
      case "short_text":
      case "long_text":
        answers.push({ question: question.id, value: draft.value.trim() });
        break;
      case "single_choice":
        answers.push({
          question: question.id,
          value: otherText ? null : draft.value || null,
          ...(otherText ? { other_text: otherText } : {}),
        });
        break;
      case "multiple_choice":
        answers.push({
          question: question.id,
          value: draft.values,
          ...(otherText ? { other_text: otherText } : {}),
        });
        break;
    }
  }
  return answers;
}

/**
 * Server 400: `{ detail: { answers: { <question id>: ["msg"] } } }` or
 * `{ detail: { answers: ["msg"] } }` for a malformed payload.
 */
export function serverAnswerErrors(detail: unknown): {
  byQuestion: Record<string, string>;
  general: string[];
} {
  const byQuestion: Record<string, string> = {};
  const general: string[] = [];
  const answers =
    detail && typeof detail === "object" && !Array.isArray(detail)
      ? (detail as { answers?: unknown }).answers
      : undefined;
  if (Array.isArray(answers)) {
    general.push(...answers.map(String));
  } else if (answers && typeof answers === "object") {
    for (const [qid, messages] of Object.entries(answers as Record<string, unknown>)) {
      byQuestion[qid] = Array.isArray(messages) ? messages.map(String).join(" ") : String(messages);
    }
  } else if (typeof detail === "string") {
    general.push(detail);
  }
  return { byQuestion, general };
}

// --- "already submitted" marker ---------------------------------------------

const submittedKey = (token: string) => `survey-submitted:${token}`;

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar date `YYYY-MM-DD`: no time, so the marker cannot be matched to a response. */
export function localDateStamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DD` -> `DD.MM.YYYY` without a Date round-trip (no timezone shift). */
export function formatStampDate(stamp: string): string {
  if (!DATE_ONLY_RE.test(stamp)) {
    return stamp;
  }
  const [year, month, day] = stamp.split("-");
  return `${day}.${month}.${year}`;
}

/**
 * Date (`YYYY-MM-DD`) when this device last submitted the survey, or null.
 * Markers written by an older build kept a full ISO timestamp: they are cut
 * down to the date and rewritten.
 */
export function readSubmittedAt(token: string): string | null {
  try {
    const raw = localStorage.getItem(submittedKey(token));
    if (!raw) {
      return null;
    }
    if (DATE_ONLY_RE.test(raw)) {
      return raw;
    }
    const parsed = new Date(raw);
    const stamp = Number.isNaN(parsed.getTime()) ? localDateStamp() : localDateStamp(parsed);
    localStorage.setItem(submittedKey(token), stamp);
    return stamp;
  } catch {
    return null;
  }
}

/** Only the fact and the calendar date are stored: no time, never the answers. */
export function markSubmitted(token: string): void {
  try {
    localStorage.setItem(submittedKey(token), localDateStamp());
  } catch {
    // Private mode / storage disabled: the warning is best-effort.
  }
}
