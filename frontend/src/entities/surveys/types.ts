// Types for the employee surveys API (`/api/v1/surveys/`).
// Contract: backend/apps/surveys/serializers.py, results.py, schema_examples.py.

export type SurveyStatus = "inactive" | "scheduled" | "open" | "closed";

export type QuestionType =
  | "scale"
  | "single_choice"
  | "multiple_choice"
  | "number"
  | "short_text"
  | "long_text";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  scale: "Шкала",
  single_choice: "Один вариант",
  multiple_choice: "Несколько вариантов",
  number: "Число",
  short_text: "Короткий текст",
  long_text: "Развёрнутый ответ",
};

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  inactive: "Отключён",
  scheduled: "Запланирован",
  open: "Идёт сбор ответов",
  closed: "Срок истёк",
};

export const CHOICE_TYPES: QuestionType[] = ["single_choice", "multiple_choice"];
export const TEXT_TYPES: QuestionType[] = ["short_text", "long_text"];

/** Scale labels: `{ "1": "плохо", "5": "отлично" }`. */
export type ScaleLabels = Record<string, string>;

// --- management ------------------------------------------------------------

export interface Survey {
  id: string;
  slug: string | null;
  title: string;
  description: string;
  thank_you_text: string;
  is_anonymous: boolean;
  is_active: boolean;
  status: SurveyStatus;
  starts_at: string | null;
  ends_at: string | null;
  public_token: string;
  public_url: string | null;
  follow_up_survey: string | null;
  response_count: number;
  anonymity_locked?: boolean;
  question_count: number;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id?: string;
  text: string;
  order: number;
  is_exclusive: boolean;
}

export interface Question {
  id: string;
  survey: string;
  section: string;
  code: string;
  text: string;
  help_text: string;
  type: QuestionType;
  required: boolean;
  order: number;
  scale_min: number;
  scale_max: number;
  scale_labels: ScaleLabels;
  max_choices: number | null;
  has_other: boolean;
  other_label: string;
  min_value: number | null;
  max_value: number | null;
  max_length: number | null;
  identifies_respondent: boolean;
  options: QuestionOption[];
  answer_count: number;
}

export type QuestionInput = Omit<Question, "id" | "survey" | "answer_count">;

export interface SurveySection {
  id: string;
  title: string;
  description: string;
  order: number;
  questions: Question[];
}

export interface SurveyDetail extends Survey {
  sections: SurveySection[];
}

export interface SurveyInput {
  title: string;
  description: string;
  thank_you_text: string;
  is_anonymous: boolean;
  starts_at: string | null;
  ends_at: string | null;
  follow_up_survey: string | null;
}

export interface SectionInput {
  survey: string;
  title: string;
  description: string;
  order: number;
}

export interface PublicLink {
  public_token: string;
  public_url: string | null;
  status: SurveyStatus;
  is_active: boolean;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// --- results: by question --------------------------------------------------

export interface NumericStats {
  average: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  sum: number | null;
}

interface ResultBase {
  id: string;
  code: string;
  text: string;
  required: boolean;
  section: { id: string; title: string };
  answered_count: number;
  skipped_count: number;
}

export interface ChoiceResult extends ResultBase {
  type: "single_choice" | "multiple_choice";
  options: { id: string; text: string; count: number; percent: number }[];
  other: { label: string; count: number; percent: number; answers: string[] } | null;
}

export interface ScaleResult extends ResultBase {
  type: "scale";
  stats: NumericStats;
  scale: { min: number; max: number; labels: ScaleLabels };
  distribution: { value: number; count: number }[];
}

export interface NumberResult extends ResultBase {
  type: "number";
  stats: NumericStats;
  values: number[];
}

export interface TextResult extends ResultBase {
  type: "short_text" | "long_text";
  answers: { response_id: string; respondent_name: string | null; text: string }[];
}

export type QuestionResult = ChoiceResult | ScaleResult | NumberResult | TextResult;

export interface SurveyResults {
  survey: { id: string; title: string; is_anonymous: boolean; status: SurveyStatus };
  total_responses: number;
  questions: QuestionResult[];
}

// --- results: table ---------------------------------------------------------

export interface ResponseColumn {
  id: string;
  code: string;
  text: string;
  type: QuestionType;
  section_title: string;
}

export interface ResponseCell {
  value: unknown;
  other_text: string | null;
  display: string;
}

export interface ResponseRow {
  id: string;
  submitted_date: string;
  submitted_at: string | null;
  respondent_name: string | null;
  user_id: string | null;
  answers: Record<string, ResponseCell | null>;
}

export interface ResponsesTable extends Paginated<ResponseRow> {
  columns: ResponseColumn[];
  is_anonymous: boolean;
}

// --- public -----------------------------------------------------------------

export interface PublicOption {
  id: string;
  text: string;
  is_exclusive: boolean;
}

export interface PublicQuestion {
  id: string;
  code: string;
  text: string;
  help_text: string;
  type: QuestionType;
  required: boolean;
  scale_min: number;
  scale_max: number;
  scale_labels: ScaleLabels;
  max_choices: number | null;
  has_other: boolean;
  other_label: string;
  min_value: number | null;
  max_value: number | null;
  max_length: number | null;
  identifies_respondent: boolean;
  options: PublicOption[];
}

export interface PublicSection {
  id: string;
  title: string;
  description: string;
  questions: PublicQuestion[];
}

export interface PublicFollowUp {
  title: string;
  token: string;
  url: string | null;
}

export interface PublicSurvey {
  title: string;
  description: string;
  thank_you_text: string;
  is_anonymous: boolean;
  /** ISO datetime; also sent in the 403 `survey_not_started` error. */
  starts_at: string | null;
  ends_at: string | null;
  sections: PublicSection[];
  follow_up: PublicFollowUp | null;
}

export type AnswerValue = number | string | string[] | null;

export interface AnswerInput {
  question: string;
  value: AnswerValue;
  other_text?: string;
}

export interface PublicSubmitResult {
  detail: string;
  thank_you_text: string;
  follow_up: PublicFollowUp | null;
}
