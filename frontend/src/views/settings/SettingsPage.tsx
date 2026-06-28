"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  User,
  Shield,
  Bell,
  Palette,
  Languages,
  Save,
  Camera,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Tabs } from "@/shared/ui/Tabs";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/shared/api/base";
import { useSettingsStore } from "@/shared/store/settingsStore";
import type { Language } from "@/shared/store/settingsStore";

export function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { value: "profile", label: "Профиль" },
    { value: "security", label: "Безопасность" },
    { value: "notifications", label: "Уведомления" },
    { value: "appearance", label: "Внешний вид" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Настройки"
        description="Управление настройками профиля и системы"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} tabs={tabs} />

      {activeTab === "profile" && <ProfileSection user={user} />}
      {activeTab === "security" && <SecuritySection />}
      {activeTab === "notifications" && <NotificationsSection />}
      {activeTab === "appearance" && <AppearanceSection />}
    </div>
  );
}

function ProfileSection({ user }: { user: any }) {
  const [form, setForm] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => authApi.updateProfile(data),
    onSuccess: () => {
      setSuccessMessage("Профиль успешно обновлён");
      setErrorMessage("");
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string") {
        setErrorMessage(detail);
      } else if (err?.response?.data) {
        const msgs = Object.values(err.response.data).flat().join(". ");
        setErrorMessage(msgs || "Ошибка при сохранении");
      } else {
        setErrorMessage("Ошибка при сохранении. Попробуйте снова.");
      }
      setSuccessMessage("");
    },
  });

  return (
    <Card>
      <div className="flex items-start gap-6">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <button className="absolute bottom-0 right-0 rounded-full bg-brand-600 p-1.5 text-white shadow-lg hover:bg-brand-700">
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Имя"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
            <Input
              label="Фамилия"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Телефон"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          {successMessage && (
            <div className="animate-fade-in rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-600 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {successMessage}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="animate-fade-in rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {errorMessage}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => mutation.mutate(form)}
              loading={mutation.isPending}
            >
              <Save className="h-4 w-4" />
              Сохранить
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SecuritySection() {
  const [passwords, setPasswords] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      authApi.changePassword(passwords.old_password, passwords.new_password),
    onSuccess: () => {
      setSuccessMessage("Пароль успешно изменён");
      setErrorMessage("");
      setPasswords({ old_password: "", new_password: "", confirm_password: "" });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.response?.data?.error;
      if (typeof detail === "string") {
        setErrorMessage(detail);
      } else {
        setErrorMessage("Ошибка при смене пароля. Проверьте правильность текущего пароля.");
      }
      setSuccessMessage("");
    },
  });

  const handleChangePassword = () => {
    setErrorMessage("");
    setSuccessMessage("");
    if (!passwords.old_password || !passwords.new_password) {
      setErrorMessage("Заполните все поля");
      return;
    }
    if (passwords.new_password.length < 8) {
      setErrorMessage("Новый пароль должен содержать минимум 8 символов");
      return;
    }
    if (passwords.new_password !== passwords.confirm_password) {
      setErrorMessage("Пароли не совпадают");
      return;
    }
    changePasswordMutation.mutate();
  };

  return (
    <Card className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
          Изменить пароль
        </h3>
        <div className="mt-4 space-y-4">
          <Input
            label="Текущий пароль"
            type="password"
            value={passwords.old_password}
            onChange={(e) =>
              setPasswords({ ...passwords, old_password: e.target.value })
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Новый пароль"
              type="password"
              value={passwords.new_password}
              onChange={(e) =>
                setPasswords({ ...passwords, new_password: e.target.value })
              }
            />
            <Input
              label="Подтвердите пароль"
              type="password"
              value={passwords.confirm_password}
              onChange={(e) =>
                setPasswords({ ...passwords, confirm_password: e.target.value })
              }
            />
          </div>

          {successMessage && (
            <div className="animate-fade-in rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-600 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {successMessage}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="animate-fade-in rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {errorMessage}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleChangePassword}
              loading={changePasswordMutation.isPending}
            >
              <Shield className="h-4 w-4" />
              Изменить пароль
            </Button>
          </div>
        </div>
      </div>

      <hr className="border-surface-200 dark:border-surface-700" />

      <div>
        <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
          Двухфакторная аутентификация
        </h3>
        <p className="mt-1 text-sm text-surface-500">
          Добавьте дополнительный уровень безопасности
        </p>
        <Button variant="secondary" className="mt-3">
          <Shield className="h-4 w-4" />
          Включить 2FA
        </Button>
      </div>
    </Card>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    task_assigned: true,
    comment_added: true,
    project_updated: true,
    deadline_reminder: true,
    message_received: true,
  });

  const items = [
    { key: "task_assigned", label: "Новые задачи", desc: "Уведомления о новых задачах" },
    { key: "comment_added", label: "Комментарии", desc: "Уведомления о комментариях" },
    { key: "project_updated", label: "Изменения проектов", desc: "Уведомления об изменениях в проектах" },
    { key: "deadline_reminder", label: "Дедлайны", desc: "Напоминания о приближающихся сроках" },
    { key: "message_received", label: "Новые сообщения", desc: "Уведомления о новых сообщениях" },
  ];

  return (
    <Card>
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-lg border border-surface-200 p-4 dark:border-surface-700"
          >
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-white">
                {item.label}
              </p>
              <p className="text-xs text-surface-500">{item.desc}</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={prefs[item.key]}
                onChange={() =>
                  setPrefs({ ...prefs, [item.key]: !prefs[item.key] })
                }
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-surface-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-surface-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-surface-600" />
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AppearanceSection() {
  const { theme, language, setTheme, setLanguage } = useSettingsStore();

  const isDark = theme === "dark";

  const handleThemeToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palette className="h-5 w-5 text-surface-400" />
          <div>
            <p className="text-sm font-medium text-surface-900 dark:text-white">
              Темная тема
            </p>
            <p className="text-xs text-surface-500">
              Переключение между светлой и темной темой
            </p>
          </div>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={isDark}
            onChange={handleThemeToggle}
            className="peer sr-only"
          />
          <div className="h-6 w-11 rounded-full bg-surface-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-surface-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-surface-600" />
        </label>
      </div>

      <hr className="border-surface-200 dark:border-surface-700" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Languages className="h-5 w-5 text-surface-400" />
          <div>
            <p className="text-sm font-medium text-surface-900 dark:text-white">
              Язык интерфейса
            </p>
            <p className="text-xs text-surface-500">
              Выберите язык интерфейса
            </p>
          </div>
        </div>
        <select
          className="input w-40"
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
        >
          <option value="ru">Русский</option>
          <option value="ky">Кыргызский</option>
          <option value="en">English</option>
          <option value="uz">Узбекский</option>
        </select>
      </div>
    </Card>
  );
}
