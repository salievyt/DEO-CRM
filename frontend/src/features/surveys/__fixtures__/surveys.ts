// Mock API payloads, trimmed from backend/apps/surveys/schema_examples.py.
import type { PublicSurvey, ResponsesTable, SurveyResults } from "@/entities/surveys/types";

export const Q_SINGLE = "q-single";
export const Q_SCALE = "q-scale";
export const Q_MULTI = "q-multi";
export const Q_NUMBER = "q-number";
export const Q_TEXT = "q-text";

const base = {
  help_text: "",
  scale_min: 1,
  scale_max: 5,
  scale_labels: {},
  max_choices: null,
  has_other: false,
  other_label: "Другое",
  min_value: null,
  max_value: null,
  max_length: null,
  identifies_respondent: false,
  options: [],
};

export const publicSurvey: PublicSurvey = {
  title: "Опрос команды DEO CORE",
  description: "Привет! Это опрос о том, как нам работается.",
  thank_you_text: "Спасибо! Заполни короткую форму с именем по ссылке ниже.",
  is_anonymous: true,
  starts_at: "2026-11-01T09:00:00Z",
  ends_at: "2026-11-25T21:00:00Z",
  follow_up: {
    title: "Готов участвовать",
    token: "follow-token",
    url: "https://crm.example/survey/follow-token/",
  },
  sections: [
    {
      id: "s1",
      title: "О себе и роли",
      description: "",
      questions: [
        {
          ...base,
          id: Q_SINGLE,
          code: "1.1",
          text: "Твоё основное направление в студии.",
          type: "single_choice",
          required: true,
          has_other: true,
          options: [
            { id: "opt-design", text: "Дизайн", is_exclusive: false },
            { id: "opt-dev", text: "Разработка", is_exclusive: false },
          ],
        },
        {
          ...base,
          id: Q_SCALE,
          code: "1.2",
          text: "Как ты оцениваешь свою загрузку?",
          type: "scale",
          required: true,
          scale_labels: { "1": "работы почти не было", "5": "перегружен" },
        },
      ],
    },
    {
      id: "s2",
      title: "Загрузка и время",
      description: "",
      questions: [
        {
          ...base,
          id: Q_NUMBER,
          code: "2.1",
          text: "Сколько часов в неделю?",
          type: "number",
          required: true,
          min_value: 0,
        },
        {
          ...base,
          id: Q_TEXT,
          code: "9.1",
          text: "Что бы ты поменял?",
          type: "long_text",
          required: false,
          max_length: 5000,
        },
      ],
    },
  ],
};

export const surveyResults: SurveyResults = {
  survey: { id: "survey-1", title: "Опрос команды DEO CORE", is_anonymous: true, status: "open" },
  total_responses: 3,
  questions: [
    {
      id: Q_SINGLE,
      code: "1.1",
      text: "Твоё основное направление в студии.",
      type: "single_choice",
      required: true,
      section: { id: "s1", title: "О себе и роли" },
      answered_count: 3,
      skipped_count: 0,
      options: [
        { id: "opt-design", text: "Дизайн (product / UX/UI)", count: 2, percent: 66.7 },
        { id: "opt-dev", text: "Разработка (веб, мобильная, бэкенд)", count: 0, percent: 0 },
      ],
      other: { label: "Другое", count: 1, percent: 33.3, answers: ["Аналитика"] },
    },
    {
      id: Q_NUMBER,
      code: "2.1",
      text: "Сколько часов в неделю ты тратишь на студию?",
      type: "number",
      required: true,
      section: { id: "s2", title: "Загрузка и время" },
      answered_count: 3,
      skipped_count: 0,
      stats: { average: 20.83, median: 20, min: 12.5, max: 30, sum: 62.5 },
      values: [20, 12.5, 30],
    },
    {
      id: Q_SCALE,
      code: "2.4",
      text: "Как ты оцениваешь свою загрузку в последний месяц?",
      type: "scale",
      required: true,
      section: { id: "s2", title: "Загрузка и время" },
      answered_count: 3,
      skipped_count: 0,
      stats: { average: 4, median: 4, min: 3, max: 5, sum: 12 },
      scale: { min: 1, max: 5, labels: { "1": "работы почти не было", "5": "перегружен" } },
      distribution: [
        { value: 1, count: 0 },
        { value: 2, count: 0 },
        { value: 3, count: 1 },
        { value: 4, count: 1 },
        { value: 5, count: 1 },
      ],
    },
    {
      id: Q_TEXT,
      code: "9.1",
      text: "Если поменять в студии одну вещь, что бы ты поменял?",
      type: "long_text",
      required: false,
      section: { id: "s3", title: "Идеи" },
      answered_count: 2,
      skipped_count: 1,
      answers: [
        { response_id: "r1", respondent_name: null, text: "Шаблоны КП" },
        { response_id: "r2", respondent_name: null, text: "Быстрее согласовывать ТЗ" },
      ],
    },
  ],
};

export const responsesTable: ResponsesTable = {
  count: 3,
  next: "https://api.example/api/v1/surveys/survey-1/responses/?page=2&page_size=2",
  previous: null,
  is_anonymous: true,
  columns: [
    {
      id: Q_SINGLE,
      code: "1.1",
      text: "Твоё основное направление в студии.",
      type: "single_choice",
      section_title: "О себе и роли",
    },
    {
      id: Q_NUMBER,
      code: "2.1",
      text: "Сколько часов в неделю…",
      type: "number",
      section_title: "Загрузка и время",
    },
    {
      id: Q_TEXT,
      code: "9.1",
      text: "Если поменять в студии одну вещь…",
      type: "long_text",
      section_title: "Идеи",
    },
  ],
  results: [
    {
      id: "r1",
      submitted_date: "2026-11-11",
      submitted_at: null,
      respondent_name: null,
      user_id: null,
      answers: {
        [Q_SINGLE]: { value: null, other_text: "Аналитика", display: "Другое: Аналитика" },
        [Q_NUMBER]: { value: 20, other_text: null, display: "20" },
        [Q_TEXT]: null,
      },
    },
    {
      id: "r2",
      submitted_date: "2026-11-10",
      submitted_at: null,
      respondent_name: null,
      user_id: null,
      answers: {
        [Q_SINGLE]: { value: "opt-design", other_text: null, display: "Дизайн (product / UX/UI)" },
        [Q_NUMBER]: { value: 12.5, other_text: null, display: "12.5" },
        [Q_TEXT]: { value: "Шаблоны КП", other_text: null, display: "Шаблоны КП" },
      },
    },
  ],
};
