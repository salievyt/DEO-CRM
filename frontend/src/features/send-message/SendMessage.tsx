"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { messengerApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { MessageSquare, Send } from "lucide-react";

interface CreateChatModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateChatModal({ open, onClose }: CreateChatModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    participant_ids: "",
    is_group: false,
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => messengerApi.chats.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHATS] });
      onClose();
      setForm({ name: "", participant_ids: "", is_group: false });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name: form.name,
      participant_ids: form.participant_ids.split(",").map((s) => s.trim()),
      is_group: form.is_group,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Новый чат">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Название чата"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Для групповых чатов"
        />
        <Input
          label="ID участников"
          value={form.participant_ids}
          onChange={(e) => setForm({ ...form, participant_ids: e.target.value })}
          placeholder="uuid1, uuid2, uuid3"
          hint="Через запятую"
          required
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_group}
            onChange={(e) => setForm({ ...form, is_group: e.target.checked })}
            className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-surface-700 dark:text-surface-200">
            Групповой чат
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Создать чат
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface SendMessageFormProps {
  chatId: string;
  onMessageSent?: () => void;
}

export function SendMessageForm({ chatId, onMessageSent }: SendMessageFormProps) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const mutation = useMutation({
    mutationFn: (text: string) => messengerApi.messages.send(chatId, { content: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MESSAGES, chatId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHATS] });
      setContent("");
      onMessageSent?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      mutation.mutate(content.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Напишите сообщение..."
        className="input flex-1"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <button
        type="submit"
        disabled={!content.trim()}
        className="btn-primary rounded-lg p-2"
      >
        <Send className="h-5 w-5" />
      </button>
    </form>
  );
}
