"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Database,
  LockKeyhole,
  Plus,
  Server,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { DataTable } from "@/shared/ui/Table";
import { Avatar } from "@/shared/ui/Avatar";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { authApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDate } from "@/shared/utils/formatters";
import type { ColumnDef } from "@tanstack/react-table";

type AdminUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role_name: string | null;
  is_active: boolean;
  date_joined: string;
};

const modules = [
  { name: "API", status: "online", value: 99, icon: Server },
  { name: "База данных", status: "online", value: 92, icon: Database },
  { name: "Авторизация", status: "online", value: 100, icon: LockKeyhole },
  { name: "Активность", status: "warning", value: 76, icon: Activity },
];

export function AdminPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.USERS],
    queryFn: () => authApi.users.list(),
    select: (res): AdminUser[] => res.data?.results || (res.data as AdminUser[]),
  });

  const activeUsers = users?.filter((user) => user.is_active).length || 0;
  const adminUsers =
    users?.filter((user) =>
      ["superadmin", "owner"].includes(user.role_name?.toLowerCase() || "")
    ).length || 0;

  const columns: ColumnDef<AdminUser>[] = [
    {
      accessorKey: "full_name",
      header: "Пользователь",
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            firstName={row.original.first_name}
            lastName={row.original.last_name}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-surface-900 dark:text-white">
              {row.original.full_name || row.original.email}
            </p>
            <p className="truncate text-xs text-surface-500">
              {row.original.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role_name",
      header: "Роль",
      cell: ({ row }) => (
        <Badge variant={row.original.role_name === "superadmin" ? "danger" : "default"}>
          {row.original.role_name || "Без роли"}
        </Badge>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Статус",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "success" : "warning"} dot>
          {row.original.is_active ? "Активен" : "Отключен"}
        </Badge>
      ),
    },
    {
      accessorKey: "date_joined",
      header: "Добавлен",
      cell: ({ row }) => (
        <span className="text-surface-500">
          {formatDate(row.original.date_joined)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Админ"
        description="Управление пользователями, доступами и состоянием системы"
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Добавить пользователя
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Пользователи" value={users?.length || 0} />
        <StatCard icon={ShieldCheck} label="Администраторы" value={adminUsers} />
        <StatCard icon={UserCog} label="Активные" value={activeUsers} />
        <StatCard icon={LockKeyhole} label="Правила доступа" value={8} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card padding="none">
          <div className="border-b border-surface-200 px-4 py-3 dark:border-surface-700">
            <h2 className="text-sm font-semibold text-surface-900 dark:text-white">
              Пользователи и роли
            </h2>
            <p className="mt-1 text-xs text-surface-500">
              Быстрый обзор учетных записей и их прав
            </p>
          </div>
          <div className="p-4">
            <DataTable
              data={users || []}
              columns={columns}
              loading={isLoading}
              searchable
              searchPlaceholder="Поиск по пользователям..."
            />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold text-surface-900 dark:text-white">
              Состояние модулей
            </h2>
            <div className="mt-4 space-y-4">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <div key={module.name} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-surface-400" />
                        <span className="text-sm font-medium text-surface-700 dark:text-surface-200">
                          {module.name}
                        </span>
                      </div>
                      <Badge variant={module.status === "online" ? "success" : "warning"} dot>
                        {module.status === "online" ? "Онлайн" : "Проверить"}
                      </Badge>
                    </div>
                    <ProgressBar
                      value={module.value}
                      color={module.status === "online" ? "success" : "warning"}
                    />
                  </div>
                );
              })}
            </div>
          </Card>

          <Link
            href="/admin/learning"
            className="group block rounded-2xl border border-surface-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md dark:border-surface-700 dark:bg-surface-800 dark:hover:border-brand-500/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-surface-900 dark:text-white">
                  База знаний
                </h2>
                <p className="mt-0.5 text-xs text-surface-500">
                  Редактор статей раздела «Обучение»
                </p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-surface-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
            </div>
          </Link>

          <Card>
            <h2 className="text-sm font-semibold text-surface-900 dark:text-white">
              Быстрые действия
            </h2>
            <div className="mt-4 grid gap-2">
              {[
                "Создать роль",
                "Проверить права",
                "Экспорт пользователей",
                "Открыть журнал действий",
              ].map((action) => (
                <button
                  key={action}
                  type="button"
                  className="rounded-lg border border-surface-200 px-3 py-2 text-left text-sm text-surface-700 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-700"
                >
                  {action}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-sm text-surface-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
          {value}
        </p>
      </div>
      <div className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
        <Icon className="h-5 w-5" />
      </div>
    </Card>
  );
}
