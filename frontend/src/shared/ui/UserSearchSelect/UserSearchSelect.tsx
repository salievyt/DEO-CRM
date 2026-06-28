"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { authApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";

interface Employee {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  role_name: string | null;
}

interface UserSearchSelectProps {
  value: string;
  onChange: (id: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

const roleLabels: Record<string, string> = {
  superadmin: "Супер-админ",
  owner: "Владелец",
  project_manager: "Проджект-менеджер",
  developer: "Разработчик",
  designer: "Дизайнер",
  marketer: "Маркетолог",
};

export function UserSearchSelect({
  value,
  onChange,
  error,
  label = "Исполнитель",
  required = false,
  placeholder = "Поиск сотрудника...",
}: UserSearchSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: users } = useQuery({
    queryKey: [QUERY_KEYS.USERS],
    queryFn: () => authApi.users.list(),
    select: (res): Employee[] => res.data?.results || (res.data as Employee[]),
  });

  // Only show active users (employees, not clients)
  const employees = (users || []).filter(
    (u) => u.role_name?.toLowerCase() !== "client"
  );

  const selectedUser = employees.find((u) => u.id === value);

  const filtered = search
    ? employees.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
          u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : employees;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  const handleSelect = (userId: string) => {
    onChange(userId);
    setSearch("");
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setSearch("");
  };

  const getInitials = (u: Employee) => {
    const first = u.first_name?.[0] || "";
    const last = u.last_name?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">
          {label}
          {required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}
      {selectedUser ? (
        <div className="flex items-center justify-between rounded-xl border border-surface-300 bg-surface-50 px-3 py-2.5 dark:border-surface-600 dark:bg-surface-800">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 flex-shrink-0">
              {getInitials(selectedUser)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                {selectedUser.full_name || selectedUser.email}
              </p>
              <p className="text-xs text-surface-500 truncate">
                {roleLabels[selectedUser.role_name?.toLowerCase() || ""] || selectedUser.role_name || "Сотрудник"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 rounded-lg p-1 text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="input pl-10"
          />
          {open && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto rounded-xl border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-800">
              {filtered.length === 0 ? (
                <p className="p-3 text-sm text-surface-400 text-center">
                  {!users
                    ? "Загрузка сотрудников..."
                    : "Сотрудники не найдены"}
                </p>
              ) : (
                filtered.slice(0, 20).map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelect(user.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-700"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 flex-shrink-0">
                      {getInitials(user)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                        {user.full_name || user.email}
                      </p>
                      <p className="text-xs text-surface-500 truncate">
                        {roleLabels[user.role_name?.toLowerCase() || ""] || "Сотрудник"}
                        <span className="mx-1">·</span>
                        {user.email}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
      {error && (
        <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
      )}
    </div>
  );
}
