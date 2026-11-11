import { fireEvent, render, screen, within } from "@testing-library/react";

import { SurveyResultsView } from "./SurveyResultsPage";
import { ResponsesTableView } from "./SurveyResponsesPage";
import { responsesTable, surveyResults } from "@/features/surveys/__fixtures__/surveys";

jest.mock("@/shared/api/base", () => ({ surveysApi: {} }));

describe("results by question", () => {
  test("renders option bars, other answers, scale distribution, numbers and texts", () => {
    render(<SurveyResultsView results={surveyResults} />);

    expect(screen.getByText("Всего ответов:")).toBeInTheDocument();
    expect(screen.getByText("Дизайн (product / UX/UI)")).toBeInTheDocument();
    expect(screen.getByText(/66,7%/)).toBeInTheDocument();
    expect(screen.getByText("Аналитика")).toBeInTheDocument();

    const scale = screen
      .getByText("Как ты оцениваешь свою загрузку в последний месяц?")
      .closest("div.space-y-3") as HTMLElement;
    expect(within(scale).getByText("Среднее")).toBeInTheDocument();
    expect(within(scale).getByText("Медиана")).toBeInTheDocument();
    expect(within(scale).getByRole("table")).toBeInTheDocument();
    expect(within(scale).getAllByRole("row")).toHaveLength(5);

    expect(screen.getByText("20,83")).toBeInTheDocument();
    expect(screen.getAllByText("12,5").length).toBeGreaterThanOrEqual(2); // min + value list
    expect(screen.getByText("Шаблоны КП")).toBeInTheDocument();
    expect(screen.getByText("Быстрее согласовывать ТЗ")).toBeInTheDocument();
  });

  test("filters questions by section", () => {
    render(<SurveyResultsView results={surveyResults} />);
    fireEvent.click(screen.getByRole("button", { name: /Идеи/ }));
    expect(screen.getByText("Шаблоны КП")).toBeInTheDocument();
    expect(screen.queryByText("Дизайн (product / UX/UI)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Все разделы" }));
    expect(screen.getByText("Дизайн (product / UX/UI)")).toBeInTheDocument();
  });

  test("shows an empty state without responses", () => {
    render(<SurveyResultsView results={{ ...surveyResults, total_responses: 0 }} />);
    expect(screen.getByText("Ответов пока нет")).toBeInTheDocument();
  });
});

describe("responses table", () => {
  test("renders respondents as rows and questions as columns with code, text and tooltip", () => {
    const onPageChange = jest.fn();
    render(
      <ResponsesTableView
        table={responsesTable}
        page={1}
        pageSize={2}
        onPageChange={onPageChange}
        onPageSizeChange={jest.fn()}
      />
    );

    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(4);
    expect(headers[0]).toHaveTextContent("Дата");
    expect(headers[0].className).toContain("sticky");
    expect(headers[1]).toHaveTextContent("1.1");
    expect(headers[1]).toHaveTextContent("Твоё основное направление в студии.");
    expect(within(headers[1]).getByTitle(/Раздел: О себе и роли/)).toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3); // header + 2
    expect(within(rows[1]).getByText("Другое: Аналитика")).toBeInTheDocument();
    expect(within(rows[1]).getByText("—")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Шаблоны КП")).toBeInTheDocument();

    expect(screen.getByText("1–2 из 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Следующая страница" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  test("shows the respondent name for named surveys", () => {
    render(
      <ResponsesTableView
        table={{
          ...responsesTable,
          is_anonymous: false,
          results: [{ ...responsesTable.results[0], respondent_name: "Алина" }],
        }}
        page={1}
        pageSize={20}
        onPageChange={jest.fn()}
        onPageSizeChange={jest.fn()}
      />
    );
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Респондент");
    expect(screen.getByText("Алина")).toBeInTheDocument();
  });
});
