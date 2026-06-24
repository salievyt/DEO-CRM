"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-surface-100 px-4 dark:from-surface-900 dark:to-surface-800">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/images/DEO_CRM_LOGO.svg"
            alt="DEO CRM"
            // width={64}
            // height={64}
            className="h-66 w-66 rounded-lg object-contain auth-contain"
          />
          <p className="mt-2 text-sm text-surface-500">
            Войдите в систему управления проектами
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input mt-1"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input mt-1"
                placeholder="••••••••"
                required
              />
            </div>

            {successMessage && (
              <div className="rounded-lg bg-success-50 p-3 text-sm text-success-700 dark:bg-green-900/20 dark:text-green-400">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? "Вход..." : "Войти"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <Link
                href="/register"
                className="text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                Создать аккаунт
              </Link>
              <Link
                href="/forgot-password"
                className="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              >
                Забыли пароль?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
