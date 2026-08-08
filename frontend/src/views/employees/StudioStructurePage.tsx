"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  UserCircle,
  Search,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Plus,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { structureApi } from "@/shared/api/base";
import { cn } from "@/shared/utils/formatters";

// ---- Types ----

interface TeamStats {
  total_teams: number;
  total_members: number;
  total_heads: number;
  by_type: Record<string, number>;
}

interface TreeTeam {
  id: string;
  name: string;
  team_type: "department" | "team" | "group";
  color: string;
  description: string;
  head_name: string | null;
  member_count: number;
  children: TreeTeam[];
}

interface Member {
  id: string;
  team: string;
  user: string;
  user_name: string;
  user_email: string;
  user_role: string | null;
  role: "head" | "deputy" | "member" | "trainee";
  position: string;
  is_active: boolean;
}

interface TeamDetail {
  id: string;
  name: string;
  description: string;
  team_type: string;
  color: string;
  head_name: string | null;
  parent_name: string | null;
  member_count: number;
  children_count: number;
  members: Member[];
}

// ---- Role helpers ----

const membershipRoleConfig: Record<string, { label: string; variant: "danger" | "warning" | "default" | "success" }> = {
  head: { label: "Руководитель", variant: "danger" },
  deputy: { label: "Заместитель", variant: "warning" },
  member: { label: "Участник", variant: "default" },
  trainee: { label: "Стажёр", variant: "success" },
};

const typeLabels: Record<string, string> = {
  department: "Отдел",
  team: "Команда",
  group: "Группа",
};

const typeIcons: Record<string, typeof Building2> = {
  department: Building2,
  team: Users,
  group: UserCircle,
};

// ---- Main Component ----

export function StudioStructurePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTeams, setExpandedTeams] = useState<string[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["structure-stats"],
    queryFn: () => structureApi.teams.stats(),
    select: (res) => res.data as TeamStats,
  });

  const { data: tree, isLoading: treeLoading } = useQuery({
    queryKey: ["structure-tree"],
    queryFn: () => structureApi.teams.tree(),
    select: (res) => res.data as TreeTeam[],
  });

  const { data: teamDetail } = useQuery({
    queryKey: ["structure-team", selectedTeamId],
    queryFn: () => structureApi.teams.get(selectedTeamId!),
    select: (res) => res.data as TeamDetail,
    enabled: !!selectedTeamId,
  });

  const toggleTeam = (id: string) => {
    setExpandedTeams((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  // Auto-expand root teams on first load
  const autoExpanded = useRef(false);
  useEffect(() => {
    if (tree && tree.length > 0 && !autoExpanded.current) {
      autoExpanded.current = true;
      setExpandedTeams(tree.map((t) => t.id));
    }
  }, [tree]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Структура студии"
        description="Организационная структура, команды и позиционирование по проектам"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по командам..."
                className="input pl-10 w-64"
              />
            </div>
            <Button>
              <Plus className="h-4 w-4" />
              Добавить команду
            </Button>
          </div>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500">Подразделений</p>
              <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
                {stats.total_teams}
              </p>
            </div>
            <div className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
              <Building2 className="h-5 w-5" />
            </div>
          </Card>
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500">Сотрудников</p>
              <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
                {stats.total_members}
              </p>
            </div>
            <div className="rounded-lg bg-success-50 p-2 text-success-600 dark:bg-green-900/20 dark:text-green-400">
              <Users className="h-5 w-5" />
            </div>
          </Card>
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500">Руководителей</p>
              <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
                {stats.total_heads}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
              <UserCheck className="h-5 w-5" />
            </div>
          </Card>
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500">Типов команд</p>
              <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
                {Object.keys(stats.by_type || {}).length}
              </p>
            </div>
            <div className="rounded-lg bg-surface-100 p-2 text-surface-600 dark:bg-surface-700 dark:text-surface-300">
              <FolderTree className="h-5 w-5" />
            </div>
          </Card>
        </div>
      )}

      {/* Main layout */}
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        {/* Org Tree */}
        <Card padding="none">
          <div className="border-b border-surface-200 px-4 py-3 dark:border-surface-700">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
              <FolderTree className="h-4 w-4 text-brand-500" />
              Организационное дерево
            </h2>
          </div>
          <div className="p-4">
            {treeLoading ? (
              <div className="flex h-48 items-center justify-center">
                <LoadingSpinner size="lg" />
              </div>
            ) : tree && tree.length > 0 ? (
              <div className="space-y-1">
                {tree
                  .filter(filterNode(searchQuery))
                  .map((node) => (
                    <TreeNode
                      key={node.id}
                      node={node}
                      expandedTeams={expandedTeams}
                      onToggle={toggleTeam}
                      selectedTeamId={selectedTeamId}
                      onSelect={setSelectedTeamId}
                      searchQuery={searchQuery}
                      depth={0}
                    />
                  ))}
              </div>
            ) : (
              <EmptyState
                title="Нет подразделений"
                description="Создайте структуру студии"
              />
            )}
          </div>
        </Card>

        {/* Team Detail Panel */}
        <div className="space-y-4">
          {selectedTeamId && teamDetail ? (
            <>
              <Card>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: teamDetail.color + "20" }}
                    >                          <div
                            className="flex h-6 w-6 items-center justify-center"
                            style={{ color: teamDetail.color }}
                          >
                            <FolderTree className="h-6 w-6" />
                          </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-900 dark:text-white">
                        {teamDetail.name}
                      </h3>
                      <Badge variant="default">{typeLabels[teamDetail.team_type] || teamDetail.team_type}</Badge>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm">
                    <Plus className="h-3.5 w-3.5" />
                    Добавить
                  </Button>
                </div>

                {teamDetail.description && (
                  <p className="mt-3 text-sm text-surface-500">{teamDetail.description}</p>
                )}

                <div className="mt-4 flex items-center gap-4 text-xs text-surface-500">
                  {teamDetail.head_name && (
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5" />
                      Руководитель: {teamDetail.head_name}
                    </span>
                  )}
                  {teamDetail.parent_name && (
                    <span className="flex items-center gap-1">
                      <FolderTree className="h-3.5 w-3.5" />
                      Входит в: {teamDetail.parent_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {teamDetail.member_count} чел.
                  </span>
                </div>
              </Card>

              {/* Team Members */}
              <Card padding="none">
                <div className="border-b border-surface-200 px-4 py-3 dark:border-surface-700">
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-white">
                    Участники команды
                  </h3>
                </div>
                {teamDetail.members && teamDetail.members.length > 0 ? (
                  <div className="divide-y divide-surface-100 dark:divide-surface-700">
                    {teamDetail.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                            {(member.user_name?.[0] || "?").toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-surface-900 dark:text-white">
                              {member.user_name}
                            </p>
                            <p className="text-xs text-surface-500">
                              {member.position || member.user_email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={membershipRoleConfig[member.role]?.variant || "default"}>
                            {membershipRoleConfig[member.role]?.label || member.role}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4">
                    <EmptyState title="Нет участников" description="Добавьте участников в команду" />
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card>
              <div className="flex flex-col items-center py-12 text-center">
                <FolderTree className="mb-3 h-10 w-10 text-surface-300" />
                <h3 className="text-sm font-medium text-surface-500">
                  Выберите подразделение
                </h3>
                <p className="mt-1 text-xs text-surface-400">
                  Нажмите на команду в дереве, чтобы увидеть детали
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Tree helpers ----

function filterNode(search: string) {
  return function filterFn(node: TreeTeam): boolean {
    const matches =
      !search ||
      node.name.toLowerCase().includes(search.toLowerCase()) ||
      (node.head_name || "").toLowerCase().includes(search.toLowerCase());
    const hasMatchingChildren = node.children ? node.children.some(filterNode(search)) : false;
    return matches || hasMatchingChildren;
  };
}

// Recursive tree node component
function TreeNode({
  node,
  expandedTeams,
  onToggle,
  selectedTeamId,
  onSelect,
  searchQuery,
  depth,
}: {
  node: TreeTeam;
  expandedTeams: string[];
  onToggle: (id: string) => void;
  selectedTeamId: string | null;
  onSelect: (id: string | null) => void;
  searchQuery: string;
  depth: number;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedTeams.includes(node.id);
  const isSelected = selectedTeamId === node.id;
  const TypeIcon = typeIcons[node.team_type] || Building2;
  const matchesSearch =
    !searchQuery ||
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (node.head_name || "").toLowerCase().includes(searchQuery.toLowerCase());

  const visibleChildren = hasChildren
    ? node.children.filter(filterNode(searchQuery))
    : [];

  if (!matchesSearch && visibleChildren.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) onToggle(node.id);
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
          isSelected
            ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200 dark:bg-brand-900/20 dark:text-brand-300 dark:ring-brand-800"
            : "text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-800/50"
        )}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {/* Expand/collapse */}
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-surface-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-surface-400" />
          )
        ) : (
          <span className="w-3.5" />
        )}

        {/* Icon with color */}
        <TypeIcon
          className="h-4 w-4 flex-shrink-0"
          style={{ color: node.color }}
        />

        {/* Name */}
        <span className="flex-1 truncate font-medium">{node.name}</span>

        {/* Head name */}
        {node.head_name && (
          <span className="hidden truncate text-xs text-surface-400 sm:block max-w-[120px]">
            {node.head_name}
          </span>
        )}

        {/* Member count badge */}
        {node.member_count > 0 && (
          <Badge variant="default" className="text-[10px] flex-shrink-0">
            {node.member_count}
          </Badge>
        )}
      </button>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {visibleChildren.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              expandedTeams={expandedTeams}
              onToggle={onToggle}
              selectedTeamId={selectedTeamId}
              onSelect={onSelect}
              searchQuery={searchQuery}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
