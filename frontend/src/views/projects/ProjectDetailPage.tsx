"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Users,
  CheckSquare,
  Clock,
  Pencil,
  Plus,
  Search,
  X,
  Trash2,
  UserPlus,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { projectsApi, tasksApi, authApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDate, formatCurrency } from "@/shared/utils/formatters";
import type { Project } from "@/entities/project/types";
import type { Task } from "@/entities/task/types";

const ROLE_LABELS: Record<string, string> = {
  pm: "Project Manager",
  developer: "Разработчик",
  designer: "Дизайнер",
  tester: "Тестировщик",
  marketer: "Маркетолог",
  seo: "SEO специалист",
};

// User search combobox for adding team members
function UserSearchSelect({
  users,
  value,
  onChange,
}: {
  users: { id: string; full_name: string; email: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = search
    ? users.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : users;

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

  const selectedUser = users.find((u) => u.id === value);

  return (
    <div className="relative" ref={containerRef}>
      {selectedUser ? (
        <div className="flex items-center justify-between rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 dark:border-surface-600 dark:bg-surface-800">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
              {selectedUser.full_name}
            </p>
            <p className="text-xs text-surface-500 truncate">{selectedUser.email}</p>
          </div>
          <button
            type="button"
            onClick={() => { onChange(""); setSearch(""); }}
            className="ml-2 rounded p-1 text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Поиск сотрудника..."
            className="input pl-8 py-2 text-sm"
          />
          {open && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-lg border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-800">
              {filtered.length === 0 ? (
                <p className="p-2 text-xs text-surface-400 text-center">Ничего не найдено</p>
              ) : (
                filtered.slice(0, 15).map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => { onChange(user.id); setSearch(""); setOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-50 dark:hover:bg-surface-700"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[10px] font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 flex-shrink-0">
                      {(user.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                        {user.full_name}
                      </p>
                      <p className="text-[11px] text-surface-400 truncate">{user.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const id = params?.id ?? "";

  // State for add member form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("developer");

  const { data: project, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.PROJECT, id],
    queryFn: () => projectsApi.get(id),
    select: (res) => res.data as Project,
    enabled: !!id,
  });

  const { data: teamMembers, isLoading: teamLoading } = useQuery({
    queryKey: [QUERY_KEYS.PROJECT_TEAM, id],
    queryFn: () => projectsApi.team.list(id),
    select: (res) => res.data?.results || res.data || [],
    enabled: !!id,
  });

  const { data: tasks } = useQuery({
    queryKey: [QUERY_KEYS.TASKS, "project", id],
    queryFn: () => tasksApi.list({ project: id }),
    select: (res) => (res.data?.results || []) as Task[],
    enabled: !!id,
  });

  const { data: allUsers } = useQuery({
    queryKey: [QUERY_KEYS.USERS],
    queryFn: () => authApi.users.list(),
    select: (res) => (res.data?.results || res.data || []) as { id: string; full_name: string; email: string }[],
    enabled: showAddForm,
  });

  const members: any[] = Array.isArray(teamMembers) ? teamMembers : [];
  const users = (allUsers || []) as { id: string; full_name: string; email: string }[];
  // Filter out already added members
  const availableUsers = users.filter(
    (u) => !members.some((m: any) => m.user === u.id)
  );

  // Add member mutation
  const [addError, setAddError] = useState("");
  const addMemberMutation = useMutation({
    mutationFn: () =>
      projectsApi.team.add(id, { user: newMemberUserId, role_in_project: newMemberRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECT_TEAM, id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECT, id] });
      setShowAddForm(false);
      setNewMemberUserId("");
      setNewMemberRole("developer");
      setAddError("");
    },
    onError: () => {
      setAddError("Не удалось добавить участника. Возможно, он уже в команде.");
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.team.remove(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECT_TEAM, id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROJECT, id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-surface-500">Проект не найден</p>
        <Link href="/projects" className="btn-secondary mt-4">
          ← Назад к проектам
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к проектам
      </Link>

      <PageHeader
        title={project.name}
        description={project.client_name}
        actions={
          <Link href={`/projects/${id}/edit`}>
            <Button variant="secondary">
              <Pencil className="h-4 w-4" />
              Редактировать
            </Button>
          </Link>
        }
      />

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center gap-2 text-brand-600">
            <DollarSign className="h-5 w-5" />
            <span className="text-sm font-medium">Бюджет</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {project.budget ? formatCurrency(project.budget) : "—"}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-purple-600">
            <Calendar className="h-5 w-5" />
            <span className="text-sm font-medium">Срок</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {project.deadline ? formatDate(project.deadline) : "—"}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-success-600">
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium">Команда</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {members.length}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-warning-600">
            <CheckSquare className="h-5 w-5" />
            <span className="text-sm font-medium">Задачи</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {tasks?.length || project.task_count}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
              Описание проекта
            </h3>
            {project.description ? (
              <p className="mt-2 text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
                {project.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-surface-400 italic">Нет описания</p>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
              Прогресс
            </h3>
            <div className="mt-3">
              <ProgressBar
                value={project.progress}
                size="lg"
                color={project.progress === 100 ? "success" : "brand"}
                showLabel
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <StatusBadge status={project.status_name} />
              {project.service_type && (
                <Badge variant="default">{project.service_type}</Badge>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
                Задачи проекта
              </h3>
              <span className="text-xs text-surface-400">
                {tasks?.filter((t: Task) => t.status_name?.toLowerCase() === "выполнена").length || 0}/{tasks?.length || 0} выполнено
              </span>
            </div>
            {tasks && tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map((task: Task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border border-surface-100 p-3 dark:border-surface-700"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <StatusBadge status={task.status_name} />
                      <span className="truncate text-sm font-medium text-surface-900 dark:text-white">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-surface-500 ml-3">
                      {task.assignee_name && (
                        <span className="truncate max-w-[120px]">{task.assignee_name}</span>
                      )}
                      {task.deadline && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(task.deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-surface-400">Нет задач</p>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Team — с возможностью добавления/удаления */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
                Команда проекта
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>

            {/* Add member form */}
            {showAddForm && (
              <div className="mb-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-700/50 space-y-2">
                <p className="text-xs font-medium text-surface-600 dark:text-surface-300">
                  Добавить участника
                </p>
                <UserSearchSelect
                  users={availableUsers}
                  value={newMemberUserId}
                  onChange={setNewMemberUserId}
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="input py-1.5 text-sm"
                >
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                {addError && (
                  <p className="text-xs text-danger-600 dark:text-red-400">{addError}</p>
                )}
                <div className="flex justify-end gap-1.5 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setShowAddForm(false); setNewMemberUserId(""); setAddError(""); }}
                  >
                    Отмена
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => addMemberMutation.mutate()}
                    loading={addMemberMutation.isPending}
                    disabled={!newMemberUserId}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Добавить
                  </Button>
                </div>
              </div>
            )}

            {/* Members list */}
            <div className="space-y-2">
              {teamLoading ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : members.length > 0 ? (
                members.map((member: any) => (
                  <div
                    key={member.id}
                    className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-50 dark:hover:bg-surface-700/50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 flex-shrink-0 dark:bg-brand-900/30 dark:text-brand-400">
                      {(member.user_name || "U")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                        {member.user_name}
                      </p>
                      <p className="text-xs text-surface-500">
                        {ROLE_LABELS[member.role_in_project] || member.role_in_project}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Удалить ${member.user_name} из команды?`)) {
                          removeMemberMutation.mutate(member.user);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 rounded p-1 text-surface-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-red-900/20 transition-all"
                      title="Удалить из команды"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-surface-400 text-center py-2">
                  Нет участников
                </p>
              )}
            </div>
          </Card>

          {/* Timeline */}
          <Card>
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
              Даты
            </h3>
            <div className="mt-3 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Создан</span>
                <span className="font-medium">{formatDate(project.created_at)}</span>
              </div>
              {project.deadline && (
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Дедлайн</span>
                  <span className="font-medium">{formatDate(project.deadline)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Обновлён</span>
                <span className="font-medium">{formatDate(project.updated_at)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
