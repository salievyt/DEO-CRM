import { io, Socket } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001";

let socket: Socket | null = null;

type MessageHandler = (data: unknown) => void;

interface Subscription {
  event: string;
  handler: MessageHandler;
}

const subscriptions = new Map<string, Set<MessageHandler>>();

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token?: string): Socket {
  if (socket?.connected) return socket;

  socket = io(WS_URL, {
    auth: token ? { token } : undefined,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    console.log("[WS] Connected:", socket?.id);
    // Re-subscribe on reconnect
    subscriptions.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        socket?.on(event, handler);
      });
    });
  });

  socket.on("disconnect", (reason) => {
    console.log("[WS] Disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("[WS] Connection error:", error.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function subscribe(event: string, handler: MessageHandler) {
  if (!subscriptions.has(event)) {
    subscriptions.set(event, new Set());
  }
  subscriptions.get(event)!.add(handler);

  if (socket) {
    socket.on(event, handler);
  }

  return () => unsubscribe(event, handler);
}

export function unsubscribe(event: string, handler: MessageHandler) {
  subscriptions.get(event)?.delete(handler);
  if (subscriptions.get(event)?.size === 0) {
    subscriptions.delete(event);
  }
  if (socket) {
    socket.off(event, handler);
  }
}

export function sendMessage(event: string, data: unknown) {
  if (socket?.connected) {
    socket.emit(event, data);
  }
}

// Typed event helpers
export const WS_EVENTS = {
  // Chat
  CHAT_MESSAGE: "chat:message",
  CHAT_TYPING: "chat:typing",
  CHAT_READ: "chat:read",

  // Notifications
  NOTIFICATION: "notification",
  TASK_UPDATED: "task:updated",
  PROJECT_UPDATED: "project:updated",

  // Online status
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",
} as const;
