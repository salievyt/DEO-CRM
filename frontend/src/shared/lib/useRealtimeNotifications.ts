"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/shared/ui/Toast";
import { QUERY_KEYS } from "@/shared/constants";
import { WS_BASE, showBrowserNotification } from "@/shared/lib/chatSocket";

interface RealtimeEvent {
  event: "missed_call" | "chat.message" | string;
  data: Record<string, any>;
}

// The chat currently open in the messenger, so we don't toast/notify for a
// message the user is already looking at. Set by MessengerPage.
let activeChatId: string | null = null;
export function setActiveChatId(chatId: string | null) {
  activeChatId = chatId;
}

/**
 * Single always-on socket (`/ws/notifications/?token=<jwt>`) that turns
 * server-pushed missed calls and chat messages into toasts, browser
 * notifications and badge refreshes across the whole app.
 */
export function useRealtimeNotifications() {
  const queryClient = useQueryClient();
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let socket: WebSocket | null = null;
    let disposed = false;
    let retry = 0;

    const refreshBadge = () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.UNREAD_NOTIFICATIONS] });
    };

    const handleChatMessage = (data: Record<string, any>) => {
      const messageId = String(data.id || "");
      if (messageId && seenRef.current.has(messageId)) return;
      if (messageId) seenRef.current.add(messageId);

      const chatId = String(data.chat || "");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHATS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.UNREAD_COUNT] });
      if (chatId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MESSAGES, chatId] });
      }

      if (chatId && chatId === activeChatId) return;

      const sender = data.sender_name || "Пользователь";
      const body = data.content || "Новое сообщение";
      toast({
        type: "info",
        title: data.chat_name ? `Сообщение · ${data.chat_name}` : "Новое сообщение",
        message: `${sender}: ${body}`,
        duration: 6000,
      });
      showBrowserNotification(sender, body);
    };

    const connect = () => {
      if (disposed) return;
      const token = localStorage.getItem("access_token") || "";
      const url = `${WS_BASE}/ws/notifications/?token=${encodeURIComponent(token)}`;
      try {
        socket = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        retry = 0;
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as RealtimeEvent;
          if (payload?.event === "missed_call") {
            const callId = payload.data?.call_id || "";
            if (callId && seenRef.current.has(callId)) return;
            if (callId) seenRef.current.add(callId);
            toast({
              type: "warning",
              title: "Пропущенный звонок",
              message: payload.data?.phone_number
                ? `С номера ${payload.data.phone_number}`
                : "Неотвеченный вызов",
              duration: 8000,
            });
            refreshBadge();
          } else if (payload?.event === "chat.message") {
            handleChatMessage(payload.data || {});
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      socket.onclose = () => {
        scheduleReconnect();
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      const delay = Math.min(1000 * 2 ** retry, 15000);
      retry += 1;
      window.setTimeout(connect, delay);
    };

    connect();

    return () => {
      disposed = true;
      socket?.close();
      socket = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);
}
