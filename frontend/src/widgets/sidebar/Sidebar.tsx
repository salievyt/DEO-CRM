"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { useAuth } from "@/hooks/useAuth";
import { useSettingsStore } from "@/shared/store/settingsStore";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  FolderKanban,
  CheckSquare,
  DollarSign,
  FileText,
  MessageSquare,
  Bot,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
} from "lucide-react";

const navigation = [
  { name: "Дашборд", href: "/dashboard", icon: LayoutDashboard },
  { name: "Клиенты", href: "/clients", icon: Users },
  { name: "Лиды", href: "/leads", icon: TrendingUp },
  { name: "Проекты", href: "/projects", icon: FolderKanban },
  { name: "Задачи", href: "/tasks", icon: CheckSquare },
  { name: "Финансы", href: "/finance", icon: DollarSign },
  { name: "Документы", href: "/documents", icon: FileText },
  { name: "Мессенджер", href: "/messenger", icon: MessageSquare },
  { name: "DEO AI", href: "/ai", icon: Bot },
  { name: "Аналитика", href: "/analytics", icon: BarChart3 },
];

interface SidebarProps {
  onNavClick?: () => void;
}

export function Sidebar({ onNavClick }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { sidebarCollapsed, setSidebarCollapsed } = useSettingsStore();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-surface-200 bg-white transition-all duration-300 dark:border-surface-700 dark:bg-surface-800",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex h-16 items-center border-b border-surface-200 dark:border-surface-700",
        sidebarCollapsed ? "justify-center px-2" : "gap-2 px-6"
      )}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          D
        </div>
        {!sidebarCollapsed && (
          <span className="text-lg font-semibold text-surface-900 dark:text-white">
            DEO CRM
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 rounded-lg transition-colors",
                sidebarCollapsed ? "justify-center px-2 py-2" : "px-3 py-2",
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                  : "text-surface-600 hover:bg-surface-50 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-50"
              )}
              title={sidebarCollapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium truncate">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="mx-3 mb-2 flex items-center justify-center rounded-lg p-2 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700"
      >
        <ChevronLeft className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
      </button>

      {/* Bottom actions */}
      <div className="border-t border-surface-200 p-3 dark:border-surface-700">
        <Link
          href="/settings"
          onClick={onNavClick}
          className={cn(
            "flex items-center gap-3 rounded-lg transition-colors text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-700",
            sidebarCollapsed ? "justify-center px-2 py-2" : "px-3 py-2"
          )}
          title={sidebarCollapsed ? "Настройки" : undefined}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!sidebarCollapsed && <span className="text-sm font-medium">Настройки</span>}
        </Link>
        <button
          onClick={logout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg transition-colors text-danger-600 hover:bg-danger-50 dark:hover:bg-red-900/20",
            sidebarCollapsed ? "justify-center px-2 py-2" : "px-3 py-2"
          )}
          title={sidebarCollapsed ? "Выйти" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!sidebarCollapsed && <span className="text-sm font-medium">Выйти</span>}
        </button>
      </div>
    </aside>
  );
}
