"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/shared/api/base";

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-surface-100 px-4 dark:from-surface-900 dark:to-surface-800">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-surface-900 dark:text-white">
            DEO STUDIO CRM
          </h1>
          <p className="mt-2 text-sm text-surface-500">
            Восстановление доступа
          </p>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="rounded-lg bg-success-50 p-4 text-sm text-success-700 dark:bg-green-900/20 dark:text-green-400">
                <p className="font-medium">Письмо отправлено!</p>
                <p className="mt-1 text-xs">
                  Если аккаунт с email <strong>{email}</strong> существует, 
                  мы отправили инструкции по восстановлению пароля.
                </p>
              </div>
              <Link href="/login" className="btn-secondary inline-block w-full text-center">
                Вернуться к входу
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-surface-500">
                Введите email, указанный при регистрации. Мы отправим ссылку для сброса пароля.
              </p>

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

              {error && (
                <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger-600 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}

              <button type="submit" disabled={isLoading} className="btn-primary w-full">
                {isLoading ? "Отправка..." : "Отправить"}
              </button>

              <div className="text-center text-sm text-surface-500">
                <Link href="/login" className="text-brand-600 hover:text-brand-700 dark:text-brand-400">
                  Вернуться ко входу
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
