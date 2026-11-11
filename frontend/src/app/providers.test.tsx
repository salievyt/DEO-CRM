import { act, render, screen } from "@testing-library/react";

import { Providers } from "./providers";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/shared/ui/Toast";

const mockPathname = jest.fn<string, []>();

jest.mock("next/navigation", () => ({ usePathname: () => mockPathname() }));
jest.mock("@/shared/api/base", () => ({
  ...jest.requireActual("@/shared/api/base"),
  authApi: { me: jest.fn() },
}));

const fetchUser = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.setState({ fetchUser });
});

test("toasts are rendered globally", () => {
  mockPathname.mockReturnValue("/dashboard");
  render(<Providers>страница</Providers>);
  act(() => toast({ title: "Не удалось удалить", message: "Есть ответы", type: "error" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Не удалось удалить");
  expect(screen.getByText("Есть ответы")).toBeInTheDocument();
});

test.each(["/survey/abc/", "/forms/abc"])("%s does not call /auth/me", (path) => {
  mockPathname.mockReturnValue(path);
  render(<Providers>опрос</Providers>);
  expect(fetchUser).not.toHaveBeenCalled();
});

test("dashboard pages still load the user", () => {
  mockPathname.mockReturnValue("/surveys");
  render(<Providers>раздел</Providers>);
  expect(fetchUser).toHaveBeenCalledTimes(1);
});
