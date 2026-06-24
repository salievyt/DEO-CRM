"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { messengerApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Avatar } from "@/shared/ui/Avatar";
import { SearchInput } from "@/shared/ui/SearchInput";
import { cn } from "@/shared/utils/cn";
import { Bell, Menu } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ onMenuClick, showMenuButton = false }: HeaderProps) {
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: unread } = useQuery({
    queryKey: [QUERY_KEYS.UNREAD_COUNT],
    queryFn: () => messengerApi.unread(),
    select: (res) => res.data?.count || 0,
    refetchInterval: 30000,
  });

  return (
    <header className="flex h-16 items-center gap-4 border-b border-surface-200 bg-white px-4 dark:border-surface-700 dark:bg-surface-800">
      {showMenuButton && (
        <button onClick={onMenuClick} className="lg:hidden">
          <Menu className="h-6 w-6 text-surface-600" />
        </button>
      )}

      <div className="relative flex-1 max-w-md hidden sm:block">
        <SearchInput
          value=""
          onChange={() => {}}
          placeholder="Поиск..."
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700">
          <Bell className="h-5 w-5" />
          {(unread || 0) > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-[10px] font-medium text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {/* User info */}
        <div className="flex items-center gap-2">
          <Avatar
            src={user?.avatar}
            firstName={user?.first_name}
            lastName={user?.last_name}
            size="md"
          />
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-surface-900 dark:text-white">
              {user?.full_name || user?.email}
            </p>
            <p className="text-xs text-surface-500">
              {user?.email}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
