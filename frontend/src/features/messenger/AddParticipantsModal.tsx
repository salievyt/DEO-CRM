"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { messengerApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { ParticipantPicker } from "./ParticipantPicker";

interface AddParticipantsModalProps {
  open: boolean;
  onClose: () => void;
  chatId: string | null;
  existingUserIds: string[];
}

export function AddParticipantsModal({
  open,
  onClose,
  chatId,
  existingUserIds,
}: AddParticipantsModalProps) {
  const queryClient = useQueryClient();
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  const handleClose = () => {
    if (mutation.isPending) return;
    setParticipantIds([]);
    onClose();
  };

  const mutation = useMutation({
    mutationFn: () => messengerApi.chats.addParticipants(chatId!, participantIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHATS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHAT, chatId] });
      setParticipantIds([]);
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={handleClose} title="Добавить участников" size="lg">
      <div className="space-y-4">
        <ParticipantPicker
          value={participantIds}
          onChange={setParticipantIds}
          excludeIds={existingUserIds}
          label="Новые участники"
        />

        {mutation.isError && (
          <p className="text-sm text-danger-600 dark:text-danger-400">
            Не удалось добавить участников. Проверьте права и повторите попытку.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Отмена
          </Button>
          <Button
            type="button"
            loading={mutation.isPending}
            disabled={participantIds.length === 0}
            onClick={() => mutation.mutate()}
          >
            Добавить
          </Button>
        </div>
      </div>
    </Modal>
  );
}
