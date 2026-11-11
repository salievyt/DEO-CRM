import { apiErrorMessage, errorField, errorMessages, httpStatusOf } from "../apiError";

const err = (status: number, data: unknown) => ({ response: { status, data } });

test("string detail inside the backend envelope", () => {
  const e = err(409, {
    error: true,
    detail: "Нельзя удалить: на вопросы уже есть ответы.",
    status_code: 409,
  });
  expect(httpStatusOf(e)).toBe(409);
  expect(apiErrorMessage(e)).toBe("Нельзя удалить: на вопросы уже есть ответы.");
});

test("nested { detail, code } object becomes a plain string", () => {
  const e = err(401, {
    error: true,
    status_code: 401,
    detail: {
      detail: "Given token not valid for any token type",
      code: "token_not_valid",
      messages: [{ token_class: "AccessToken", message: "Token is expired" }],
    },
  });
  const message = apiErrorMessage(e);
  expect(typeof message).toBe("string");
  expect(message).toBe("Given token not valid for any token type");
});

test("field map is flattened, HTML bodies and empty payloads fall back", () => {
  expect(apiErrorMessage(err(400, { detail: { title: ["Обязательное поле."] } }))).toBe(
    "Обязательное поле."
  );
  expect(apiErrorMessage(err(502, "<html>Bad gateway</html>"), "fallback")).toBe("fallback");
  expect(apiErrorMessage(new Error("Network Error"), "fallback")).toBe("fallback");
  expect(apiErrorMessage(null, "fallback")).toBe("fallback");
  expect(errorMessages([{ a: ["x"] }, "y", 3])).toEqual(["x", "y", "3"]);
});

test("extra fields are read from the nested detail or the envelope", () => {
  const nested = err(403, {
    error: true,
    status_code: 403,
    detail: { detail: "Опрос ещё не начался.", starts_at: "2026-12-01T09:00:00Z" },
  });
  expect(errorField(nested, "starts_at")).toBe("2026-12-01T09:00:00Z");
  expect(apiErrorMessage(nested)).toBe("Опрос ещё не начался.");

  const flat = err(403, { error: true, detail: "x", starts_at: "2026-12-01", status_code: 403 });
  expect(errorField(flat, "starts_at")).toBe("2026-12-01");
  expect(errorField(err(500, null), "starts_at")).toBeUndefined();
});
