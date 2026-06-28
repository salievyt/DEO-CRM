"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCog,
  UserCheck,
  CalendarDays,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { DataTable } from "@/shared/ui/Table";
import { Avatar } from "@/shared/ui/Avatar";
import { authApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDate } from "@/shared/utils/formatters";
import type { ColumnDef } from "@tanstack/react-table";

type Employee = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  role_name: string | null;
  is_active: boolean;
  is_2fa_enabled: boolean;
  last_login: string | null;
  date_joined: string;
};

export function EmployeesPage() {
  const { data: employees, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.USERS],
    queryFn: () => authApi.users.list(),
    select: (res): Employee[] => res.data?.results || (res.data as Employee[]),
  });

  const totalCount = employees?.length || 0;
  const activeCount = employees?.filter((e) => e.is_active).length || 0;

  // Group by role for stats
  const roleGroups =
    employees?.reduce<Record<string, number>>((acc, emp) => {
      const role = emp.role_name || "Без роли";
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {}) || {};

  const roleStats = Object.entries(roleGroups).sort((a, b) => b[1] - a[1]);

  const roleVariant = (role: string | null) => {
    const r = role?.toLowerCase() || "";
    if (["superadmin", "owner"].includes(r)) return "danger" as const;
    if (["project_manager"].includes(r)) return "default" as const;
    if (["developer", "designer"].includes(r)) return "success" as const;
    if (["marketer"].includes(r)) return "warning" as const;
    return "default" as const;
  };

  const roleLabels: Record<string, string> = {
    superadmin: "Супер-админ",
    owner: "Владелец",
    project_manager: "Проджект-менеджер",
    developer: "Разработчик",
    designer: "Дизайнер",
    marketer: "Маркетолог",
    client: "Клиент",
  };

  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "full_name",
      header: "Сотрудник",
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
        <Badge variant={roleVariant(row.original.role_name)}>
          {roleLabels[row.original.role_name?.toLowerCase() || ""] ||
            row.original.role_name ||
            "Без роли"}
        </Badge>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Статус",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              row.original.is_active
                ? "bg-success-500 shadow-sm shadow-success-500/50"
                : "bg-surface-300 dark:bg-surface-600"
            }`}
          />
          <span className="text-sm text-surface-600 dark:text-surface-400">
            {row.original.is_active ? "Активен" : "Отключен"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "date_joined",
      header: "Добавлен",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm text-surface-500">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(row.original.date_joined)}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Сотрудники студии"
        description="Управление командой: роли, доступы и статусы"
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Пригласить сотрудника
          </Button>
        }
      />

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-sm text-surface-500">Всего сотрудников</p>
            <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
              {totalCount}
            </p>
          </div>
          <div className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-sm text-surface-500">Активных</p>
            <p className="mt-1 text-2xl font-bold text-success-600 dark:text-success-400">
              {activeCount}
            </p>
          </div>
          <div className="rounded-lg bg-success-50 p-2 text-success-600 dark:bg-green-900/20 dark:text-green-400">
            <UserCheck className="h-5 w-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-sm text-surface-500">Неактивных</p>
            <p className="mt-1 text-2xl font-bold text-surface-400">
              {totalCount - activeCount}
            </p>
          </div>
          <div className="rounded-lg bg-surface-100 p-2 text-surface-400 dark:bg-surface-800 dark:text-surface-500">
            <UserCog className="h-5 w-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-sm text-surface-500">Ролей в системе</p>
            <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
              {roleStats.length}
            </p>
          </div>
          <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300">
            <Users className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Team roles breakdown */}
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        {/* Employees table */}
        <Card padding="none">
          <div className="border-b border-surface-200 px-4 py-3 dark:border-surface-700">
            <h2 className="text-sm font-semibold text-surface-900 dark:text-white">
              Команда
            </h2>
            <p className="mt-1 text-xs text-surface-500">
              {totalCount} человек в команде студии
            </p>
          </div>
          <div className="p-4">
            <DataTable
              data={employees || []}
              columns={columns}
              loading={isLoading}
              searchable
              searchPlaceholder="Поиск по сотрудникам..."
            />
          </div>
        </Card>

        {/* Roles distribution */}
        <Card>
          <h2 className="text-sm font-semibold text-surface-900 dark:text-white">
            Распределение по ролям
          </h2>
          <div className="mt-4 space-y-3">
            {roleStats.map(([role, count]) => {
              const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              return (
                <div key={role} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-surface-700 dark:text-surface-200">
                      {roleLabels[role.toLowerCase()] || role}
                    </span>
                    <span className="text-surface-400">
                      {count} <span className="text-xs">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {roleStats.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <Users className="mb-2 h-8 w-8 text-surface-300" />
              <p className="text-sm text-surface-500">Нет данных</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
