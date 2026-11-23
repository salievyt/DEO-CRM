import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OutreachPage from "./OutreachPage";
import { api } from "@/shared/api/base";

jest.mock("@/hooks/useAuth", () => ({ useAuth: (selector: (state: { user: { id: string } }) => unknown) => selector({ user: { id: "manager" } }) }));
jest.mock("@/shared/api/base", () => ({ api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn() } }));
const mocked = api as jest.Mocked<typeof api>;
const contact = { id: "contact-1", company: "Тестовая компания", phone: "+996700123456", industry: "Торговля", offer: "CRM", usp: "Меньше ручной работы", script: "Добрый день", objections: "Ответы", assigned_to: "manager", assigned_name: "Менеджер", status: "new", next_call_at: null, missed_attempts: 0, lead: null, calls: [] };
const settings = { is_supervisor: false, is_admin: false, supervisor: "boss", owner_is_head: true, head: { id: "boss", name: "Руководитель" }, daily_limit: 25, members: [], users: [] };

function mount(supervisor = false) {
  mocked.get.mockImplementation(async (url) => ({ data: String(url).endsWith("settings/") ? { ...settings, is_supervisor: supervisor, is_admin: supervisor } : contact }));
  mocked.post.mockImplementation(async (url) => ({ data: String(url).endsWith("queue/") ? { results: [contact], count: 1, working: true, unassigned: 0 } : {} }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><OutreachPage /></QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(global.crypto, "randomUUID", { value: () => "11111111-1111-4111-8111-111111111111", configurable: true });
});

test("manager sees D2C script and can save unanswered call without recording", async () => {
  mount();
  fireEvent.click(await screen.findByRole("button", { name: /Тестовая компания/ }));
  expect(await screen.findByText("Добрый день")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Команда" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Сохранить результат" }));
  await waitFor(() => expect(mocked.post).toHaveBeenCalledWith("/outreach/contacts/contact-1/outcome/", expect.objectContaining({ outcome: "no_answer", recording: null })));
});

test("interested requires recording and explains automatic transfer", async () => {
  mount();
  fireEvent.click(await screen.findByRole("button", { name: /Тестовая компания/ }));
  const select = await screen.findByLabelText("Результат");
  fireEvent.change(select, { target: { value: "interested" } });
  expect(screen.getByLabelText(/Запись разговора/)).toBeRequired();
  expect(screen.getByRole("button", { name: "Создать лид и передать руководителю" })).toBeInTheDocument();
  fireEvent.change(select, { target: { value: "callback" } });
  expect(screen.getByLabelText(/Когда перезвонить · время Бишкека/)).toBeRequired();
});

test("import requires preview and changing source invalidates it", async () => {
  mount(true);
  fireEvent.click(await screen.findByRole("button", { name: "Импорт D2C" }));
  const text = screen.getByLabelText("Текст подборки D2C");
  fireEvent.change(text, { target: { value: "Компания: A" } });
  mocked.post.mockResolvedValueOnce({ data: { rows: [{company: "A", phone: "+996700123456", offer: "CRM", duplicate: false}], duplicates: 0, created: 0 } });
  fireEvent.click(screen.getByRole("button", { name: /Проверить подборку/ }));
  expect(await screen.findByRole("button", { name: "Добавить 1 контактов" })).toBeInTheDocument();
  expect(mocked.post).toHaveBeenCalledWith("/outreach/import/", { text: "Компания: A", commit: false });
  fireEvent.change(text, { target: { value: "Компания: B" } });
  expect(screen.queryByRole("button", { name: "Добавить 1 контактов" })).not.toBeInTheDocument();
});

test("owner can switch off acting as the sales head", async () => {
  mount(true);
  mocked.patch.mockResolvedValue({ data: {} });
  fireEvent.click(await screen.findByRole("button", { name: "Команда" }));
  const toggle = screen.getByLabelText("Владелец выполняет роль управляющего менеджера");
  expect(toggle).toBeChecked();
  fireEvent.click(toggle);
  await waitFor(() => expect(mocked.patch).toHaveBeenCalledWith("/outreach/settings/", { owner_is_head: false }));
});
