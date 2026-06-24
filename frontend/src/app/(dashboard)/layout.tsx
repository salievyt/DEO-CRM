"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/features/auth/AuthGuard";
import { cn } from "@/lib/utils";
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
  Menu,
  X,
  Bell,
  Search,
} from "lucide-react";

const ALL_NAV_ITEMS = [
  { name: "Дашборд", href: "/dashboard", icon: LayoutDashboard, roles: ["superadmin", "owner", "project_manager", "developer", "designer", "marketer"] },
  { name: "Клиенты", href: "/clients", icon: Users, roles: ["superadmin", "owner", "project_manager", "marketer"] },
  { name: "Лиды", href: "/leads", icon: TrendingUp, roles: ["superadmin", "owner", "project_manager", "marketer"] },
  { name: "Проекты", href: "/projects", icon: FolderKanban, roles: ["superadmin", "owner", "project_manager", "developer", "designer"] },
  { name: "Задачи", href: "/tasks", icon: CheckSquare, roles: ["superadmin", "owner", "project_manager", "developer", "designer", "marketer"] },
  { name: "Финансы", href: "/finance", icon: DollarSign, roles: ["superadmin", "owner", "project_manager"] },
  { name: "Документы", href: "/documents", icon: FileText, roles: ["superadmin", "owner", "project_manager", "developer", "designer", "marketer", "client"] },
  { name: "Мессенджер", href: "/messenger", icon: MessageSquare, roles: ["superadmin", "owner", "project_manager", "developer", "designer", "marketer", "client"] },
  { name: "DEO AI", href: "/ai", icon: Bot, roles: ["superadmin", "owner", "project_manager", "developer", "designer", "marketer"] },
  { name: "Аналитика", href: "/analytics", icon: BarChart3, roles: ["superadmin", "owner", "project_manager", "marketer"] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Filter navigation by user role
  const userRole = user?.role_name?.toLowerCase() || "client";
  const navigation = ALL_NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
    <div className="flex h-screen overflow-hidden bg-surface-50 text-surface-900 dark:bg-surface-900 dark:text-surface-50">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[86vw] flex-col border-r border-surface-200 bg-white shadow-xl transition-transform duration-300 dark:border-surface-700 dark:bg-surface-800 lg:static lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex h-16 items-center gap-3 border-b border-surface-200 px-5 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700/60"
          onClick={() => setSidebarOpen(false)}
        >
          <Image
            src="/images/DEO_CRM_LOGO.svg"
            alt="DEO CRM"
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-surface-900 dark:text-white">
              DEO CRM
            </p>
            <p className="truncate text-xs text-surface-500">
              Рабочее пространство
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/20 dark:text-brand-300 dark:ring-brand-900/40"
                    : "text-surface-600 hover:bg-surface-50 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-50"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Settings & Logout */}
        <div className="border-t border-surface-200 p-3 dark:border-surface-700">
          <Link
            href="/settings"
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === "/settings"
                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                : "text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-700"
            )}
            onClick={() => setSidebarOpen(false)}
          >
            <Settings className="h-5 w-5" />
            Настройки
          </Link>
          <button
            onClick={logout}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-50 dark:hover:bg-red-900/20"
          >
            <LogOut className="h-5 w-5" />
            Выйти
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center gap-4 border-b border-surface-200 bg-white px-4 dark:border-surface-700 dark:bg-surface-800">
          <button
            className="rounded-lg p-2 text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700 lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Закрыть меню" : "Открыть меню"}
          >
            {sidebarOpen ? (
              <X className="h-6 w-6 text-surface-600" />
            ) : (
              <Menu className="h-6 w-6 text-surface-600" />
            )}
          </button>

          <div className="relative hidden flex-1 sm:block sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Поиск..."
              className="input pl-10"
            />
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              className="relative rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700"
              aria-label="Уведомления"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger-500" />
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">
                {(user?.first_name?.[0] || user?.email?.[0] || "D").toUpperCase()}
                {user?.last_name?.[0]?.toUpperCase() || ""}
              </div>
              <div className="hidden sm:block">
                <p className="max-w-40 truncate text-sm font-medium text-surface-900 dark:text-white">
                  {user?.full_name || user?.email || "Пользователь"}
                </p>
                <p className="max-w-40 truncate text-xs text-surface-500">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
    </AuthGuard>
  );
}
