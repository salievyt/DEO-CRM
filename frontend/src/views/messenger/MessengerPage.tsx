"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Send,
  Search,
  Users,
  UserPlus,
  Plus,
  Check,
  CheckCheck,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Avatar } from "@/shared/ui/Avatar";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { messengerApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDateTime, timeAgo, cn } from "@/shared/utils/formatters";
import { useChatSocket } from "@/shared/lib/chatSocket";
import { setActiveChatId } from "@/shared/lib/useRealtimeNotifications";
import { useAuth } from "@/hooks/useAuth";
import { NewChatModal } from "@/features/messenger/NewChatModal";
import { AddParticipantsModal } from "@/features/messenger/AddParticipantsModal";
import type { Chat, Message } from "@/entities/chat/types";

const MANAGER_ROLES = ["superadmin", "owner", "project_manager"];

export function MessengerPage() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [readStatuses, setReadStatuses] = useState<Record<string, string | null>>({});

  const typingTimeouts = useRef<Record<string, number>>({});
  const typingSendTimeout = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isManager = MANAGER_ROLES.includes((user?.role_name || "").toLowerCase());

  const { data: chats, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.CHATS],
    queryFn: () => messengerApi.chats.list(),
    select: (res): Chat[] => res.data?.results || (res.data as Chat[]),
    refetchInterval: 30000,
  });

  const { data: messages } = useQuery({
    queryKey: [QUERY_KEYS.MESSAGES, selectedChat],
    queryFn: () => messengerApi.messages.list(selectedChat!),
    select: (res): Message[] => res.data?.results || (res.data as Message[]),
    enabled: !!selectedChat,
    refetchInterval: 15000,
  });

  const selectedChatData = chats?.find((c) => c.id === selectedChat);

  const invalidateConversation = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MESSAGES, selectedChat] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHATS] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.UNREAD_COUNT] });
  }, [queryClient, selectedChat]);

  const handleTypingEvent = useCallback(
    ({ userId, userName, isTyping }: { userId: string; userName: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (isTyping) next[userId] = userName;
        else delete next[userId];
        return next;
      });
      if (isTyping) {
        if (typingTimeouts.current[userId]) {
          window.clearTimeout(typingTimeouts.current[userId]);
        }
        typingTimeouts.current[userId] = window.setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }, 4000);
      }
    },
    []
  );

  const { connected, sendTyping, sendRead } = useChatSocket(selectedChat, {
    onMessage: () => {
      invalidateConversation();
      sendRead();
    },
    onTyping: handleTypingEvent,
    onRead: ({ userId, lastReadAt }) => {
      setReadStatuses((prev) => ({ ...prev, [userId]: lastReadAt }));
    },
  });

  const markRead = useMutation({
    mutationFn: (chatId: string) => messengerApi.chats.markRead(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHATS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.UNREAD_COUNT] });
    },
  });

  // Track the open chat globally (so the notifications hook can stay quiet)
  // and mark it as read.
  useEffect(() => {
    setActiveChatId(selectedChat);
    setTypingUsers({});
    if (selectedChat) {
      markRead.mutate(selectedChat);
    }
    return () => setActiveChatId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  // Read receipts: reset when switching chats, then hydrate from the chat's
  // participants (merging only missing entries so live socket updates win).
  useEffect(() => {
    setReadStatuses({});
  }, [selectedChat]);

  useEffect(() => {
    if (!selectedChatData) return;
    setReadStatuses((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const p of selectedChatData.participants) {
        if (!p.user || p.user in next) continue;
        next[p.user] = p.last_read_at;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [selectedChatData]);

  // Scroll to the newest message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => messengerApi.messages.send(selectedChat!, { content }),
    onSuccess: () => {
      sendTyping(false);
      invalidateConversation();
      setMessageInput("");
    },
  });

  const handleInputChange = (value: string) => {
    setMessageInput(value);
    sendTyping(true);
    if (typingSendTimeout.current) window.clearTimeout(typingSendTimeout.current);
    typingSendTimeout.current = window.setTimeout(() => sendTyping(false), 2000);
  };

  const submitMessage = () => {
    const content = messageInput.trim();
    if (!content) return;
    sendMutation.mutate(content);
  };

  const filteredChats = (chats || []).filter((chat) => {
    if (!search.trim()) return true;
    const haystack = [
      chat.display_name,
      chat.name,
      ...chat.participants.map((p) => p.user_name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const typingNames = Object.values(typingUsers);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Мессенджер" description="Корпоративные сообщения и чаты" />

      <div className="flex h-[calc(100vh-16rem)] gap-4">
        {/* Chat List */}
        <Card padding="none" className="flex w-80 flex-shrink-0 flex-col">
          <div className="border-b border-surface-200 p-4 dark:border-surface-700">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск чатов..."
                  className="input pl-10"
                />
              </div>
              <Button
                type="button"
                onClick={() => setShowNewChat(true)}
                className="rounded-lg p-2"
                aria-label="Новый чат"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center text-sm text-surface-500">
                {chats && chats.length > 0 ? "Ничего не найдено" : "Нет чатов"}
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-surface-100 px-4 py-3 text-left transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-700/50",
                    selectedChat === chat.id && "bg-brand-50 dark:bg-brand-900/20"
                  )}
                >
                  <Avatar
                    src={chat.is_group ? null : chat.participants.find((p) => p.user !== user?.id)?.user_avatar}
                    firstName={(chat.display_name || "Ч")[0]}
                    size="md"
                    className={cn(chat.is_group && "bg-surface-500")}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                        {chat.display_name || "Без названия"}
                      </p>
                      {chat.last_message && (
                        <span className="flex-shrink-0 text-xs text-surface-400">
                          {timeAgo(chat.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-surface-500">
                        {chat.last_message
                          ? `${chat.last_message.sender_name ? chat.last_message.sender_name + ": " : ""}${chat.last_message.content}`
                          : "Нет сообщений"}
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
              {/* Header */}
              <div className="flex items-center justify-between border-b border-surface-200 px-6 py-4 dark:border-surface-700">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    src={selectedChatData.is_group ? null : selectedChatData.participants.find((p) => p.user !== user?.id)?.user_avatar}
                    firstName={(selectedChatData.display_name || "Ч")[0]}
                    size="md"
                    className={cn(selectedChatData.is_group && "bg-surface-500")}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-surface-900 dark:text-white">
                      {selectedChatData.display_name || "Чат"}
                    </p>
                    <p className="truncate text-xs text-surface-500">
                      {selectedChatData.is_group
                        ? `${selectedChatData.participants.length} участников`
                        : "Личный чат"}
                      {connected && (
                        <span className="ml-2 inline-flex items-center gap-1 text-success-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                          онлайн
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700"
                    title={`Участники: ${selectedChatData.participants.map((p) => p.user_name).join(", ")}`}
                  >
                    <Users className="h-4 w-4" />
                  </button>
                  {isManager && (
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => setShowAddParticipants(true)}
                      className="gap-1.5"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span className="hidden sm:inline">Добавить</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
                {!messages || messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-surface-400">
                      Нет сообщений. Начните диалог!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender === user?.id;
                    const msgTime = new Date(msg.created_at).getTime();
                    const readByOthers =
                      isOwn &&
                      selectedChatData.participants.some((p) => {
                        if (!p.user || p.user === user?.id) return false;
                        const lastRead = readStatuses[p.user];
                        return lastRead
                          ? new Date(lastRead).getTime() >= msgTime
                          : false;
                      });
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}
                      >
                        {!isOwn && (
                          <Avatar
                            src={msg.sender_avatar}
                            firstName={(msg.sender_name || "?")[0]}
                            size="sm"
                            className="mb-5 flex-shrink-0"
                          />
                        )}
                        <div className="max-w-[70%]">
                          {!isOwn && selectedChatData.is_group && (
                            <p className="mb-1 text-xs font-medium text-surface-500">
                              {msg.sender_name}
                            </p>
                          )}
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-2",
                              isOwn
                                ? "bg-brand-600 text-white"
                                : "bg-surface-100 text-surface-900 dark:bg-surface-700 dark:text-surface-50"
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                            <p
                              className={cn(
                                "mt-1 flex items-center justify-end gap-1 text-xs",
                                isOwn ? "text-brand-200" : "text-surface-400"
                              )}
                            >
                              {formatDateTime(msg.created_at, "HH:mm")}
                              {isOwn &&
                                (readByOthers ? (
                                  <CheckCheck
                                    className="h-3.5 w-3.5 text-white"
                                    aria-label="Прочитано"
                                  />
                                ) : (
                                  <Check
                                    className="h-3.5 w-3.5"
                                    aria-label="Отправлено"
                                  />
                                ))}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {typingNames.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-surface-500">
                    <span className="flex gap-0.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-surface-400 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-surface-400 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-surface-400" />
                    </span>
                    {typingNames.join(", ")} печатает…
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-surface-200 p-4 dark:border-surface-700">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Напишите сообщение..."
                    className="input flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitMessage();
                      }
                    }}
                  />
                  <button
                    onClick={submitMessage}
                    disabled={!messageInput.trim() || sendMutation.isPending}
                    className="btn-primary rounded-lg p-2 disabled:opacity-50"
                    aria-label="Отправить"
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

      <NewChatModal
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        canCreateGroup={isManager}
      />
      <AddParticipantsModal
        open={showAddParticipants}
        onClose={() => setShowAddParticipants(false)}
        chatId={selectedChat}
        existingUserIds={
          selectedChatData?.participants
            .map((p) => p.user)
            .filter((id): id is string => Boolean(id)) || []
        }
      />
    </div>
  );
}
