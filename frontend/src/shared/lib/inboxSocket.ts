"use client";

import { useEffect, useRef, useState } from "react";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001";

export interface InboxSocketEvent {
  event:
    | "message.created"
    | "message.status.updated"
    | "conversation.created"
    | "conversation.updated";
  data: Record<string, unknown>;
}

interface Options {
  enabled?: boolean;
  onEvent: (_event: InboxSocketEvent) => void;
}

/**
 * Real-time inbox connection backed by the Django Channels endpoint
 * `/ws/inbox/?token=<jwt>`. Auto-reconnects with backoff. The Inbox page
 * combines this with slow polling as a fallback, so the UI stays correct
 * even when the socket is temporarily unavailable.
 */
export function useInboxSocket({ enabled = true, onEvent }: Options) {
  const [connected, setConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let socket: WebSocket | null = null;
    let disposed = false;
    let retry = 0;

    const connect = () => {
      if (disposed) {
        return;
      }
      const token = localStorage.getItem("access_token") || "";
      const url = `${WS_BASE}/ws/inbox/?token=${encodeURIComponent(token)}`;
      try {
        socket = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        retry = 0;
        setConnected(true);
      };

      socket.onmessage = (message) => {
        try {
          const payload = JSON.parse(message.data);
          if (payload?.event) {
            onEventRef.current(payload as InboxSocketEvent);
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
      if (disposed) {
        return;
      }
      const delay = Math.min(1000 * 2 ** retry, 15000);
      retry += 1;
      window.setTimeout(connect, delay);
    };

    connect();

    return () => {
      disposed = true;
      setConnected(false);
      socket?.close();
      socket = null;
    };
  }, [enabled]);  return { connected };
}
