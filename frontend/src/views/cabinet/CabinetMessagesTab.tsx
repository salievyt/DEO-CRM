"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, User, Clock } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { cabinetApi } from "@/shared/api/base";
import { formatDate, timeAgo } from "@/shared/utils/formatters";

interface CabinetMessage {
  id: string;
  content: string;
  sender_name: string;
  created_at: string;
}

export function CabinetMessagesTab() {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["cabinet-messages"],
    queryFn: () => cabinetApi.messages.list(),
    select: (res): CabinetMessage[] => res.data?.results || (res.data as CabinetMessage[]) || [],
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => cabinetApi.messages.send(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cabinet-messages"] });
      setNewMessage("");
    },
  });

  const messages = data || [];

  if (isLoading) {
    return <div className="flex h-48 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-700 dark:text-surface-200">
            <MessageSquare className="h-4 w-4" />
            Отправить сообщение
          </h3>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={3}
            className="input resize-none"
            placeholder="Напишите сообщение..."
          />
          <div className="flex justify-end">
            <Button
              onClick={() => sendMutation.mutate(newMessage)}
              disabled={!newMessage.trim() || sendMutation.isPending}
              loading={sendMutation.isPending}
            >
              <Send className="h-4 w-4" />
              Отправить
            </Button>
          </div>
        </div>
      </Card>

      {messages.length === 0 ? (
        <EmptyState title="Нет сообщений" description="История сообщений пуста" />
      ) : (
        <div className="space-y-3">
          {[...messages].reverse().map((msg) => (
            <Card key={msg.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                    {(msg.sender_name?.[0] || "?").toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-surface-900 dark:text-white">
                    {msg.sender_name}
                  </span>
                </div>
                <span className="text-xs text-surface-400">{timeAgo(msg.created_at)}</span>
              </div>
              <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">
                {msg.content}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
