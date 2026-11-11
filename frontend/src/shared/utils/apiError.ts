/**
 * Helpers for backend errors. `common.exceptions.custom_exception_handler`
 * wraps every DRF error as `{ error: true, detail: <DRF data>, status_code }`,
 * where `detail` is a string, `{ detail: "..." }` (plus extra keys such as
 * `starts_at`) or a field map `{ field: ["msg"] }`.
 *
 * Never render `detail` directly: an object as a React child crashes the page
 * (React error #31). Use `apiErrorMessage` to get a plain string.
 */

type ApiErrorShape = {
  response?: { status?: number; data?: unknown };
};

export function httpStatusOf(err: unknown): number | null {
  const status = (err as ApiErrorShape | null)?.response?.status;
  return typeof status === "number" ? status : null;
}

/** Unwrapped DRF payload: the `detail` of the envelope, or the raw body. */
export function errorDetail(err: unknown): unknown {
  const data = (err as ApiErrorShape | null)?.response?.data;
  if (data && typeof data === "object" && !Array.isArray(data) && "detail" in data) {
    return (data as { detail: unknown }).detail;
  }
  return data;
}

/** Looks up `key` in the envelope and in the nested DRF `detail` object. */
export function errorField(err: unknown, key: string): unknown {
  const data = (err as ApiErrorShape | null)?.response?.data;
  const pick = (value: unknown): unknown =>
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)[key]
      : undefined;
  return pick(errorDetail(err)) ?? pick(data);
}

const looksLikeHtml = (value: string) => /^\s*</.test(value);

/** Every human-readable message inside a DRF error payload. */
export function errorMessages(value: unknown): string[] {
  if (value == null || typeof value === "boolean") {
    return [];
  }
  if (typeof value === "string") {
    const text = value.trim();
    return text && !looksLikeHtml(text) ? [text] : [];
  }
  if (typeof value === "number") {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap(errorMessages);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    // `{ detail: "...", code / starts_at: ... }`: the message is `detail` only.
    if ("detail" in record) {
      return errorMessages(record.detail);
    }
    return Object.values(record).flatMap(errorMessages);
  }
  return [];
}

/** Plain-string message for UI (toasts, error screens). Never an object. */
export function apiErrorMessage(err: unknown, fallback = "Попробуйте ещё раз"): string {
  const messages = errorMessages(errorDetail(err));
  return messages.length ? messages.join(" ") : fallback;
}
