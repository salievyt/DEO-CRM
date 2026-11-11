import { toast } from "@/shared/ui/Toast";
import type { SurveyStatus } from "@/entities/surveys/types";
import { publicSurveyPath } from "@/entities/surveys/access";
import { apiErrorMessage, errorDetail, errorMessages } from "@/shared/utils/apiError";

export { errorDetail, errorField, httpStatusOf } from "@/shared/utils/apiError";

/** Human-readable message for a toast. */
export function extractError(err: unknown, fallback = "Попробуйте ещё раз"): string {
  return apiErrorMessage(err, fallback);
}

/** Field errors as `{ field: "message" }` (for inline hints in the editor). */
export function fieldErrors(err: unknown): Record<string, string> {
  const detail = errorDetail(err);
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(detail as Record<string, unknown>)) {
    const messages = errorMessages(value);
    if (messages.length) {
      out[key] = messages.join(" ");
    }
  }
  return out;
}

export function copyToClipboard(text: string, title = "Ссылка скопирована") {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    toast({ title: "Не удалось скопировать", message: text, type: "error" });
    return;
  }
  navigator.clipboard.writeText(text).then(
    () => toast({ title, type: "success" }),
    () => toast({ title: "Не удалось скопировать", message: text, type: "error" })
  );
}

export const STATUS_BADGE: Record<SurveyStatus, "default" | "success" | "warning" | "info"> = {
  inactive: "default",
  scheduled: "info",
  open: "success",
  closed: "warning",
};

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("ru-RU");
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ISO string -> value for `<input type="datetime-local">` in local time. */
export function toLocalInput(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** `<input type="datetime-local">` value -> ISO string (or null when empty). */
export function fromLocalInput(value: string): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) {
    return "—";
  }
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

/** Absolute public URL for copying; falls back to the current origin. */
export function absolutePublicUrl(publicUrl: string | null, token: string): string {
  if (publicUrl) {
    return publicUrl;
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${publicSurveyPath(token)}`;
}

/**
 * File name from a `Content-Disposition` header (RFC 6266): prefers the
 * UTF-8 `filename*=` form, then plain `filename=`. The backend exposes the
 * header via `Access-Control-Expose-Headers`; without it this returns null.
 */
export function filenameFromDisposition(header: unknown): string | null {
  if (typeof header !== "string" || !header) {
    return null;
  }
  const extended = /filename\*\s*=\s*(?:[\w-]+)?'[^']*'([^;]+)/i.exec(header);
  if (extended) {
    try {
      const name = decodeURIComponent(extended[1].trim().replace(/^"|"$/g, ""));
      if (name) {
        return sanitizeFilename(name);
      }
    } catch {
      // Malformed percent-encoding: fall back to the plain parameter.
    }
  }
  const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(header);
  const name = (plain?.[2] ?? plain?.[1] ?? "").trim();
  return name ? sanitizeFilename(name) : null;
}

function sanitizeFilename(name: string): string | null {
  const clean = name.replace(/[/\\]/g, "_").trim();
  return clean || null;
}
