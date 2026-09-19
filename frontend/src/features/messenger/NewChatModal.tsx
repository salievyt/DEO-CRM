"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { messengerApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { ParticipantPicker } from "./ParticipantPicker";

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
  canCreateGroup: boolean;
}

export function NewChatModal({ open, onClose, canCreateGroup }: NewChatModalProps) {
  const queryClient = useQueryClient();
  const [isGroup, setIsGroup] = useState(false);
  const [name, setName] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  const reset = () => {
    setIsGroup(false);
    setName("");
    setParticipantIds([]);
  };

  const mutation = useMutation({
    mutationFn: () =>
      messengerApi.chats.create({
        name: isGroup ? name.trim() : "",
        is_group: isGroup,
        participant_ids: participantIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHATS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.UNREAD_COUNT] });
      reset();
      onClose();
    },
  });

  const canSubmit = participantIds.length > 0 && (!isGroup || name.trim().length > 0);

  const handleClose = () => {
    if (mutation.isPending) return;
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Новый чат" size="lg">
      <div className="space-y-4">
        {canCreateGroup && (
          <label className="flex items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-200">
            <input
              type="checkbox"
              checked={isGroup}
              onChange={(e) => setIsGroup(e.target.checked)}
              className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
            />
            Создать групповой чат
          </label>
        )}

        {isGroup && (
          <Input
            label="Название группы"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Проект «Ромашка»"
            required
          />
        )}

        <ParticipantPicker
          value={participantIds}
          onChange={setParticipantIds}
          label={isGroup ? "Участники группы" : "Собеседник"}
        />

        {mutation.isError && (
          <p className="text-sm text-danger-600 dark:text-danger-400">
            Не удалось создать чат. Проверьте права и повторите попытку.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Отмена
          </Button>
          <Button
            type="button"
            loading={mutation.isPending}
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
          >
            {isGroup ? "Создать группу" : "Создать чат"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
