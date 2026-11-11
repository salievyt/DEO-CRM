import { render, screen } from "@testing-library/react";

import { SurveyAccessGuard } from "./SurveyAccessGuard";
import { useAuth } from "@/hooks/useAuth";

jest.mock("@/shared/api/base", () => ({ authApi: {} }));

const setRole = (role_name: string | null) =>
  useAuth.setState({
    isAuthenticated: true,
    isLoading: false,
    user: {
      id: "u1",
      email: "u@example.com",
      first_name: "",
      last_name: "",
      full_name: "",
      phone: "",
      avatar: null,
      role_id: 1,
      role_name,
      is_active: true,
      date_joined: "2026-01-01",
    },
  });

test.each(["superadmin", "owner", "hr", "HR"])("%s sees the section", (role) => {
  setRole(role);
  render(<SurveyAccessGuard>секрет</SurveyAccessGuard>);
  expect(screen.getByText("секрет")).toBeInTheDocument();
});

test.each(["project_manager", "developer", "marketer", "client", null])(
  "%s gets no access",
  (role) => {
    setRole(role);
    render(<SurveyAccessGuard>секрет</SurveyAccessGuard>);
    expect(screen.queryByText("секрет")).not.toBeInTheDocument();
    expect(screen.getByText("Нет доступа")).toBeInTheDocument();
  }
);
