import { absolutePublicUrl, filenameFromDisposition } from "./utils";

jest.mock("@/shared/ui/Toast", () => ({ toast: jest.fn() }));

test("CSV file name comes from Content-Disposition", () => {
  expect(filenameFromDisposition('attachment; filename="survey-team-2026-11-11.csv"')).toBe(
    "survey-team-2026-11-11.csv"
  );
  expect(filenameFromDisposition("attachment; filename=plain.csv")).toBe("plain.csv");
  expect(
    filenameFromDisposition(
      "attachment; filename=\"opros.csv\"; filename*=UTF-8''%D0%BE%D0%BF%D1%80%D0%BE%D1%81.csv"
    )
  ).toBe("опрос.csv");
  expect(filenameFromDisposition('attachment; filename="../../etc/x.csv"')).toBe(".._.._etc_x.csv");
});

test("no or empty header -> null, the caller keeps its fallback", () => {
  expect(filenameFromDisposition(undefined)).toBeNull();
  expect(filenameFromDisposition("")).toBeNull();
  expect(filenameFromDisposition("attachment")).toBeNull();
  expect(filenameFromDisposition('attachment; filename=""')).toBeNull();
});

test("fallback public URL uses the singular /survey/ path", () => {
  expect(absolutePublicUrl(null, "tok")).toBe("http://localhost/survey/tok/");
  expect(absolutePublicUrl("https://crm.example/survey/tok/", "tok")).toBe(
    "https://crm.example/survey/tok/"
  );
});
