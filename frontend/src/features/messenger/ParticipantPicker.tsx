"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";
import { authApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Avatar } from "@/shared/ui/Avatar";
import { cn } from "@/shared/utils/cn";

interface Employee {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar?: string | null;
  role_name: string | null;
}

interface ParticipantPickerProps {
  value: string[];
  onChange: (_ids: string[]) => void;
  excludeIds?: string[];
  label?: string;
}

export function ParticipantPicker({
  value,
  onChange,
  excludeIds = [],
  label = "Участники",
}: ParticipantPickerProps) {
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.USERS],
    queryFn: () => authApi.users.list(),
    select: (res): Employee[] => res.data?.results || (res.data as Employee[]),
  });

  const excluded = new Set(excludeIds);
  const employees = (users || []).filter(
    (u) => u.role_name?.toLowerCase() !== "client" && !excluded.has(u.id)
  );

  const filtered = search
    ? employees.filter((u) =>
        [u.full_name, u.first_name, u.last_name, u.email]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(search.toLowerCase()))
      )
    : employees;

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">
        {label}
        {value.length > 0 && (
          <span className="ml-2 text-xs text-surface-400">выбрано: {value.length}</span>
        )}
      </label>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск сотрудника..."
          className="input pl-10"
        />
      </div>

      <div className="max-h-60 overflow-y-auto rounded-xl border border-surface-200 dark:border-surface-700">
        {isLoading ? (
          <p className="p-3 text-center text-sm text-surface-400">Загрузка...</p>
        ) : filtered.length === 0 ? (
          <p className="p-3 text-center text-sm text-surface-400">
            Сотрудники не найдены
          </p>
        ) : (
          filtered.slice(0, 50).map((user) => {
            const selected = value.includes(user.id);
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => toggle(user.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-surface-100 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700/50",
                  selected && "bg-brand-50 dark:bg-brand-900/20"
                )}
              >
                <Avatar
                  src={user.avatar}
                  firstName={user.first_name}
                  lastName={user.last_name}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                    {user.full_name || user.email}
                  </p>
                  <p className="truncate text-xs text-surface-500">{user.email}</p>
                </div>
                <span
                  className={cn(
                    "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border",
                    selected
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-surface-300 dark:border-surface-600"
                  )}
                >
                  {selected && <Check className="h-3.5 w-3.5" />}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
