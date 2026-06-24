"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { analyticsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { formatDateTime } from "@/shared/utils/formatters";
import { cn } from "@/shared/utils/cn";
import { Bell, CheckCheck } from "lucide-react";
import type { Notification } from "@/entities/notification/types";

export function NotificationsWidget() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => analyticsApi.dashboards.list(),
    select: (res): Notification[] => res.data?.results || [],
  });

  const markAllRead = useMutation({
    mutationFn: () => analyticsApi.dashboards.create({ action: "mark_all_read" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center py-8 text-center">
          <Bell className="h-8 w-8 text-surface-300" />
          <p className="mt-2 text-sm text-surface-500">Нет уведомлений</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none">
      <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-700">
        <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
          Уведомления
        </h3>
        <button
          onClick={() => markAllRead.mutate()}
          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
        >
          <CheckCheck className="h-3 w-3" />
          Все прочитано
        </button>
      </div>
      <div className="divide-y divide-surface-100 dark:divide-surface-700">
        {notifications.slice(0, 10).map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "px-4 py-3 transition-colors hover:bg-surface-50 dark:hover:bg-surface-700/50",
              !notification.read && "bg-brand-50/50 dark:bg-brand-900/10"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                  {notification.title}
                </p>
                <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">
                  {notification.message}
                </p>
              </div>
              {!notification.read && (
                <span className="ml-2 mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-600" />
              )}
            </div>
            <p className="mt-1 text-xs text-surface-400">
              {formatDateTime(notification.created_at)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
