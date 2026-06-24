"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/shared/api/base";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-surface-100 px-4 dark:from-surface-900 dark:to-surface-800">
        <div className="w-full max-w-md">
          <div className="card text-center space-y-4">
            <div className="rounded-lg bg-success-50 p-4 text-sm text-success-700 dark:bg-green-900/20 dark:text-green-400">
              <p className="font-medium">Пароль успешно изменён!</p>
              <p className="mt-1 text-xs">Перенаправляем на страницу входа...</p>
            </div>
            <Link href="/login" className="btn-primary inline-block w-full text-center">
              Перейти к входу
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-surface-100 px-4 dark:from-surface-900 dark:to-surface-800">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-surface-900 dark:text-white">
            DEO STUDIO CRM
          </h1>
          <p className="mt-2 text-sm text-surface-500">
            Введите новый пароль
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                Новый пароль
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input mt-1"
                placeholder="Минимум 8 символов"
                minLength={8}
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                Подтвердите пароль
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input mt-1"
                placeholder="Повторите пароль"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? "Сохранение..." : "Сохранить новый пароль"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
