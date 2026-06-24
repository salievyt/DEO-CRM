"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError("Пароли не совпадают");
      return;
    }

    if (form.password.length < 8) {
      setError("Пароль должен быть минимум 8 символов");
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
      });
      router.push("/login?registered=true");
    } catch (err: any) {
      const data = err?.response?.data;
      // Backend wraps errors: { error: true, detail: { email: [...], password: [...] }, status_code: 400 }
      const detail = data?.detail;

      if (typeof detail === "string") {
        setError(detail);
      } else if (detail && typeof detail === "object") {
        // Extract first field error
        const firstField = Object.keys(detail)[0];
        const firstError = detail[firstField];
        if (Array.isArray(firstError)) {
          setError(firstError[0]);
        } else if (typeof firstError === "string") {
          setError(firstError);
        } else {
          setError("Проверьте введённые данные");
        }
      } else if (typeof data === "string") {
        setError(data);
      } else {
        setError("Ошибка при регистрации. Попробуйте снова.");
      }
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
            width={64}
            height={64}
            className="h-66 w-66 rounded-lg object-contain"
          />

          <p className="mt-2 text-sm text-surface-500">
            Создайте аккаунт для работы с системой
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                  Имя
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="input mt-1"
                  placeholder="Иван"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                  Фамилия
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="input mt-1"
                  placeholder="Петров"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
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
              {isLoading ? "Регистрация..." : "Создать аккаунт"}
            </button>

            <div className="text-center text-sm text-surface-500">
              Уже есть аккаунт?{" "}
              <Link href="/login" className="text-brand-600 hover:text-brand-700 dark:text-brand-400">
                Войти
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
