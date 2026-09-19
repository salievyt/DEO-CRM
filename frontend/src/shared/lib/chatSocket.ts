"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ||
  (process.env.NODE_ENV === "production"
    ? "wss://crm.backend.deo-core.codes"
    : "ws://localhost:8001");

export interface ChatWireMessage {
  id: string;
  chat: string;
  sender: string | null;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  file_url: string;
  file_name: string;
  voice_url: string;
  voice_duration: number;
  reply_to: string | null;
  created_at: string;
}

export interface TypingEvent {
  userId: string;
  userName: string;
  isTyping: boolean;
}

interface ChatSocketHandlers {
  onMessage?: (_message: ChatWireMessage) => void;
  onTyping?: (_event: TypingEvent) => void;
  onRead?: (_event: { userId: string; lastReadAt: string | null }) => void;
}

/**
 * WebSocket for the currently open chat (`/ws/chat/<id>/?token=<jwt>`).
 * Receives messages/typing/read events and lets the caller emit typing and
 * read-receipt frames. Auto-reconnects with backoff.
 */
export function useChatSocket(chatId: string | null, handlers: ChatSocketHandlers) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!chatId) {
      setConnected(false);
      return;
    }

    let disposed = false;
    let retry = 0;
    let socket: WebSocket | null = null;

    const connect = () => {
      if (disposed) return;
      const token = localStorage.getItem("access_token") || "";
      const url = `${WS_BASE}/ws/chat/${chatId}/?token=${encodeURIComponent(token)}`;
      try {
        socket = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        retry = 0;
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "message" && payload.message) {
            handlersRef.current.onMessage?.(payload.message as ChatWireMessage);
          } else if (payload.type === "typing") {
            handlersRef.current.onTyping?.({
              userId: payload.user_id,
              userName: payload.user_name,
              isTyping: Boolean(payload.is_typing),
            });
          } else if (payload.type === "read") {
            handlersRef.current.onRead?.({
              userId: payload.user_id,
              lastReadAt: payload.last_read_at ?? null,
            });
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      socket.onclose = () => {
        setConnected(false);
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
      setConnected(false);
      socketRef.current = null;
      socket?.close();
    };
  }, [chatId]);

  const sendTyping = useCallback((isTyping: boolean) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "typing", is_typing: isTyping }));
    }
  }, []);

  const sendRead = useCallback(() => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "read" }));
    }
  }, []);

  return { connected, sendTyping, sendRead };
}

/** Ask for notification permission once and show a desktop notification. */
export function showBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/images/DEOCORE_LOGO.svg" });
    } catch {
      /* ignore */
    }
  } else if (Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        try {
          new Notification(title, { body });
        } catch {
          /* ignore */
        }
      }
    });
  }
}
