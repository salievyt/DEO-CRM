import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { PublicSurveyPage } from "./PublicSurveyPage";
import { surveysApi } from "@/shared/api/base";
import { publicSurvey, Q_NUMBER, Q_SCALE, Q_SINGLE } from "@/features/surveys/__fixtures__/surveys";

jest.mock("@/shared/api/base", () => ({
  surveysApi: { public: { get: jest.fn(), submit: jest.fn() } },
}));

const mock = (fn: unknown) => fn as jest.Mock;
const TOKEN = "11111111-2222-3333-4444-555555555555";

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PublicSurveyPage token={TOKEN} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mock(surveysApi.public.get).mockResolvedValue({ data: publicSurvey });
});

test("renders the first section, the anonymity mark and no auth is required", async () => {
  mount();
  expect(
    await screen.findByRole("heading", { name: "Опрос команды DEO CORE" })
  ).toBeInTheDocument();
  expect(screen.getByText("Опрос анонимный")).toBeInTheDocument();
  expect(screen.getByText("Раздел 1 из 2")).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Дизайн" })).toBeInTheDocument();
  expect(screen.getByRole("radiogroup")).toBeInTheDocument();
  // second section is a separate step
  expect(screen.queryByText("Сколько часов в неделю?")).not.toBeInTheDocument();
  expect(surveysApi.public.get).toHaveBeenCalledWith(TOKEN);
});

test("blocks the next step until required questions are answered", async () => {
  mount();
  await screen.findByText("Раздел 1 из 2");
  fireEvent.click(screen.getByRole("button", { name: /Далее/ }));

  const alerts = await screen.findAllByText("Обязательный вопрос.");
  expect(alerts).toHaveLength(2);
  expect(screen.getByText("Раздел 1 из 2")).toBeInTheDocument();

  // "Другое" without text is an error too
  fireEvent.click(screen.getByRole("radio", { name: "Другое" }));
  fireEvent.click(screen.getByRole("button", { name: /Далее/ }));
  expect(await screen.findByText(/Заполните поле «Другое»/)).toBeInTheDocument();
});

test("submits typed answers, shows thanks with follow-up and remembers the submission", async () => {
  mount();
  await screen.findByText("Раздел 1 из 2");
  fireEvent.click(screen.getByRole("radio", { name: "Другое" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Другое: свой вариант" }), {
    target: { value: "Аналитика" },
  });
  fireEvent.click(screen.getByRole("radio", { name: "4" }));
  fireEvent.click(screen.getByRole("button", { name: /Далее/ }));

  await screen.findByText("Раздел 2 из 2");
  fireEvent.change(screen.getByLabelText(/Сколько часов в неделю\?/), {
    target: { value: "12,5" },
  });

  mock(surveysApi.public.submit).mockResolvedValue({
    data: {
      detail: "Ответ сохранён.",
      thank_you_text: publicSurvey.thank_you_text,
      follow_up: publicSurvey.follow_up,
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

  await waitFor(() =>
    expect(surveysApi.public.submit).toHaveBeenCalledWith(
      TOKEN,
      [
        { question: Q_SINGLE, value: null, other_text: "Аналитика" },
        { question: Q_SCALE, value: 4 },
        { question: Q_NUMBER, value: 12.5 },
      ],
      false
    )
  );
  expect(await screen.findByRole("heading", { name: "Спасибо!" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Готов участвовать/ })).toHaveAttribute(
    "href",
    "https://crm.example/survey/follow-token/"
  );
  // only the calendar date is kept, no exact time
  expect(localStorage.getItem(`survey-submitted:${TOKEN}`)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("shows server validation errors next to the question and warns about a repeat", async () => {
  localStorage.setItem(`survey-submitted:${TOKEN}`, "2026-11-10");
  mount();
  expect(await screen.findByText(/ответы уже отправлялись 10\.11\.2026/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("radio", { name: "Дизайн" }));
  fireEvent.click(screen.getByRole("radio", { name: "3" }));
  fireEvent.click(screen.getByRole("button", { name: /Далее/ }));
  await screen.findByText("Раздел 2 из 2");
  fireEvent.change(screen.getByLabelText(/Сколько часов в неделю\?/), { target: { value: "10" } });

  mock(surveysApi.public.submit).mockRejectedValue({
    response: {
      status: 400,
      data: {
        error: true,
        status_code: 400,
        detail: { answers: { [Q_SCALE]: ["Значение должно быть от 1 до 5."] } },
      },
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

  // jumps back to the section with the error
  const fieldset = (await screen.findByText("Значение должно быть от 1 до 5.")).closest(
    "fieldset"
  ) as HTMLElement;
  expect(within(fieldset).getByText("Как ты оцениваешь свою загрузку?")).toBeInTheDocument();
  expect(screen.getByText("Раздел 1 из 2")).toBeInTheDocument();
});

test.each([
  [404, "Опрос не найден"],
  [403, "Опрос ещё не начался"],
  [410, "Приём ответов завершён"],
  [429, "Слишком много запросов"],
])("shows the %s state", async (status, title) => {
  mock(surveysApi.public.get).mockRejectedValue({
    response: { status, data: { detail: { detail: "x" } } },
  });
  mount();
  expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
});

test("a legacy marker with exact time is cut down to the date", async () => {
  localStorage.setItem(`survey-submitted:${TOKEN}`, "2026-11-10T12:34:56.789Z");
  mount();
  expect(await screen.findByText(/ответы уже отправлялись/)).toBeInTheDocument();
  expect(localStorage.getItem(`survey-submitted:${TOKEN}`)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("the not-started screen shows starts_at from the 403 error", async () => {
  mock(surveysApi.public.get).mockRejectedValue({
    response: {
      status: 403,
      data: {
        error: true,
        status_code: 403,
        detail: { detail: "Опрос ещё не начался.", starts_at: "2026-12-01T09:00:00Z" },
      },
    },
  });
  mount();
  expect(await screen.findByRole("heading", { name: "Опрос ещё не начался" })).toBeInTheDocument();
  const expected = new Date("2026-12-01T09:00:00Z").toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  expect(
    screen.getByText(`Приём ответов откроется ${expected}. Загляните по этой ссылке позже.`)
  ).toBeInTheDocument();
});

test("the not-started screen without starts_at keeps the generic text", async () => {
  mock(surveysApi.public.get).mockRejectedValue({
    response: { status: 403, data: { error: true, status_code: 403, detail: { detail: "x" } } },
  });
  mount();
  expect(await screen.findByText(/Приём ответов пока не открыт/)).toBeInTheDocument();
});
