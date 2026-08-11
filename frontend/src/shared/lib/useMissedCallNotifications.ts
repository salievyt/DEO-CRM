"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/shared/ui/Toast";
import { QUERY_KEYS } from "@/shared/constants";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001";

interface MissedCallEvent {
  event: "missed_call";
  data: {
    call_id: string;
    phone_number: string;
    direction?: string;
    started_at?: string | null;
  };
}

/**
 * Real-time missed-call alerts backed by the Django Channels
 * `NotificationConsumer` (`/ws/notifications/?token=<jwt>`).
 *
 * On a `missed_call` event shows a toast and refreshes the notification
 * badge. Auto-reconnects with backoff; recent events are deduplicated
 * per tab so reconnects don't re-toast the same call.
 */
export function useMissedCallNotifications() {
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

    const connect = () => {
      if (disposed) {
        return;
      }
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

      socket.onmessage = (message) => {
        try {
          const payload = JSON.parse(message.data) as MissedCallEvent;
          if (payload?.event !== "missed_call") {
            return;
          }
          const callId = payload.data?.call_id || "";
          if (callId && seenRef.current.has(callId)) {
            return;
          }
          if (callId) {
            seenRef.current.add(callId);
          }
          toast({
            type: "warning",
            title: "Пропущенный звонок",
            message: payload.data?.phone_number
              ? `С номера ${payload.data.phone_number}`
              : "Неотвеченный вызов",
            duration: 8000,
          });
          refreshBadge();
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
      socket?.close();
      socket = null;
    };
  }, [queryClient]);
}
