"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccessMessage("Регистрация успешна! Теперь вы можете войти.");
    } else if (searchParams.get("reset") === "true") {
      setSuccessMessage("Пароль успешно изменён. Войдите с новым паролем.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      setError("Неверный email или пароль");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-gradient-light dark:auth-gradient relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-400/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-300/10 blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Logo section */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl">
            <Image
              src="/images/DEOCORE_LOGO.svg"
              alt="DEO CRM"
              width={48}
              height={48}
              className="h-38 w-38 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Добро пожаловать
          </h1>
          <p className="mt-1.5 text-sm text-surface-500">
            Войдите в систему управления проектами
          </p>
        </div>

        {/* Glass card */}
        <div className="card-glass dark:border-surface-700/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                  Пароль
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Забыли пароль?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
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

            {successMessage && (
              <div className="animate-fade-in rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
                <p className="font-medium">✓ {successMessage}</p>
              </div>
            )}

            {error && (
              <div className="animate-fade-in rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Вход...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Войти
                </span>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-200 dark:border-surface-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-surface-400 dark:bg-surface-800">
                  Или
                </span>
              </div>
            </div>

            <Link
              href="/register"
              className="btn-secondary flex w-full items-center justify-center gap-2"
            >
              Создать аккаунт
            </Link>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-surface-400">
          © {new Date().getFullYear()} DEO STUDIO CRM. Все права защищены.
        </p>
      </div>
    </div>
  );
}
