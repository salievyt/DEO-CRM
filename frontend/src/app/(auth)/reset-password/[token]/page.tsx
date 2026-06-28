"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/shared/api/base";
import { Eye, EyeOff, ShieldCheck, ArrowLeft, CheckCircle } from "lucide-react";

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
    <div className="auth-gradient-light dark:auth-gradient relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-400/20 blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 shadow-lg shadow-brand-600/20 ring-4 ring-white/50 dark:ring-surface-800">
            <Image
              src="/images/DEO_CRM_LOGO.svg"
              alt="DEO CRM"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Новый пароль
          </h1>
          <p className="mt-1.5 text-sm text-surface-500">
            Придумайте новый надёжный пароль
          </p>
        </div>

        <div className="card-glass dark:border-surface-700/50">
          {success ? (
            <div className="animate-fade-in space-y-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50 dark:bg-green-900/30">
                <CheckCircle className="h-8 w-8 text-success-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                  Пароль изменён!
                </h3>
                <p className="mt-2 text-sm text-surface-500">
                  Перенаправляем на страницу входа...
                </p>
              </div>
              <Link
                href="/login"
                className="btn-primary inline-flex w-full items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Перейти ко входу
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                  Новый пароль
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-10"
                    placeholder="Минимум 8 символов"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                  Подтвердите пароль
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Повторите пароль"
                  required
                />
              </div>

              {error && (
                <div className="animate-fade-in rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                  <p>{error}</p>
                </div>
              )}

              <button type="submit" disabled={isLoading} className="btn-primary w-full">
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
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Вернуться ко входу
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-surface-400">
          © {new Date().getFullYear()} DEO STUDIO CRM
        </p>
      </div>
    </div>
  );
}
