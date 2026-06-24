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
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Tabs } from "@/shared/ui/Tabs";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/shared/api/base";

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

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => authApi.updateProfile(data),
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

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      authApi.changePassword(passwords.old_password, passwords.new_password),
  });

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
          <div className="flex justify-end">
            <Button
              onClick={() => changePasswordMutation.mutate()}
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
  return (
    <Card>
      <div className="space-y-4">
        {[
          { label: "Новые задачи", desc: "Уведомления о новых задачах" },
          { label: "Комментарии", desc: "Уведомления о комментариях" },
          { label: "Изменения проектов", desc: "Уведомления об изменениях в проектах" },
          { label: "Дедлайны", desc: "Напоминания о приближающихся сроках" },
          { label: "Новые сообщения", desc: "Уведомления о новых сообщениях" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-lg border border-surface-200 p-4 dark:border-surface-700"
          >
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-white">
                {item.label}
              </p>
              <p className="text-xs text-surface-500">{item.desc}</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" defaultChecked className="peer sr-only" />
              <div className="h-6 w-11 rounded-full bg-surface-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-surface-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-surface-600" />
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AppearanceSection() {
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
          <input type="checkbox" className="peer sr-only" />
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
              Русский (основной)
            </p>
          </div>
        </div>
        <select className="input w-40">
          <option value="ru">Русский</option>
          <option value="ky">Кыргызский</option>
          <option value="en">English</option>
          <option value="uz">Узбекский</option>
        </select>
      </div>
    </Card>
  );
}
