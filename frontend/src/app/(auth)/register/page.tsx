"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, UserPlus } from "lucide-react";

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
    <div className="auth-gradient-light dark:auth-gradient relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-400/20 blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Logo section */}
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
            Создать аккаунт
          </h1>
          <p className="mt-1.5 text-sm text-surface-500">
            Зарегистрируйтесь для работы с системой
          </p>
        </div>

        {/* Glass card */}
        <div className="card-glass dark:border-surface-700/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                  Имя
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="input"
                  placeholder="Иван"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="lastName" className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                  Фамилия
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="input"
                  placeholder="Петров"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                Пароль
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
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
                  Регистрация...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Создать аккаунт
                </span>
              )}
            </button>

            <p className="text-center text-sm text-surface-500">
              Уже есть аккаунт?{" "}
              <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                Войти
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
