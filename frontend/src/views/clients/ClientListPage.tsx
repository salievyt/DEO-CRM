"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2, Tag } from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { DataTable } from "@/shared/ui/Table";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { clientsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDate, formatCurrency } from "@/shared/utils/formatters";
import type { Client } from "@/entities/client/types";
import type { ColumnDef } from "@tanstack/react-table";

const sourceOptions = [
  { value: "website", label: "Сайт" },
  { value: "referral", label: "Рекомендация" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "telegram", label: "Telegram" },
  { value: "call", label: "Звонок" },
  { value: "other", label: "Другое" },
];

export function ClientListPage() {
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.CLIENTS, search],
    queryFn: () => clientsApi.list({ search: search || undefined }),
    select: (res) => res.data,
  });

  const clients: Client[] = data?.results ?? [];

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENTS] });
      setShowCreateModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENTS] }),
  });

  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: "full_name",
      header: "Клиент",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-surface-900 dark:text-white">
            {row.original.full_name}
          </p>
          {row.original.company_name && (
            <p className="text-xs text-surface-500">
              {row.original.company_name}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Телефон",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "source",
      header: "Источник",
      cell: ({ row }) => {
        const source = sourceOptions.find(
          (s) => s.value === row.original.source
        );
        return (
          <span className="text-sm text-surface-600 dark:text-surface-300">
            {source?.label || row.original.source}
          </span>
        );
      },
    },
    {
      accessorKey: "total_projects",
      header: "Проекты",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.total_projects}</span>
      ),
    },
    {
      accessorKey: "total_revenue",
      header: "Выручка",
      cell: ({ row }) => (
        <span className="font-medium text-success-600">
          {formatCurrency(row.original.total_revenue)}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Создан",
      cell: ({ row }) => (
        <span className="text-surface-500">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingClient(row.original);
            }}
            className="rounded p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-700"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Удалить клиента?")) {
                deleteMutation.mutate(row.original.id);
              }
            }}
            className="rounded p-1 text-surface-400 hover:bg-surface-100 hover:text-danger-600 dark:hover:bg-surface-700"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Клиенты"
        description="Управление клиентской базой"
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Добавить клиента
          </Button>
        }
      />

      <Card padding="none">
        <div className="p-4">
          <DataTable
            data={clients}
            columns={columns}
            loading={isLoading}
            searchable
            searchPlaceholder="Поиск клиентов..."
            onRowClick={(row) => {
              window.location.href = `/clients/${row.id}`;
            }}
          />
        </div>
      </Card>

      {clients.length === 0 && !isLoading && (
        <EmptyState
          title="Нет клиентов"
          description="Создайте первого клиента, чтобы начать работу"
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              Добавить клиента
            </Button>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showCreateModal || !!editingClient}
        onClose={() => {
          setShowCreateModal(false);
          setEditingClient(null);
        }}
        title={editingClient ? "Редактировать клиента" : "Новый клиент"}
        size="lg"
      >
        <ClientForm
          client={editingClient}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => {
            setShowCreateModal(false);
            setEditingClient(null);
          }}
        />
      </Modal>
    </div>
  );
}

function ClientForm({
  client,
  onSubmit,
  onCancel,
}: {
  client?: Client | null;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    first_name: client?.first_name || "",
    last_name: client?.last_name || "",
    company_name: client?.company_name || "",
    phone: client?.phone || "",
    email: client?.email || "",
    telegram: client?.telegram || "",
    whatsapp: client?.whatsapp || "",
    address: client?.address || "",
    source: client?.source || "other",
    notes: client?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
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
        <Button variant="secondary" type="button" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit">
          {client ? "Сохранить" : "Создать"}
        </Button>
      </div>
    </form>
  );
}
