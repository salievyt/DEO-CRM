"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { AuthField } from "@/features/auth/AuthField";

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
  const [showPassword, setShowPassword] = useState(false);

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
      const detail = data?.detail;

      if (typeof detail === "string") {
        setError(detail);
      } else if (detail && typeof detail === "object") {
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
    <AuthLayout>
      <div className="rounded-2xl border border-surface-200/80 bg-white p-6 shadow-xl shadow-surface-900/[0.04] transition-colors sm:p-8 dark:border-surface-800 dark:bg-surface-900">
        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white">
            Создать аккаунт
          </h1>
          <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">
            Несколько полей — и команда готова к работе
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField
              id="firstName"
              label="Имя"
              icon={User}
              type="text"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              placeholder="Иван"
              autoComplete="given-name"
              required
            />
            <AuthField
              id="lastName"
              label="Фамилия"
              icon={User}
              type="text"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              placeholder="Петров"
              autoComplete="family-name"
              required
            />
          </div>

          <AuthField
            id="email"
            label="Email"
            icon={Mail}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@company.com"
            autoComplete="email"
            required
          />

          <AuthField
            id="password"
            label="Пароль"
            icon={Lock}
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
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
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
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
                Регистрация...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <UserPlus className="h-4 w-4" />
                Создать аккаунт
              </span>
            )}
          </button>

          <p className="text-center text-sm text-surface-500 dark:text-surface-400">
            Уже есть аккаунт?{" "}
            <Link
              href="/login"
              className="font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Войти
            </Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}