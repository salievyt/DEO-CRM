"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Modal } from "@/shared/ui/Modal";

const sourceOptions = [
  { value: "website", label: "Сайт" },
  { value: "referral", label: "Рекомендация" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "telegram", label: "Telegram" },
  { value: "call", label: "Звонок" },
  { value: "other", label: "Другое" },
];

interface CreateClientModalProps {
  open: boolean;
  onClose: () => void;
  editData?: Record<string, any> | null;
}

export function CreateClientModal({ open, onClose, editData }: CreateClientModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    first_name: editData?.first_name || "",
    last_name: editData?.last_name || "",
    company_name: editData?.company_name || "",
    phone: editData?.phone || "",
    email: editData?.email || "",
    telegram: editData?.telegram || "",
    whatsapp: editData?.whatsapp || "",
    address: editData?.address || "",
    source: editData?.source || "other",
    notes: editData?.notes || "",
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editData ? clientsApi.update(editData.id, data) : clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENTS] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editData ? "Редактировать клиента" : "Новый клиент"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Имя"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            required
          />
          <Input
            label="Фамилия"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            required
          />
        </div>
        <Input
          label="Компания"
          value={form.company_name}
          onChange={(e) => setForm({ ...form, company_name: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Телефон"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Telegram"
            value={form.telegram}
            onChange={(e) => setForm({ ...form, telegram: e.target.value })}
          />
          <Input
            label="WhatsApp"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          />
        </div>
        <Input
          label="Адрес"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <Select
          label="Источник"
          options={sourceOptions}
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
        />
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">
            Заметки
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="input mt-1"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {editData ? "Сохранить" : "Создать"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
