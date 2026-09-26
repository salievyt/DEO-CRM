import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPercent,
  getInitials,
  stringToColor,
  timeAgo,
  truncate,
} from "../formatters";

describe("formatters", () => {
  it("formats dates and business values for the Russian locale", () => {
    expect(formatDate("2026-09-26T12:00:00Z")).toBe("26.09.2026");
    expect(formatDateTime("2026-09-26T12:30:00Z", "dd.MM.yyyy")).toBe("26.09.2026");
    expect(formatCurrency(12500)).toMatch(/12\s500/);
    expect(formatPercent(7.25)).toBe("+7.3%");
    expect(formatPercent(-2)).toBe("-2.0%");
  });

  it("builds initials and safely truncates labels", () => {
    expect(getInitials("Яхьёбек", "Салиев")).toBe("ЯС");
    expect(getInitials()).toBe("??");
    expect(truncate("Короткий текст", 30)).toBe("Короткий текст");
    expect(truncate("Очень длинное название проекта", 12)).toBe("Очень длинно...");
  });

  it("renders relative time", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-26T12:00:00Z"));
    expect(timeAgo("2026-09-25T12:00:00Z")).toContain("1 день");
    jest.useRealTimers();
  });

  it("returns a stable palette color for the same value", () => {
    expect(stringToColor("DEO Studio")).toBe(stringToColor("DEO Studio"));
    expect(stringToColor("DEO Studio")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
