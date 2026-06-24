const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

interface LogErrorParams {
  error: Error | unknown;
  context?: Record<string, unknown>;
  tags?: Record<string, string>;
}

export function initSentry() {
  if (typeof window === "undefined") return;
  if (!SENTRY_DSN) {
    console.warn("[Sentry] DSN not configured");
    return;
  }
  // Sentry.init would be called here with dsn: SENTRY_DSN
  // For now we just log to console in development
  console.log("[Sentry] Initialized with DSN:", SENTRY_DSN?.slice(0, 20) + "...");
}

export function logError({ error, context, tags }: LogErrorParams) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error("[Error]", message, { context, tags, stack });
  }

  // In production, would send to Sentry:
  // Sentry.captureException(error, { extra: context, tags });
}

export function logMessage(level: "info" | "warning" | "error", message: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[${level.toUpperCase()}]`, message, data);
  }

  // In production, would send to Sentry:
  // Sentry.captureMessage(message, { level, extra: data });
}
