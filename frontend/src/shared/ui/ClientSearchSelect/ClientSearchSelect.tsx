"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import type { Client } from "@/entities/client/types";

interface ClientSearchSelectProps {
  clients: Client[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}

export function ClientSearchSelect({
  clients,
  value,
  onChange,
  error,
}: ClientSearchSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedClient = clients.find((c) => c.id === value);

  const filtered = search
    ? clients.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.phone?.includes(search) ||
          c.email?.toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  // Закрываем дропдаун при клике вне компонента
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    // Используем setTimeout чтобы не поймать текущий клик, открывший дропдаун
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  const handleSelect = (clientId: string) => {
    onChange(clientId);
    setSearch("");
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setSearch("");
  };

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">
        Клиент <span className="text-danger-500">*</span>
      </label>
      {selectedClient ? (
        <div className="flex items-center justify-between rounded-xl border border-surface-300 bg-surface-50 px-3 py-2.5 dark:border-surface-600 dark:bg-surface-800">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
              {selectedClient.full_name}
            </p>
            {selectedClient.company_name && (
              <p className="text-xs text-surface-500">{selectedClient.company_name}</p>
            )}
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
            placeholder="Поиск клиента по имени, компании, телефону..."
            className="input pl-10"
          />
          {open && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto rounded-xl border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-800">
              {filtered.length === 0 ? (
                <p className="p-3 text-sm text-surface-400 text-center">
                  {clients.length === 0
                    ? "Загрузка клиентов..."
                    : "Клиенты не найдены"}
                </p>
              ) : (
                filtered.slice(0, 20).map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelect(client.id)}
                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-700"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 flex-shrink-0">
                      {(client.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                        {client.full_name}
                      </p>
                      <p className="text-xs text-surface-500 truncate">
                        {client.company_name || client.phone || client.email}
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
