import type { PublicQuestion } from "@/entities/surveys/types";
import {
  REQUIRED_MSG,
  buildAnswers,
  emptyDraft,
  formatStampDate,
  localDateStamp,
  markSubmitted,
  readSubmittedAt,
  serverAnswerErrors,
  validateAnswer,
} from "./publicAnswers";

const q = (patch: Partial<PublicQuestion>): PublicQuestion => ({
  id: "q",
  code: "",
  text: "Вопрос",
  help_text: "",
  type: "short_text",
  required: true,
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
  ...patch,
});

const d = (patch: Partial<ReturnType<typeof emptyDraft>>) => ({ ...emptyDraft(), ...patch });

test("required vs optional empty answers", () => {
  expect(validateAnswer(q({}), d({ value: "  " }))).toBe(REQUIRED_MSG);
  expect(validateAnswer(q({ required: false }), d({}))).toBeNull();
});

test("number: range and two decimals, comma accepted", () => {
  const number = q({ type: "number", min_value: 0, max_value: 100 });
  expect(validateAnswer(number, d({ value: "12,5" }))).toBeNull();
  expect(validateAnswer(number, d({ value: "1.234" }))).toBe("Не более двух знаков после запятой.");
  expect(validateAnswer(number, d({ value: "-1" }))).toMatch(/не меньше 0/);
  expect(validateAnswer(number, d({ value: "abc" }))).toBe("Введите число.");
});

test("multiple choice: limit and exclusive options", () => {
  const multi = q({
    type: "multiple_choice",
    max_choices: 2,
    has_other: true,
    options: [
      { id: "a", text: "A", is_exclusive: false },
      { id: "b", text: "B", is_exclusive: false },
      { id: "none", text: "Ничего", is_exclusive: true },
    ],
  });
  expect(validateAnswer(multi, d({ values: ["a", "b"], other: true, otherText: "x" }))).toMatch(
    /не более 2/
  );
  expect(validateAnswer(multi, d({ values: ["a", "none"] }))).toMatch(/нельзя совмещать/);
  expect(validateAnswer(multi, d({ values: [], other: true, otherText: "" }))).toMatch(
    /Заполните поле/
  );
});

test("text length limit", () => {
  expect(validateAnswer(q({ max_length: 3 }), d({ value: "abcd" }))).toBe("Не более 3 символов.");
});

test("payload skips empty optional answers and types values", () => {
  const questions = [
    q({ id: "t", required: false }),
    q({ id: "s", type: "scale" }),
    q({
      id: "m",
      type: "multiple_choice",
      has_other: true,
      options: [{ id: "a", text: "A", is_exclusive: false }],
    }),
  ];
  expect(
    buildAnswers(questions, {
      s: d({ value: "3" }),
      m: d({ values: ["a"], other: true, otherText: " свой " }),
    })
  ).toEqual([
    { question: "s", value: 3 },
    { question: "m", value: ["a"], other_text: "свой" },
  ]);
});

test("server errors are mapped by question id", () => {
  expect(serverAnswerErrors({ answers: { q1: ["Ошибка."] } })).toEqual({
    byQuestion: { q1: "Ошибка." },
    general: [],
  });
  expect(serverAnswerErrors({ answers: ["Нужен список ответов."] }).general).toEqual([
    "Нужен список ответов.",
  ]);
});

test("submission marker keeps only the local date", () => {
  localStorage.clear();
  markSubmitted("t");
  expect(localStorage.getItem("survey-submitted:t")).toBe(localDateStamp());
  expect(readSubmittedAt("t")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(localDateStamp(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  expect(formatStampDate("2026-01-05")).toBe("05.01.2026");
  expect(readSubmittedAt("missing")).toBeNull();
});
