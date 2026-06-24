"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messengerApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { cn, formatDateTime, timeAgo } from "@/shared/utils/formatters";
import { MessageSquare, Send, Search, Paperclip } from "lucide-react";
import type { Chat, Message } from "@/entities/chat/types";

interface ChatWidgetProps {
  compact?: boolean;
  limit?: number;
}

export function ChatWidget({ compact = false }: ChatWidgetProps) {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const queryClient = useQueryClient();

  const { data: chats, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.CHATS],
    queryFn: () => messengerApi.chats.list(),
    select: (res) => res.data?.results || res.data as Chat[],
  });

  const { data: messages } = useQuery({
    queryKey: [QUERY_KEYS.MESSAGES, selectedChat],
    queryFn: () => messengerApi.messages.list(selectedChat!),
    select: (res) => res.data?.results || res.data as Message[],
    enabled: !!selectedChat,
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      messengerApi.messages.send(selectedChat!, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MESSAGES, selectedChat] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHATS] });
      setMessageInput("");
    },
  });

  const handleSend = () => {
    if (messageInput.trim() && selectedChat) {
      sendMutation.mutate(messageInput.trim());
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card padding="none">
        <div className="border-b border-surface-200 px-4 py-3 dark:border-surface-700">
          <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
            Последние сообщения
          </h3>
        </div>
        {(!chats || chats.length === 0) ? (
          <div className="p-6 text-center text-sm text-surface-500">
            Нет сообщений
          </div>
        ) : (
          <div className="divide-y divide-surface-100 dark:divide-surface-700">
            {chats.slice(0, 5).map((chat) => (
              <div key={chat.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                  {(chat.name || "Ч")[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                    {chat.name || "Без названия"}
                  </p>
                  <p className="truncate text-xs text-surface-500">
                    {chat.last_message?.content || "Нет сообщений"}
                  </p>
                </div>
                {chat.unread_count > 0 && (
                  <Badge variant="danger">{chat.unread_count}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Chat list */}
      <div className="w-72 flex-shrink-0">
        <Card padding="none" className="h-full">
          <div className="border-b border-surface-200 p-3 dark:border-surface-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input type="text" placeholder="Поиск..." className="input pl-9 text-sm" />
            </div>
          </div>
          <div className="overflow-y-auto" style={{ height: "calc(100% - 57px)" }}>
            {(!chats || chats.length === 0) ? (
              <div className="p-6 text-center text-sm text-surface-500">Нет чатов</div>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-surface-100 px-4 py-3 text-left transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700/50",
                    selectedChat === chat.id && "bg-brand-50 dark:bg-brand-900/20"
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                    {(chat.name || "Ч")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                        {chat.name || "Без названия"}
                      </p>
                      {chat.last_message && (
                        <span className="text-xs text-surface-400">
                          {timeAgo(chat.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-surface-500">
                      {chat.last_message?.content || "Нет сообщений"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Messages area */}
      <Card padding="none" className="flex flex-1 flex-col">
        {selectedChat ? (
          <>
            <div className="border-b border-surface-200 p-4 dark:border-surface-700">
              <p className="font-medium text-surface-900 dark:text-white">
                {chats?.find((c) => c.id === selectedChat)?.name || "Чат"}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(!messages || messages.length === 0) ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-surface-400">Начните диалог!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.sender === "current-user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2",
                        msg.sender === "current-user"
                          ? "bg-brand-600 text-white"
                          : "bg-surface-100 text-surface-900 dark:bg-surface-700 dark:text-surface-50"
                      )}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={cn(
                          "mt-1 text-right text-xs",
                          msg.sender === "current-user"
                            ? "text-brand-200"
                            : "text-surface-400"
                        )}
                      >
                        {formatDateTime(msg.created_at, "HH:mm")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-surface-200 p-4 dark:border-surface-700">
              <div className="flex items-center gap-2">
                <button className="rounded-lg p-2 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700">
                  <Paperclip className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Напишите сообщение..."
                  className="input flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!messageInput.trim()}
                  className="btn-primary rounded-lg p-2"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-surface-300" />
              <p className="mt-4 text-sm text-surface-500">Выберите чат</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
