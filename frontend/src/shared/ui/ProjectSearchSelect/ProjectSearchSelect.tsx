"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, FolderKanban } from "lucide-react";
import { projectsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import type { Project } from "@/entities/project/types";

interface ProjectSearchSelectProps {
  value: string;
  onChange: (id: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
}

export function ProjectSearchSelect({
  value,
  onChange,
  error,
  label = "Проект",
  required = false,
}: ProjectSearchSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: projects } = useQuery({
    queryKey: [QUERY_KEYS.PROJECTS],
    queryFn: () => projectsApi.list(),
    select: (res): Project[] => res.data?.results || (res.data as Project[]),
  });

  const selectedProject = projects?.find((p) => p.id === value);

  const filtered = search
    ? (projects || []).filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.client_name?.toLowerCase().includes(search.toLowerCase())
      )
    : projects || [];

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

  const handleSelect = (projectId: string) => {
    onChange(projectId);
    setSearch("");
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setSearch("");
  };

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">
          {label}
          {required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}
      {selectedProject ? (
        <div className="flex items-center justify-between rounded-xl border border-surface-300 bg-surface-50 px-3 py-2.5 dark:border-surface-600 dark:bg-surface-800">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
              {selectedProject.name}
            </p>
            {selectedProject.client_name && (
              <p className="text-xs text-surface-500">{selectedProject.client_name}</p>
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
            placeholder="Поиск проекта..."
            className="input pl-10"
          />
          {open && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto rounded-xl border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-800">
              {filtered.length === 0 ? (
                <p className="p-3 text-sm text-surface-400 text-center">
                  {!projects
                    ? "Загрузка проектов..."
                    : "Проекты не найдены"}
                </p>
              ) : (
                filtered.slice(0, 20).map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleSelect(project.id)}
                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-700"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 flex-shrink-0">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-surface-500 truncate">
                        {project.client_name || project.status_name}
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
