import { render, screen } from "@testing-library/react";

import LoginPage from "./page";

const mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ login: jest.fn(), verifyLogin2FA: jest.fn() }),
}));

jest.mock("@/features/auth/AuthLayout", () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Публичная регистрация закрыта: доступ выдаёт администратор по приглашению.
test("login page has no registration link and shows the admin hint", () => {
  const { container } = render(<LoginPage />);

  expect(screen.queryByText(/Создать аккаунт/i)).not.toBeInTheDocument();
  expect(container.querySelector('a[href^="/register"]')).toBeNull();
  expect(screen.getByText("Нет доступа? Обратитесь к администратору.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Забыли пароль?" })).toHaveAttribute(
    "href",
    "/forgot-password"
  );
});
