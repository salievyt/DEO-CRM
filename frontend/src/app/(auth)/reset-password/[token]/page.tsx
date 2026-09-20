"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/shared/api/base";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { AuthField } from "@/features/auth/AuthField";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (password.length < 8) {
      setError("Пароль должен быть минимум 8 символов");
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/auth/password-reset/confirm/", {
        token,
        password,
      });
      setSuccess(true);
      setTimeout(() => router.push("/login?reset=true"), 3000);
    } catch {
      setError("Ссылка устарела или недействительна. Запросите восстановление заново.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="rounded-2xl border border-surface-200/80 bg-white p-6 shadow-xl shadow-surface-900/[0.04] transition-colors sm:p-8 dark:border-surface-800 dark:bg-surface-900">
        {success ? (
          <div className="animate-fade-in space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50 ring-1 ring-success-100 dark:bg-green-900/30 dark:ring-green-900">
              <CheckCircle2 className="h-8 w-8 text-success-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-surface-900 dark:text-white">
                Пароль изменён!
              </h1>
              <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
                Перенаправляем на страницу входа...
              </p>
            </div>
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-600/30 active:translate-y-0 active:scale-[0.99]"
            >
              <ArrowLeft className="h-4 w-4" />
              Перейти ко входу
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white">
                Новый пароль
              </h1>
              <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">
                Придумайте новый надёжный пароль
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <AuthField
                id="password"
                label="Новый пароль"
                icon={Lock}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                minLength={8}
                autoComplete="new-password"
                required
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="rounded-md p-1.5 text-surface-400 transition-colors hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300"
                    tabIndex={-1}
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <AuthField
                id="confirmPassword"
                label="Подтвердите пароль"
                icon={CheckCircle2}
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                autoComplete="new-password"
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
                    Сохранение...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Сохранить новый пароль
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