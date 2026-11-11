import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import PublicFormPage from "./page";
import { formsApi } from "@/shared/api/base";

jest.mock("@/shared/api/base", () => ({
  formsApi: { public: { get: jest.fn(), submit: jest.fn() } },
}));

const mockGet = formsApi.public.get as jest.Mock;

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PublicFormPage params={{ token: "tok" }} />
    </QueryClientProvider>
  );
}

beforeEach(() => jest.clearAllMocks());

// B3: a stale session used to return 401 with `detail` as an object, which was
// rendered as a React child and crashed the page (React error #31).
test("401 with an object detail shows a readable message instead of crashing", async () => {
  mockGet.mockRejectedValue({
    response: {
      status: 401,
      data: {
        error: true,
        status_code: 401,
        detail: {
          detail: "Given token not valid for any token type",
          code: "token_not_valid",
          messages: [{ token_class: "AccessToken", message: "Token is expired" }],
        },
      },
    },
  });
  mount();
  expect(
    await screen.findByRole("heading", { name: "Не удалось открыть анкету" })
  ).toBeInTheDocument();
  expect(screen.getByText(/запросите новую ссылку/)).toBeInTheDocument();
});

test("404 with a nested detail object renders its text", async () => {
  mockGet.mockRejectedValue({
    response: {
      status: 404,
      data: { error: true, status_code: 404, detail: { detail: "Анкета не найдена." } },
    },
  });
  mount();
  expect(await screen.findByRole("heading", { name: "Ссылка не найдена" })).toBeInTheDocument();
  expect(screen.getByText("Анкета не найдена.")).toBeInTheDocument();
});

test("410 shows the expired state", async () => {
  mockGet.mockRejectedValue({ response: { status: 410, data: { detail: { detail: "x" } } } });
  mount();
  expect(await screen.findByRole("heading", { name: "Ссылка истекла" })).toBeInTheDocument();
});
