"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";

import { formsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { cn } from "@/shared/utils/cn";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Modal } from "@/shared/ui/Modal";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { toast } from "@/shared/ui/Toast";
import type {
  FormEntityType,
  FormField,
  FormFieldType,
  FormInvitation,
  FormTemplate,
} from "@/entities/forms/types";

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Текст" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Телефон" },
  { value: "textarea", label: "Текст (многострочный)" },
  { value: "select", label: "Выбор из списка" },
];

const ENTITY_TYPES: { value: FormEntityType | "all"; label: string }[] = [
  { value: "all", label: "Все типы" },
  { value: "client", label: "Анкета клиента" },
  { value: "employee", label: "Анкета сотрудника" },
  { value: "other", label: "Другое" },
];

export function AdminFormsPage() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<FormEntityType | "all">("all");
  const [editor, setEditor] = useState<{
    mode: "create" | "edit";
    template: FormTemplate | null;
  } | null>(null);
  const [linkFor, setLinkFor] = useState<FormTemplate | null>(null);
  const [linksFor, setLinksFor] = useState<FormTemplate | null>(null);
  const [toDelete, setToDelete] = useState<FormTemplate | null>(null);
  const [toDeleteInvite, setToDeleteInvite] = useState<FormInvitation | null>(null);
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.FORM_TEMPLATES],
    queryFn: () => formsApi.templates.list(),
    select: (res): FormTemplate[] => res.data?.results || [],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FORM_TEMPLATES] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FORM_INVITATIONS] });
  };

  const saveTemplateMutation = useMutation({
    mutationFn: (data: { id?: string; payload: Record<string, unknown> }) =>
      data.id
        ? formsApi.templates.update(data.id, data.payload)
        : formsApi.templates.create(data.payload),
    onSuccess: () => {
      invalidate();
      setEditor(null);
      toast({ title: "Сохранено", type: "success" });
    },
    onError: (err: unknown) => {
      toast({
        title: "Не удалось сохранить шаблон",
        message: extractError(err),
        type: "error",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => formsApi.templates.remove(id),
    onSuccess: () => {
      invalidate();
      setToDelete(null);
      toast({ title: "Шаблон удалён", type: "success" });
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: (id: string) => formsApi.invitations.remove(id),
    onSuccess: () => {
      invalidate();
      setToDeleteInvite(null);
      toast({ title: "Ссылка удалена", type: "success" });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (templates || []).filter((t) => {
      if (entityFilter !== "all" && t.entity_type !== entityFilter) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
    });
  }, [templates, search, entityFilter]);

  const linkCount = templates?.reduce((sum, t) => sum + t.link_count, 0) || 0;
  const filledCount = templates?.reduce((sum, t) => sum + t.filled_count, 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Анкеты"
        description="Шаблоны анкет и ссылки для заполнения клиентами и сотрудниками"
        actions={
          <Button onClick={() => setEditor({ mode: "create", template: null })}>
            <Plus className="h-4 w-4" />
            Создать шаблон
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileText} label="Шаблонов" value={templates?.length || 0} />
        <StatCard icon={LinkIcon} label="Ссылок создано" value={linkCount} />
        <StatCard icon={ListChecks} label="Заполнено" value={filledCount} />
        <StatCard
          icon={Users}
          label="Клиентских анкет"
          value={templates?.filter((t) => t.entity_type === "client").length || 0}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {ENTITY_TYPES.map((option) => (
            <FilterChip
              key={option.value}
              active={entityFilter === option.value}
              onClick={() => setEntityFilter(option.value)}
              label={option.label}
            />
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по анкетам..."
            className="input pl-10"
          />
        </div>
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" text="Загружаем анкеты..." />
          </div>
        ) : !templates || templates.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Шаблонов пока нет"
              description="Создайте первый шаблон анкеты"
              icon={<ClipboardList className="h-10 w-10" />}
              action={
                <Button onClick={() => setEditor({ mode: "create", template: null })}>
                  <Plus className="h-4 w-4" />
                  Создать шаблон
                </Button>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Ничего не найдено"
              description="Попробуйте изменить запрос или сбросить фильтры"
              icon={<Search className="h-10 w-10" />}
            />
          </div>
        ) : (
          <div className="divide-y divide-surface-200 dark:divide-surface-700">
            {filtered.map((template) => (
              <div
                key={template.id}
                className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-surface-50/60 dark:hover:bg-surface-700/30 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-surface-900 dark:text-white">
                        {template.title}
                      </span>
                      <Badge variant={template.is_active ? "success" : "default"} dot>
                        {template.is_active ? "Активна" : "Неактивна"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-surface-500">
                      {template.entity_type_display} · {template.form_fields.length} пол. · ссылок:{" "}
                      {template.link_count} · заполнено: {template.filled_count}
                    </p>
                    {template.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-surface-400">
                        {template.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <ActionButton
                    onClick={() => setLinkFor(template)}
                    title="Создать ссылку"
                    icon={<LinkIcon className="h-4 w-4" />}
                  />
                  <ActionButton
                    onClick={() => setLinksFor(template)}
                    title="Ссылки"
                    icon={<ExternalLink className="h-4 w-4" />}
                  />
                  <ActionButton
                    onClick={() => setEditor({ mode: "edit", template })}
                    title="Редактировать"
                    icon={<Pencil className="h-4 w-4" />}
                  />
                  <button
                    type="button"
                    onClick={() => setToDelete(template)}
                    title="Удалить"
                    className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editor && (
        <TemplateEditorDialog
          mode={editor.mode}
          template={editor.template}
          loading={saveTemplateMutation.isPending}
          onSave={(payload) =>
            saveTemplateMutation.mutate({
              id: editor.template?.id,
              payload,
            })
          }
          onClose={() => setEditor(null)}
        />
      )}

      {linkFor && <GenerateLinkDialog template={linkFor} onClose={() => setLinkFor(null)} />}

      {linksFor && (
        <InvitationsDialog
          template={linksFor}
          onClose={() => setLinksFor(null)}
          onDelete={(invite) => setToDeleteInvite(invite)}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Удалить шаблон?"
        description={
          toDelete
            ? `Шаблон «${toDelete.title}» и все его ссылки будут удалены безвозвратно.`
            : undefined
        }
        confirmLabel="Удалить"
        onConfirm={() => toDelete && deleteTemplateMutation.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
        loading={deleteTemplateMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(toDeleteInvite)}
        title="Удалить ссылку?"
        description="Генерированная ссылка перестанет работать."
        confirmLabel="Удалить"
        onConfirm={() => toDeleteInvite && deleteInviteMutation.mutate(toDeleteInvite.id)}
        onCancel={() => setToDeleteInvite(null)}
        loading={deleteInviteMutation.isPending}
      />
    </div>
  );
}

function TemplateEditorDialog({
  mode,
  template,
  loading,
  onSave,
  onClose,
}: {
  mode: "create" | "edit";
  template: FormTemplate | null;
  loading: boolean;
  onSave: (payload: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(template?.title || "");
  const [description, setDescription] = useState(template?.description || "");
  const [entityType, setEntityType] = useState<FormEntityType>(template?.entity_type || "client");
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<FormField[]>(
    template?.form_fields?.length
      ? template.form_fields
      : [{ key: "", label: "", type: "text", required: false }]
  );

  const updateField = (index: number, patch: Partial<FormField>) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const save = () => {
    if (!title.trim()) {
      setError("Укажите название анкеты.");
      return;
    }
    const cleaned: FormField[] = [];
    for (const field of fields) {
      const key = field.key.trim();
      if (!key) continue;
      if (cleaned.some((f) => f.key === key)) {
        setError(`Дублируется ключ поля: ${key}.`);
        return;
      }
      cleaned.push({
        key,
        label: field.label.trim() || key,
        type: field.type,
        required: Boolean(field.required),
        options:
          field.type === "select" ? (field.options || []).filter((o) => o.trim()) : undefined,
      });
    }
    if (cleaned.length === 0) {
      setError("Добавьте хотя бы одно поле анкеты.");
      return;
    }
    setError("");
    onSave({
      title: title.trim(),
      description,
      entity_type: entityType,
      is_active: isActive,
      form_fields: cleaned,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "create" ? "Новый шаблон анкеты" : "Редактировать шаблон"}
      description="Определите поля анкеты, которые получатель будет заполнять по ссылке"
      size="lg"
    >
      <div className="space-y-4">
        <Input
          label="Название"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Анкета нового клиента"
        />
        <Input
          label="Описание"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Короткое описание, показывается на странице анкеты"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Тип анкеты"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as FormEntityType)}
            options={ENTITY_TYPES.filter((o) => o.value !== "all").map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
          <label className="flex items-end gap-2 pb-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm font-medium text-surface-700 dark:text-surface-200">
              Анкета активна
            </span>
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-surface-700 dark:text-surface-200">
              Поля анкеты
            </p>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() =>
                setFields((prev) => [
                  ...prev,
                  { key: "", label: "", type: "text", required: false },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Добавить поле
            </Button>
          </div>

          {fields.map((field, index) => (
            <div
              key={index}
              className="rounded-lg border border-surface-200 p-3 dark:border-surface-700"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Ключ"
                  value={field.key}
                  onChange={(e) => updateField(index, { key: e.target.value })}
                  placeholder="company_name"
                  hint="Латиницей, без пробелов"
                />
                <Input
                  label="Подпись"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  placeholder="Название компании"
                />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Select
                  label="Тип"
                  value={field.type}
                  onChange={(e) =>
                    updateField(index, {
                      type: e.target.value as FormFieldType,
                      options: e.target.value === "select" ? [] : undefined,
                    })
                  }
                  options={FIELD_TYPES.map((f) => ({ value: f.value, label: f.label }))}
                />
                <label className="flex items-end gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={Boolean(field.required)}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                    className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-200">
                    Обязательное
                  </span>
                </label>
              </div>
              {field.type === "select" && (
                <Input
                  className="mt-3"
                  label="Варианты (через запятую)"
                  value={(field.options || []).join(", ")}
                  onChange={(e) =>
                    updateField(index, {
                      options: e.target.value
                        .split(",")
                        .map((o) => o.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Вариант 1, Вариант 2, Вариант 3"
                />
              )}
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-danger-600 transition-colors hover:bg-danger-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Удалить поле
                </button>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-surface-200 pt-4 dark:border-surface-700">
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={save} loading={loading}>
            {mode === "create" ? "Создать" : "Сохранить"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function GenerateLinkDialog({
  template,
  onClose,
}: {
  template: FormTemplate;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [expiresDays, setExpiresDays] = useState("7");
  const [link, setLink] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => formsApi.invitations.create(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FORM_INVITATIONS] });
      setLink((res.data?.answer_url as string) || null);
      toast({ title: "Ссылка создана", type: "success" });
    },
    onError: (err: unknown) => {
      toast({
        title: "Не удалось создать ссылку",
        message: extractError(err),
        type: "error",
      });
    },
  });

  const generate = () => {
    const now = new Date();
    const days = Math.max(1, Number(expiresDays) || 7);
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    mutation.mutate({
      form: template.id,
      recipient_name: recipientName.trim(),
      recipient_email: recipientEmail.trim(),
      expires_at: expiresAt.toISOString(),
    });
  };

  const reset = () => {
    setLink(null);
    setRecipientName("");
    setRecipientEmail("");
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Создать ссылку на анкету"
      description={`«${template.title}» — получатель сможет заполнить анкету без авторизации`}
    >
      {link ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-success-500/40 bg-success-50 p-3 text-sm text-success-700 dark:border-green-500/30 dark:bg-green-900/20 dark:text-green-300">
            Ссылка создана. Отправьте её получателю.
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">
              Ссылка на анкету
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
                className="input flex-1 font-mono text-xs"
              />
              <Button variant="secondary" onClick={() => copyToClipboard(link)}>
                <Copy className="h-4 w-4" />
                Копировать
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-surface-200 pt-4 dark:border-surface-700">
            <Button variant="secondary" onClick={reset}>
              Создать ещё одну
            </Button>
            <Button onClick={onClose}>Готово</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="Имя получателя"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Иван Петров"
          />
          <Input
            label="Email получателя"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="client@example.com"
          />
          <Input
            label="Срок действия (дней)"
            type="number"
            min={1}
            value={expiresDays}
            onChange={(e) => setExpiresDays(e.target.value)}
          />
          <div className="flex justify-end gap-3 border-t border-surface-200 pt-4 dark:border-surface-700">
            <Button variant="secondary" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={generate} loading={mutation.isPending}>
              Сгенерировать ссылку
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function InvitationsDialog({
  template,
  onClose,
  onDelete,
}: {
  template: FormTemplate;
  onClose: () => void;
  onDelete: (invite: FormInvitation) => void;
}) {
  const { data: invitations, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.FORM_INVITATIONS, template.id],
    queryFn: () => formsApi.invitations.list({ form: template.id, page_size: 100 }),
    select: (res): FormInvitation[] => res.data?.results || [],
  });

  const list = invitations || [];

  return (
    <Modal
      open
      onClose={onClose}
      title={`Ссылки — ${template.title}`}
      description={`Создано ссылок: ${list.length}`}
      size="lg"
    >
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <LoadingSpinner size="lg" text="Загружаем ссылки..." />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title="Ссылок ещё нет"
          description="Сгенерируйте первую ссылку для этой анкеты"
          icon={<LinkIcon className="h-8 w-8" />}
        />
      ) : (
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {list.map((invite) => (
            <div
              key={invite.id}
              className="rounded-lg border border-surface-200 p-3 dark:border-surface-700"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                    {invite.recipient_name || invite.recipient_email || "Без имени"}
                  </p>
                  <p className="truncate text-xs text-surface-500">
                    {invite.recipient_email || "Нет email"} · {invite.status_display}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {invite.answer_url && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(invite.answer_url!)}
                      title="Скопировать ссылку"
                      className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-brand-600 dark:hover:bg-surface-700 dark:hover:text-brand-300"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(invite)}
                    title="Удалить"
                    className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {invite.answer_url && (
                <p className="mt-1 truncate rounded bg-surface-50 px-2 py-1 font-mono text-[11px] text-surface-500 dark:bg-surface-800">
                  {invite.answer_url}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-sm text-surface-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">{value}</p>
      </div>
      <div className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
        <Icon className="h-5 w-5" />
      </div>
    </Card>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
        active
          ? "border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-600/20"
          : "border-surface-200 bg-white text-surface-600 hover:border-brand-300 hover:text-brand-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:border-brand-500/50 dark:hover:text-brand-300"
      )}
    >
      {label}
    </button>
  );
}

function ActionButton({
  onClick,
  title,
  icon,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-200"
    >
      {icon}
    </button>
  );
}

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(
      () => toast({ title: "Ссылка скопирована", type: "success" }),
      () => toast({ title: "Не удалось скопировать", type: "error" })
    );
  }
}

function extractError(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === "object") {
    const detail = (data as { detail?: unknown }).detail;
    if (detail && typeof detail === "string") return detail;
  }
  return "Попробуйте ещё раз";
}
