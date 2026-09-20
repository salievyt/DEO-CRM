"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/shared/api/base";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { AuthField } from "@/features/auth/AuthField";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await api.post("/auth/password-reset/", { email });
      setSent(true);
    } catch {
      setError("Ошибка при отправке. Проверьте email и попробуйте снова.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="rounded-2xl border border-surface-200/80 bg-white p-6 shadow-xl shadow-surface-900/[0.04] transition-colors sm:p-8 dark:border-surface-800 dark:bg-surface-900">
        {sent ? (
          <div className="animate-fade-in space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50 ring-1 ring-success-100 dark:bg-green-900/30 dark:ring-green-900">
              <Mail className="h-8 w-8 text-success-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-surface-900 dark:text-white">
                Письмо отправлено!
              </h1>
              <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
                Если аккаунт с email{" "}
                <strong className="text-surface-700 dark:text-surface-300">
                  {email}
                </strong>{" "}
                существует, мы отправили инструкции по восстановлению пароля.
              </p>
            </div>
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-600/30 active:translate-y-0 active:scale-[0.99]"
            >
              <ArrowLeft className="h-4 w-4" />
              Вернуться ко входу
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white">
                Забыли пароль?
              </h1>
              <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">
                Укажите email — мы пришлём ссылку для сброса пароля
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <AuthField
                id="email"
                label="Email"
                icon={Mail}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />

              {error && (
                <div className="animate-fade-in rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-600/30 active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Отправка...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="h-4 w-4" />
                    Отправить
                  </span>
                )}
              </button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Вернуться ко входу
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}