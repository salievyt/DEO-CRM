"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/features/auth/AuthGuard";
import { cn } from "@/lib/utils";
import { notificationsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDateTime } from "@/shared/utils/formatters";
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
  CalendarDays,
  ShieldCheck,
  CheckCheck,
} from "lucide-react";
import type { Notification } from "@/entities/notification/types";

const ALL_NAV_ITEMS = [
  { name: "Дашборд", href: "/dashboard", icon: LayoutDashboard, roles: ["superadmin", "owner", "project_manager", "developer", "designer", "marketer"] },
  { name: "Клиенты", href: "/clients", icon: Users, roles: ["superadmin", "owner", "project_manager", "marketer"] },
  { name: "Лиды", href: "/leads", icon: TrendingUp, roles: ["superadmin", "owner", "project_manager", "marketer"] },
  { name: "Проекты", href: "/projects", icon: FolderKanban, roles: ["superadmin", "owner", "project_manager", "developer", "designer"] },
  { name: "Задачи", href: "/tasks", icon: CheckSquare, roles: ["superadmin", "owner", "project_manager", "developer", "designer", "marketer"] },
  { name: "Календарь", href: "/calendar", icon: CalendarDays, roles: ["superadmin", "owner", "project_manager", "developer", "designer", "marketer", "client"] },
  { name: "Финансы", href: "/finance", icon: DollarSign, roles: ["superadmin", "owner", "project_manager"] },
  { name: "Документы", href: "/documents", icon: FileText, roles: ["superadmin", "owner", "project_manager", "developer", "designer", "marketer", "client"] },
  { name: "Мессенджер", href: "/messenger", icon: MessageSquare, roles: ["superadmin", "owner", "project_manager", "developer", "designer", "marketer", "client"] },
  { name: "DEO AI", href: "/ai", icon: Bot, roles: ["superadmin", "owner", "project_manager", "developer", "designer", "marketer"] },
  { name: "Аналитика", href: "/analytics", icon: BarChart3, roles: ["superadmin", "owner", "project_manager", "marketer"] },
  { name: "HeatMap Studio", href: "/analytics/heatmap", icon: BarChart3, roles: ["superadmin", "owner", "project_manager"] },
  { name: "Админ", href: "/admin", icon: ShieldCheck, roles: ["superadmin", "owner"] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const userRole = user?.role_name?.toLowerCase() || "client";
  const navigation = ALL_NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useQuery({
    queryKey: [QUERY_KEYS.UNREAD_NOTIFICATIONS],
    queryFn: () => notificationsApi.unreadCount(),
    select: (res) => (res.data as { count: number })?.count || 0,
    refetchInterval: 30000,
  });

  const { data: notifList } = useQuery({
    queryKey: [QUERY_KEYS.NOTIFICATIONS],
    queryFn: () => notificationsApi.list(),
    select: (res): Notification[] => res.data?.results || (res.data as Notification[]) || [],
    enabled: notifOpen,
  });

  const unreadCount = unreadData ?? 0;

  // Close notification dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [notifOpen]);

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-surface-50 text-surface-900 dark:bg-surface-950 dark:text-surface-50">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[86vw] flex-col border-r border-surface-200/80 bg-white/95 backdrop-blur-xl shadow-lg shadow-surface-200/20 transition-all duration-300 dark:border-surface-700/50 dark:bg-surface-900/95 dark:shadow-black/20 lg:static lg:w-64 lg:max-w-none lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex h-16 items-center gap-3 border-b border-surface-200/50 px-5 transition-colors hover:bg-surface-50/50 dark:border-surface-700/30 dark:hover:bg-surface-800/50"
            onClick={() => setSidebarOpen(false)}
          >
            <Image
              src="/images/DEOCORE_LOGO.svg"
              alt="DEO CRM"
              width={38}
              height={38}
              className="h-16 w-16 object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-surface-900 dark:text-white">
                DEO CRM
              </p>
              <p className="truncate text-xs text-surface-400">
                Рабочее пространство
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 scrollbar-thin">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-gradient-to-r from-brand-500/10 to-brand-600/5 text-brand-700 shadow-sm shadow-brand-500/5 ring-1 ring-brand-500/10 dark:from-brand-500/20 dark:to-brand-600/10 dark:text-brand-300 dark:ring-brand-400/20"
                      : "text-surface-600 hover:bg-surface-100/80 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800/60 dark:hover:text-surface-200"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform duration-150",
                    isActive ? "scale-110" : "group-hover:scale-105"
                  )} />
                  <span className="truncate">{item.name}</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-600 dark:bg-brand-400" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Info & Settings */}
          <div className="border-t border-surface-200/50 p-3 dark:border-surface-700/30">
            <Link
              href="/settings"
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                pathname === "/settings"
                  ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                  : "text-surface-600 hover:bg-surface-100/80 dark:text-surface-400 dark:hover:bg-surface-800/60"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <Settings className="h-5 w-5" />
              Настройки
            </Link>
            <button
              onClick={logout}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger-600 transition-all hover:bg-danger-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-5 w-5" />
              Выйти
            </button>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="relative flex h-16 items-center gap-4 border-b border-surface-200/80 bg-white/80 backdrop-blur-lg px-4 shadow-sm dark:border-surface-700/30 dark:bg-surface-900/80">
            <button
              className="rounded-xl p-2 text-surface-500 transition-colors hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800 lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Закрыть меню" : "Открыть меню"}
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            <div className="relative hidden flex-1 sm:block sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Поиск по системе..."
                className="input pl-10 bg-surface-50/50 dark:bg-surface-800/50"
              />
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <div ref={notifRef} className="relative">
                <button
                  className="relative rounded-xl p-2 text-surface-500 transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
                  aria-label="Уведомления"
                  onClick={() => setNotifOpen(!notifOpen)}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-surface-900">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown */}
                {notifOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-80 origin-top-right animate-scale-in rounded-xl border border-surface-200 bg-white shadow-xl shadow-surface-200/20 dark:border-surface-700 dark:bg-surface-800 dark:shadow-black/20">
                    <div className="border-b border-surface-100 px-4 py-3 dark:border-surface-700">
                      <p className="text-sm font-semibold text-surface-900 dark:text-white">
                        Уведомления
                      </p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifList && notifList.length > 0 ? (
                        notifList.slice(0, 5).map((n) => (
                          <div
                            key={n.id}
                            className={cn(
                              "border-b border-surface-100 px-4 py-3 transition-colors last:border-0 hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700/50",
                              !n.read && "bg-brand-50/30 dark:bg-brand-900/10"
                            )}
                          >
                            <p className="text-sm font-medium text-surface-900 dark:text-white">
                              {n.title}
                            </p>
                            {n.message && (
                              <p className="mt-0.5 text-xs text-surface-500 line-clamp-2">
                                {n.message}
                              </p>
                            )}
                            <p className="mt-1 text-[10px] text-surface-400">
                              {formatDateTime(n.created_at)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center px-4 py-8 text-center">
                          <Bell className="mb-2 h-6 w-6 text-surface-300" />
                          <p className="text-sm text-surface-500">Нет уведомлений</p>
                        </div>
                      )}
                    </div>
                    <Link
                      href="/settings"
                      className="flex items-center justify-center gap-1.5 border-t border-surface-100 px-4 py-2.5 text-xs font-medium text-brand-600 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700/50"
                      onClick={() => setNotifOpen(false)}
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Настроить уведомления
                    </Link>
                  </div>
                )}
              </div>

              <div className="flex min-w-0 items-center gap-2.5 pl-2 border-l border-surface-200/50 dark:border-surface-700/30">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-xs font-bold text-white shadow-sm shadow-brand-600/10 ring-1 ring-white/20">
                  {(user?.first_name?.[0] || user?.email?.[0] || "D").toUpperCase()}
                  {user?.last_name?.[0]?.toUpperCase() || ""}
                </div>
                <div className="hidden sm:block">
                  <p className="max-w-40 truncate text-sm font-medium text-surface-900 dark:text-white">
                    {user?.full_name || user?.email || "Пользователь"}
                  </p>
                  <p className="max-w-40 truncate text-xs text-surface-500">
                    {user?.role_name || user?.email}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content with enter animation */}
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 scrollbar-thin">
            <div className="mx-auto w-full max-w-7xl animate-fade-in-up">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
