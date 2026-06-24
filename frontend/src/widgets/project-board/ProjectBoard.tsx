"use client";

import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { FolderKanban } from "lucide-react";
import type { Project } from "@/entities/project/types";

interface ProjectBoardProps {
  limit?: number;
}

export function ProjectBoard({ limit }: ProjectBoardProps) {
  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.PROJECTS],
    queryFn: () => projectsApi.list(),
    select: (res) => res.data?.results as Project[],
  });

  const projects = limit ? (data || []).slice(0, limit) : (data || []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<FolderKanban className="h-12 w-12" />}
        title="Нет проектов"
        description="Проекты пока не созданы"
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <a key={project.id} href={`/projects/${project.id}`} className="block">
          <Card className="transition-all hover:shadow-md h-full">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-surface-900 dark:text-white truncate">
                  {project.name}
                </h3>
                <p className="text-sm text-surface-500 truncate">{project.client_name}</p>
              </div>
              <StatusBadge status={project.status_name} className="ml-2 flex-shrink-0" />
            </div>

            {project.progress !== undefined && (
              <div className="mt-4">
                <ProgressBar value={project.progress} size="sm" showLabel />
              </div>
            )}

            <div className="mt-4 flex items-center justify-between text-sm text-surface-500">
              {project.budget && (
                <span>{formatCurrency(project.budget)}</span>
              )}
              {project.deadline && (
                <span>До {formatDate(project.deadline)}</span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-3 text-xs text-surface-400">
              <span>Команда: {project.team_count || 0}</span>
              <span>•</span>
              <span>Задачи: {project.task_count || 0}</span>
            </div>
          </Card>
        </a>
      ))}
    </div>
  );
}
