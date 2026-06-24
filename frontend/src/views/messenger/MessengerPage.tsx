"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  MoreVertical,
  Paperclip,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Input } from "@/shared/ui/Input";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { messengerApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDateTime, timeAgo, cn } from "@/shared/utils/formatters";
import { useAuth } from "@/hooks/useAuth";
import type { Chat, Message } from "@/entities/chat/types";

export function MessengerPage() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const { user } = useAuth();

  const queryClient = useQueryClient();

  const { data: chats, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.CHATS],
    queryFn: () => messengerApi.chats.list(),
    select: (res): Chat[] => res.data?.results || (res.data as Chat[]),
  });

  const { data: messages } = useQuery({
    queryKey: [QUERY_KEYS.MESSAGES, selectedChat],
    queryFn: () => messengerApi.messages.list(selectedChat!),
    select: (res): Message[] => res.data?.results || (res.data as Message[]),
    enabled: !!selectedChat,
    refetchInterval: 5000,
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

  const selectedChatData = chats?.find((c) => c.id === selectedChat);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Мессенджер"
        description="Корпоративные сообщения и чаты"
      />

      <div className="flex h-[calc(100vh-16rem)] gap-4">
        {/* Chat List */}
        <Card padding="none" className="w-80 flex-shrink-0">
          <div className="border-b border-surface-200 p-4 dark:border-surface-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Поиск чатов..."
                className="input pl-10"
              />
            </div>
          </div>
          <div className="overflow-y-auto" style={{ height: "calc(100% - 65px)" }}>
            {!chats || chats.length === 0 ? (
              <div className="p-8 text-center text-sm text-surface-500">
                Нет чатов
              </div>
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                    {(chat.name || "Чат")[0].toUpperCase()}
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
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs text-surface-500">
                        {chat.last_message?.content || "Нет сообщений"}
                      </p>
                      {chat.unread_count > 0 && (
                        <Badge variant="danger">{chat.unread_count}</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card padding="none" className="flex flex-1 flex-col">
          {selectedChat && selectedChatData ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-surface-200 px-6 py-4 dark:border-surface-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                    {(selectedChatData.name || "Ч")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {selectedChatData.name || "Чат"}
                    </p>
                    <p className="text-xs text-surface-500">
                      {selectedChatData.is_group ? "Групповой чат" : "Личный чат"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {(!messages || messages.length === 0) ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-surface-400">
                      Нет сообщений. Начните диалог!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.sender === user?.id
                          ? "justify-end"
                          : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2",
                          msg.sender === user?.id
                            ? "bg-brand-600 text-white"
                            : "bg-surface-100 text-surface-900 dark:bg-surface-700 dark:text-surface-50"
                        )}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={cn(
                            "mt-1 text-right text-xs",
                            msg.sender === user?.id
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

              {/* Message Input */}
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
                      if (e.key === "Enter" && messageInput.trim()) {
                        sendMutation.mutate(messageInput.trim());
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (messageInput.trim()) {
                        sendMutation.mutate(messageInput.trim());
                      }
                    }}
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
                <p className="mt-4 text-sm text-surface-500">
                  Выберите чат, чтобы начать общение
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
