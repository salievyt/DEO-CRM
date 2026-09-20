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
  LeadAttribute,
} from "@/entities/forms/types";
import { LEAD_ATTRIBUTE_LABELS } from "@/entities/forms/types";

const LEAD_ATTRIBUTES: LeadAttribute[] = [
  "contact_name",
  "phone",
  "email",
  "company_name",
  "telegram",
  "budget",
  "notes",
];

type DraftField = FormField & { rawOptions?: string };

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
  const [linksFor, setLinksFor] = useState<FormTemplate | null>(null);
  const [toDelete, setToDelete] = useState<FormTemplate | null>(null);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (templates || []).filter((t) => {
      if (entityFilter !== "all" && t.entity_type !== entityFilter) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
    });
  }, [templates, search, entityFilter]);

  const filledCount = templates?.reduce((sum, t) => sum + t.filled_count, 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Анкеты"
        description="Публичные анкеты для клиентов и сотрудников"
        actions={
          <Button onClick={() => setEditor({ mode: "create", template: null })}>
            <Plus className="h-4 w-4" />
            Создать шаблон
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileText} label="Шаблонов" value={templates?.length || 0} />
        <StatCard icon={LinkIcon} label="Публичных ссылок" value={templates?.length || 0} />
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
                      {template.entity_type_display} · {template.form_fields.length} пол. · ответов:{" "}
                      {template.filled_count} · {formatLinkLifetime(template.public_link_expires_at)}
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
                    onClick={() => template.public_url && copyToClipboard(template.public_url)}
                    title="Копировать публичную ссылку"
                    icon={<Copy className="h-4 w-4" />}
                  />
                  <ActionButton
                    onClick={() => setLinksFor(template)}
                    title="Ответы"
                    icon={<ListChecks className="h-4 w-4" />}
                  />
                  {template.public_url && (
                    <a
                      href={template.public_url}
                      target="_blank"
                      rel="noreferrer"
                      title="Открыть публичную анкету"
                      className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-brand-600 dark:hover:bg-surface-700 dark:hover:text-brand-300"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
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

      {linksFor && (
        <InvitationsDialog
          template={linksFor}
          onClose={() => setLinksFor(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Удалить шаблон?"
        description={
          toDelete
            ? `Анкета «${toDelete.title}» и все ответы будут удалены безвозвратно.`
            : undefined
        }
        confirmLabel="Удалить"
        onConfirm={() => toDelete && deleteTemplateMutation.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
        loading={deleteTemplateMutation.isPending}
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
  const [linkLifetime, setLinkLifetime] = useState<"1" | "3" | "7" | "forever">(
    getLinkLifetime(template?.public_link_expires_at)
  );
  const [error, setError] = useState("");
  const [fields, setFields] = useState<DraftField[]>(
    template?.form_fields?.length
      ? template.form_fields.map((f) =>
          f.type === "select"
            ? { ...f, rawOptions: (f.options || []).join("\n") }
            : { ...f }
        )
      : [{ key: "", label: "", type: "text", required: false }]
  );
  const [createLead, setCreateLead] = useState(template?.create_lead ?? false);
  const [leadFieldMap, setLeadFieldMap] = useState<Partial<Record<LeadAttribute, string>>>(
    template?.lead_field_map || {}
  );

  const updateField = (index: number, patch: Partial<DraftField>) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const fieldKeyOptions = fields
    .map((f) => f.key.trim())
    .filter(Boolean)
    .map((key) => ({ value: key, label: key }));

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
      if (field.type === "select") {
        const options = (field.rawOptions ?? "")
          .split(/[\n,]/)
          .map((o) => o.trim())
          .filter(Boolean);
        if (options.length === 0) {
          setError(`Укажите варианты для поля «${field.label.trim() || key}».`);
          return;
        }
        cleaned.push({
          key,
          label: field.label.trim() || key,
          type: field.type,
          required: Boolean(field.required),
          options,
        });
      } else {
        cleaned.push({
          key,
          label: field.label.trim() || key,
          type: field.type,
          required: Boolean(field.required),
        });
      }
    }
    if (cleaned.length === 0) {
      setError("Добавьте хотя бы одно поле анкеты.");
      return;
    }
    if (createLead) {
      if (!leadFieldMap.contact_name || !leadFieldMap.contact_name.trim()) {
        setError("Укажите, какое поле анкеты будет контактным именем лида.");
        return;
      }
      const cleanedKeys = new Set(cleaned.map((f) => f.key));
      const missing = Object.values(leadFieldMap).filter(
        (fieldKey) => fieldKey && !cleanedKeys.has(fieldKey)
      );
      if (missing.length > 0) {
        setError(`Поля анкеты не найдены: ${missing.join(", ")}.`);
        return;
      }
    }
    setError("");
    onSave({
      title: title.trim(),
      description,
      entity_type: entityType,
      is_active: isActive,
      link_lifetime: linkLifetime,
      create_lead: createLead,
      lead_field_map: Object.fromEntries(
        Object.entries(leadFieldMap).filter(([, fieldKey]) => fieldKey)
      ),
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
        <div className="grid gap-4 sm:grid-cols-3">
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
          <Select
            label="Срок ссылки"
            value={linkLifetime}
            onChange={(e) =>
              setLinkLifetime(e.target.value as "1" | "3" | "7" | "forever")
            }
            options={[
              { value: "1", label: "1 день" },
              { value: "3", label: "3 дня" },
              { value: "7", label: "7 дней" },
              { value: "forever", label: "Навсегда" },
            ]}
          />
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
                <div className="mt-3">
                  <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-200">
                    Варианты (по одному в строке)
                  </label>
                  <textarea
                    rows={3}
                    value={field.rawOptions ?? ""}
                    onChange={(e) => updateField(index, { rawOptions: e.target.value })}
                    placeholder={"Вариант 1\nВариант 2\nВариант 3"}
                    className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50 dark:placeholder:text-surface-500"
                  />
                  <p className="mt-1 text-sm text-surface-500">
                    {fieldOptionCount(field)
                      ? `Вариантов: ${fieldOptionCount(field)}`
                      : "Каждая строка — отдельный вариант списка"}
                  </p>
                </div>
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

        <div className="rounded-lg border border-surface-200 p-4 dark:border-surface-700">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium text-surface-900 dark:text-white">
                Создавать лид из заявки
              </span>
              <span className="mt-0.5 block text-xs text-surface-500">
                Ответы будут автоматически попадать в лиды воронки
              </span>
            </span>
            <input
              type="checkbox"
              checked={createLead}
              onChange={(e) => setCreateLead(e.target.checked)}
              className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
            />
          </label>

          {createLead && (
            <div className="mt-4 space-y-3 border-t border-surface-100 pt-4 dark:border-surface-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-surface-700 dark:text-surface-200">
                  Какие поля анкеты переносить в лид
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {LEAD_ATTRIBUTES.map((attr) => (
                  <div key={attr}>
                    <Select
                      label={LEAD_ATTRIBUTE_LABELS[attr]}
                      value={leadFieldMap[attr] ?? ""}
                      onChange={(e) =>
                        setLeadFieldMap((prev) => ({
                          ...prev,
                          [attr]: e.target.value,
                        }))
                      }
                      options={[
                        { value: "", label: "— не заполнять —" },
                        ...fieldKeyOptions,
                      ]}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-surface-500">
                Атрибут «контактное имя» обязателен для создания лида.
              </p>
            </div>
          )}
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

function InvitationsDialog({
  template,
  onClose,
}: {
  template: FormTemplate;
  onClose: () => void;
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
      title={`Ответы — ${template.title}`}
      description={`Получено ответов: ${list.length}`}
      size="lg"
    >
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <LoadingSpinner size="lg" text="Загружаем ссылки..." />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title="Ответов пока нет"
          description="Здесь появятся заполненные анкеты"
          icon={<ListChecks className="h-8 w-8" />}
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
                    Ответ от {new Date(invite.submitted_at || invite.created_at).toLocaleString("ru-RU")}
                  </p>
                  <p className="truncate text-xs text-surface-500">
                    {invite.status_display}
                  </p>
                </div>
                {invite.lead_id ? (
                  <Badge variant="success">
                    Лид: {invite.lead_contact_name || "создан"}
                  </Badge>
                ) : (
                  <Badge variant="default">Без лида</Badge>
                )}
              </div>
              <div className="mt-2 space-y-1 rounded bg-surface-50 px-3 py-2 text-xs dark:bg-surface-800">
                {Object.entries(invite.response).map(([key, value]) => (
                  <p key={key} className="text-surface-600 dark:text-surface-300">
                    <span className="font-medium">{key}:</span> {String(value)}
                  </p>
                ))}
              </div>
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

function fieldOptionCount(field: DraftField): number {
  return (field.rawOptions ?? "")
    .split(/[\n,]/)
    .map((o) => o.trim())
    .filter(Boolean).length;
}

function getLinkLifetime(expiresAt?: string | null): "1" | "3" | "7" | "forever" {
  if (!expiresAt) return "forever";
  const days = Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
  if (days <= 1) return "1";
  if (days <= 3) return "3";
  return "7";
}

function formatLinkLifetime(expiresAt: string | null): string {
  if (!expiresAt) return "ссылка бессрочная";
  const date = new Date(expiresAt);
  if (date.getTime() <= Date.now()) return "ссылка истекла";
  return `ссылка до ${date.toLocaleDateString("ru-RU")}`;
}

function extractError(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === "object") {
    const detail = (data as { detail?: unknown }).detail;
    if (detail && typeof detail === "string") return detail;
  }
  return "Попробуйте ещё раз";
}
