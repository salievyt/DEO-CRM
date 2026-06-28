"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Card } from "@/shared/ui/Card";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { formatDateTime } from "@/shared/utils/formatters";
import { cn } from "@/shared/utils/cn";
import {
  Bell,
  CheckCheck,
  Archive,
  ArchiveRestore,
  Inbox,
} from "lucide-react";
import type { Notification } from "@/entities/notification/types";

export function NotificationsWidget() {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);

  const { data: notifications, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.NOTIFICATIONS, { archived: showArchived }],
    queryFn: () =>
      notificationsApi.list({ archived: showArchived ? "true" : "false" }),
    select: (res): Notification[] =>
      res.data?.results || (res.data as Notification[]) || [],
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.NOTIFICATIONS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.UNREAD_NOTIFICATIONS],
      });
    },
  });

  const archiveAll = useMutation({
    mutationFn: () => notificationsApi.archiveAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.NOTIFICATIONS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.UNREAD_NOTIFICATIONS],
      });
    },
  });

  const archiveOne = useMutation({
    mutationFn: (id: string) => notificationsApi.archiveOne(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.NOTIFICATIONS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.UNREAD_NOTIFICATIONS],
      });
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
          {showArchived ? (
            <>
              <Archive className="h-8 w-8 text-surface-300" />
              <p className="mt-2 text-sm text-surface-500">
                Нет архивных уведомлений
              </p>
            </>
          ) : (
            <>
              <Bell className="h-8 w-8 text-surface-300" />
              <p className="mt-2 text-sm text-surface-500">
                Нет уведомлений
              </p>
            </>
          )}
          {showArchived && (
            <button
              onClick={() => setShowArchived(false)}
              className="mt-3 text-xs text-brand-600 hover:text-brand-700"
            >
              ← Вернуться к активным
            </button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(false)}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors",
              !showArchived
                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                : "text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
            )}
          >
            <Inbox className="h-3.5 w-3.5" />
            Активные
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors",
              showArchived
                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                : "text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
            )}
          >
            <Archive className="h-3.5 w-3.5" />
            Архив
          </button>
        </div>
        <div className="flex items-center gap-1">
          {!showArchived && (
            <>
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/20"
                title="Отметить всё прочитанным"
              >
                <CheckCheck className="h-3 w-3" />
                Прочитано
              </button>
              <button
                onClick={() => archiveAll.mutate()}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800"
                title="Архивировать все"
              >
                <ArchiveRestore className="h-3 w-3" />
                В архив
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="divide-y divide-surface-100 dark:divide-surface-700">
        {notifications.slice(0, showArchived ? 20 : 10).map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "group relative px-4 py-3 transition-colors hover:bg-surface-50 dark:hover:bg-surface-700/50",
              !notification.read &&
                !notification.archived &&
                "bg-brand-50/50 dark:bg-brand-900/10"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {notification.urgency === "critical" && (
                    <span className="flex-shrink-0 text-xs">🔴</span>
                  )}
                  {notification.urgency === "important" && (
                    <span className="flex-shrink-0 text-xs">🟡</span>
                  )}
                  <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                    {notification.title}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-surface-500 line-clamp-2">
                  {notification.message}
                </p>
              </div>
              <div className="ml-2 flex flex-shrink-0 items-start gap-1">
                {!notification.read && !notification.archived && (
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-600" />
                )}
                {!notification.archived && (
                  <button
                    onClick={() => archiveOne.mutate(notification.id)}
                    className="mt-1 hidden rounded p-1 text-surface-400 opacity-0 transition-all hover:bg-surface-200 hover:text-surface-600 group-hover:opacity-100 dark:hover:bg-surface-700 dark:hover:text-surface-300 md:block"
                    title="Архивировать"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1 text-[10px] text-surface-400">
              {notification.type_display || notification.type} ·{' '}
              {formatDateTime(notification.created_at)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
