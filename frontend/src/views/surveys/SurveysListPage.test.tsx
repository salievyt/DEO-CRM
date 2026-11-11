import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SurveysListPage } from "./SurveysListPage";
import { surveysApi } from "@/shared/api/base";
import { ToastContainer, useToastStore } from "@/shared/ui/Toast";
import type { Survey } from "@/entities/surveys/types";

jest.mock("@/shared/api/base", () => ({
  surveysApi: { list: jest.fn(), remove: jest.fn(), activate: jest.fn(), deactivate: jest.fn() },
}));

const mock = (fn: unknown) => fn as jest.Mock;

const survey: Survey = {
  id: "survey-1",
  slug: null,
  title: "Опрос команды",
  description: "",
  thank_you_text: "",
  is_anonymous: true,
  is_active: true,
  status: "open",
  starts_at: null,
  ends_at: null,
  public_token: "tok",
  public_url: "https://crm.example/survey/tok/",
  follow_up_survey: null,
  response_count: 3,
  question_count: 5,
  created_by_name: null,
  created_at: "2026-11-01T09:00:00Z",
  updated_at: "2026-11-01T09:00:00Z",
};

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SurveysListPage />
      <ToastContainer />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useToastStore.setState({ toasts: [] });
  mock(surveysApi.list).mockResolvedValue({ data: { count: 1, results: [survey] } });
});

test("links point to the /surveys section", async () => {
  mount();
  await screen.findByText("Опрос команды");
  const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
  expect(hrefs).toEqual(expect.arrayContaining(["/surveys/new", "/surveys/survey-1"]));
  expect(hrefs.some((href) => href?.startsWith("/admin/surveys"))).toBe(false);
});

test("a failed delete shows an error toast with the backend message", async () => {
  mock(surveysApi.remove).mockRejectedValue({
    response: {
      status: 409,
      data: { error: true, status_code: 409, detail: { detail: "Нельзя удалить: есть ответы." } },
    },
  });
  mount();
  await screen.findByText("Опрос команды");
  fireEvent.click(screen.getByRole("button", { name: "Удалить" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Удалить" }));

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Не удалось удалить");
  expect(alert).toHaveTextContent("Нельзя удалить: есть ответы.");
  expect(surveysApi.remove).toHaveBeenCalledWith("survey-1");
});
