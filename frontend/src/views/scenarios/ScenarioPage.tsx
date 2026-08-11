"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Power,
  FlaskConical,
  Zap,
  Search,
  Sparkles,
  ListChecks,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Hash,
  ArrowUpRight,
  MousePointerClick,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select/Select";
import { Modal } from "@/shared/ui/Modal";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { scenariosApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { cn, formatDateTime, timeAgo } from "@/shared/utils/formatters";
import type {
  Scenario,
  ScenarioChannel,
  ScenarioMatchMode,
  ScenarioStats,
  ScenarioTemplate,
  ScenarioTestResult,
  ScenarioTrigger,
} from "@/entities/scenarios/types";

const CHANNEL_LABELS: Record<ScenarioChannel, string> = {
  all: "Все каналы",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

const MATCH_MODE_LABELS: Record<ScenarioMatchMode, string> = {
  any: "Любое слово",
  all: "Все слова",
};

const TRIGGER_STATUS_META: Record<
  string,
  { label: string; variant: "success" | "default" | "danger" | "warning" | "info" }
> = {
  responded: { label: "Отправлен", variant: "success" },
  failed: { label: "Ошибка", variant: "danger" },
  skipped_cooldown: { label: "Кулдаун", variant: "warning" },
  skipped_inactive: { label: "Неактивен", variant: "default" },
  skipped_no_sender: { label: "Нет отправителя", variant: "default" },
};

interface ScenarioForm {
  name: string;
  description: string;
  channel: ScenarioChannel;
  match_mode: ScenarioMatchMode;
  keywords: string;
  reply_text: string;
  cooldown_minutes: number;
  priority: number;
  is_active: boolean;
}

const EMPTY_FORM: ScenarioForm = {
  name: "",
  description: "",
  channel: "all",
  match_mode: "any",
  keywords: "",
  reply_text: "",
  cooldown_minutes: 0,
  priority: 100,
  is_active: true,
};

export function ScenarioPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Scenario | null>(null);
  const [testing, setTesting] = useState<Scenario | null>(null);
  const [showLog, setShowLog] = useState(false);

  const { data: scenarios, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.SCENARIOS, filter],
    queryFn: () => scenariosApi.list(filter === "all" ? {} : { status: filter }),
    select: (res): Scenario[] => res.data?.results || (res.data as Scenario[]),
  });

  const { data: stats } = useQuery({
    queryKey: [QUERY_KEYS.SCENARIO_STATS],
    queryFn: () => scenariosApi.stats(),
    select: (res): ScenarioStats => res.data,
  });

  const { data: triggers } = useQuery({
    queryKey: [QUERY_KEYS.SCENARIO_TRIGGERS],
    queryFn: () => scenariosApi.triggers({ limit: 30 }),
    select: (res): ScenarioTrigger[] => res.data?.results || (res.data as ScenarioTrigger[]),
    enabled: showLog,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return scenarios || [];
    }
    return (scenarios || []).filter(
      (s) => s.name.toLowerCase().includes(q) || s.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [scenarios, search]);

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      scenariosApi.update(id, { is_active: active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCENARIOS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCENARIO_STATS] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scenariosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCENARIOS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCENARIO_STATS] });
    },
  });

  const handleDelete = (scenario: Scenario) => {
    if (window.confirm(`Удалить сценарий «${scenario.name}»? История срабатываний сохранится.`)) {
      deleteMutation.mutate(scenario.id);
    }
  };

  const statCards = [
    {
      label: "Всего сценариев",
      value: stats?.total ?? 0,
      icon: ListChecks,
      tone: "text-brand-600 bg-brand-50 dark:bg-brand-900/20 dark:text-brand-400",
    },
    {
      label: "Активных",
      value: stats?.active ?? 0,
      icon: Zap,
      tone: "text-success-600 bg-success-50 dark:bg-green-900/20 dark:text-green-400",
    },
    {
      label: "Ответов сегодня",
      value: stats?.responded_today ?? 0,
      icon: MessageSquare,
      tone: "text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-400",
    },
    {
      label: "Ошибок отправки",
      value: stats?.failed ?? 0,
      icon: AlertTriangle,
      tone: "text-danger-600 bg-danger-50 dark:bg-red-900/20 dark:text-red-400",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Сценарии"
        description="Автоответы по ключевым словам на входящие сообщения WhatsApp и Telegram"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Создать сценарий
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className="flex items-center gap-3">
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", card.tone)}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-surface-500">{card.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-surface-200 p-0.5 dark:border-surface-700">
          {(["all", "active", "inactive"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === key
                  ? "bg-brand-600 text-white"
                  : "text-surface-500 hover:text-surface-900 dark:hover:text-surface-200"
              )}
            >
              {key === "all" ? "Все" : key === "active" ? "Активные" : "Выключенные"}
            </button>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или ключевым словам..."
            className="w-full rounded-lg border border-surface-300 bg-white py-2 pl-9 pr-3 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50"
          />
        </div>
        <div className="ml-auto">
          <Button variant="secondary" size="sm" onClick={() => setShowLog((v) => !v)}>
            <MousePointerClick className="h-4 w-4" />
            Журнал срабатываний
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-surface-900 dark:text-white">
              {scenarios?.length ? "Ничего не найдено" : "Сценариев пока нет"}
            </h2>
            <p className="mt-1 max-w-md text-sm text-surface-500">
              Создайте сценарий — система будет автоматически отвечать клиентам, когда в сообщении
              встречается ключевое слово: «цена», «стоимость», «сроки» и т.д.
            </p>
            <Button className="mt-5" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Создать сценарий
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onEdit={() => setEditing(scenario)}
              onToggle={(active) => toggleMutation.mutate({ id: scenario.id, active })}
              onDelete={() => handleDelete(scenario)}
              onTest={() => setTesting(scenario)}
              toggling={toggleMutation.isPending && toggleMutation.variables?.id === scenario.id}
            />
          ))}
        </div>
      )}

      {/* Activity log */}
      {showLog && (
        <TriggerLog triggers={triggers} loading={!triggers} onClose={() => setShowLog(false)} />
      )}

      <ScenarioModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        editing={editing}
      />

      <ScenarioTestModal scenario={testing} onClose={() => setTesting(null)} />
    </div>
  );
}

/* ---------------- Scenario card ---------------- */

function ScenarioCard({
  scenario,
  onEdit,
  onToggle,
  onDelete,
  onTest,
  toggling,
}: {
  scenario: Scenario;
  onEdit: () => void;
  onToggle: (_active: boolean) => void;
  onDelete: () => void;
  onTest: () => void;
  toggling: boolean;
}) {
  return (
    <Card className={cn(!scenario.is_active && "opacity-80")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-surface-900 dark:text-white">{scenario.name}</h3>
            <Badge variant={scenario.is_active ? "success" : "default"}>
              {scenario.is_active ? "Активен" : "Выключен"}
            </Badge>
            <Badge variant="outline">
              {CHANNEL_LABELS[scenario.channel] || scenario.channel_display}
            </Badge>
            <Badge variant="outline">
              {MATCH_MODE_LABELS[scenario.match_mode] || scenario.match_mode_display}
            </Badge>
          </div>
          {scenario.description && (
            <p className="mt-1 text-sm text-surface-500">{scenario.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onTest}
            title="Проверить на тексте"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800 dark:hover:bg-surface-700 dark:hover:text-surface-200"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Проверить
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-200"
            aria-label="Редактировать"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-red-900/20"
            aria-label="Удалить"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onToggle(!scenario.is_active)}
            disabled={toggling}
            title={scenario.is_active ? "Выключить" : "Включить"}
            className={cn(
              "ml-1 rounded-lg p-2 transition-colors",
              scenario.is_active
                ? "text-success-600 hover:bg-success-50 dark:hover:bg-green-900/20"
                : "text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700"
            )}
          >
            <Power className={cn("h-4 w-4", toggling && "animate-pulse")} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {scenario.keywords.map((kw) => (
          <span
            key={kw}
            className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-medium text-surface-700 dark:bg-surface-700 dark:text-surface-200"
          >
            <Hash className="h-3 w-3" />
            {kw}
          </span>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-success-200 bg-success-50/60 px-3 py-2.5 dark:border-green-800 dark:bg-green-900/10">
        <p className="flex items-start gap-2 text-sm text-surface-700 dark:text-surface-200">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-success-600 dark:text-success-400" />
          <span>{scenario.reply_text}</span>
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-surface-400">
        <span className="inline-flex items-center gap-1">
          <Zap className="h-3 w-3" />
          Срабатываний: {scenario.trigger_count}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {scenario.cooldown_minutes > 0
            ? `Кулдаун ${scenario.cooldown_minutes} мин`
            : "Без кулдауна"}
        </span>
        <span className="inline-flex items-center gap-1">Приоритет: {scenario.priority}</span>
        {scenario.last_triggered_at && (
          <span>Последний ответ: {timeAgo(scenario.last_triggered_at)}</span>
        )}
        <span className="ml-auto">
          {scenario.created_by_name ? `Создал ${scenario.created_by_name}` : "Создан"} •{" "}
          {formatDateTime(scenario.created_at)}
        </span>
      </div>
    </Card>
  );
}

/* ---------------- Activity log ---------------- */

function TriggerLog({
  triggers,
  loading,
  onClose,
}: {
  triggers?: ScenarioTrigger[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
          <MousePointerClick className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          Журнал срабатываний
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
        >
          Скрыть
        </button>
      </div>
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : triggers && triggers.length > 0 ? (
        <div className="space-y-2">
          {triggers.map((t) => {
            const meta = TRIGGER_STATUS_META[t.status] || TRIGGER_STATUS_META.responded;
            return (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-surface-200 px-3 py-2.5 dark:border-surface-700"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                    {t.client_name || "Клиент"}
                    <span className="font-normal text-surface-400"> → </span>
                    {t.scenario_name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-surface-500">
                    «{t.message_preview || "—"}» · ключ «{t.matched_keyword || "—"}»
                  </p>
                  {t.status === "failed" && t.error_message && (
                    <p className="mt-0.5 truncate text-xs text-danger-600 dark:text-danger-400">
                      {t.error_message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {t.status === "responded" && (
                    <p className="hidden max-w-[220px] truncate text-xs text-success-600 dark:text-success-400 sm:block">
                      «{t.reply_preview || "—"}»
                    </p>
                  )}
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  <span className="text-[11px] text-surface-400">{timeAgo(t.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-surface-400">
          Срабатываний пока нет — они появятся после входящих сообщений с ключевыми словами.
        </p>
      )}
    </Card>
  );
}

/* ---------------- Create / edit modal ---------------- */

function ScenarioModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Scenario | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(editing);
  const [form, setForm] = useState<ScenarioForm>(EMPTY_FORM);
  const [templateApplied, setTemplateApplied] = useState(false);

  const { data: templates } = useQuery({
    queryKey: [QUERY_KEYS.SCENARIO_TEMPLATES],
    queryFn: () => scenariosApi.templates(),
    select: (res): ScenarioTemplate[] => res.data?.results || (res.data as ScenarioTemplate[]),
    enabled: open && !isEdit,
  });

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              name: editing.name,
              description: editing.description,
              channel: editing.channel,
              match_mode: editing.match_mode,
              keywords: editing.keywords.join(", "),
              reply_text: editing.reply_text,
              cooldown_minutes: editing.cooldown_minutes,
              priority: editing.priority,
              is_active: editing.is_active,
            }
          : EMPTY_FORM
      );
      setTemplateApplied(false);
    }
  }, [open, editing]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEdit ? scenariosApi.update(editing!.id, data) : scenariosApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCENARIOS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCENARIO_STATS] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keywords = form.keywords
      .split(/[,;\n]/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (!keywords.length) {
      return;
    }
    saveMutation.mutate({
      name: form.name.trim(),
      description: form.description.trim(),
      channel: form.channel,
      match_mode: form.match_mode,
      keywords,
      reply_text: form.reply_text,
      cooldown_minutes: Number(form.cooldown_minutes) || 0,
      priority: Number(form.priority) || 100,
      is_active: form.is_active,
    });
  };

  const applyTemplate = (t: ScenarioTemplate) => {
    setForm({
      name: t.name,
      description: t.description,
      channel: t.channel,
      match_mode: t.match_mode,
      keywords: t.keywords.join(", "),
      reply_text: t.reply_text,
      cooldown_minutes: t.cooldown_minutes,
      priority: 100,
      is_active: true,
    });
    setTemplateApplied(true);
  };

  const set = (patch: Partial<ScenarioForm>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Редактировать сценарий" : "Новый сценарий"}
      description={
        isEdit
          ? "Измените параметры автоответа"
          : "Настройте, на какие сообщения отвечать автоматически"
      }
      size="lg"
    >
      {!isEdit && templates && templates.length > 0 && !templateApplied && (
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">
            Начните с шаблона:
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {templates.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => applyTemplate(t)}
                className="rounded-lg border border-surface-200 bg-surface-50 p-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
              >
                <p className="text-sm font-semibold text-surface-900 dark:text-white">{t.name}</p>
                <p className="mt-0.5 text-xs text-surface-500">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Название"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Например: Вопрос о цене"
          required
        />
        <Input
          label="Описание (необязательно)"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Когда срабатывает и что делает"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Канал"
            value={form.channel}
            onChange={(e) => set({ channel: e.target.value as ScenarioChannel })}
            options={[
              { value: "all", label: "Все каналы" },
              { value: "whatsapp", label: "WhatsApp" },
              { value: "telegram", label: "Telegram" },
            ]}
          />
          <Select
            label="Режим совпадения"
            value={form.match_mode}
            onChange={(e) => set({ match_mode: e.target.value as ScenarioMatchMode })}
            options={[
              { value: "any", label: "Любое из слов" },
              { value: "all", label: "Все слова сразу" },
            ]}
          />
        </div>
        <Input
          label="Ключевые слова"
          value={form.keywords}
          onChange={(e) => set({ keywords: e.target.value })}
          placeholder="цена, стоимость, сколько стоит"
          hint="Через запятую. Совпадение без учёта регистра и по подстроке"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Кулдаун, минут"
            type="number"
            min={0}
            value={form.cooldown_minutes}
            onChange={(e) => set({ cooldown_minutes: Number(e.target.value) })}
            hint="0 — отвечать на каждое сообщение"
          />
          <Input
            label="Приоритет"
            type="number"
            min={1}
            value={form.priority}
            onChange={(e) => set({ priority: Number(e.target.value) })}
            hint="Меньше число — выше приоритет при совпадении нескольких сценариев"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">
            Текст ответа
          </label>
          <textarea
            value={form.reply_text}
            onChange={(e) => set({ reply_text: e.target.value })}
            rows={4}
            required
            placeholder="Здравствуйте! Стоимость разработки зависит от объёма — пришлите, пожалуйста, техзадание, и мы рассчитаем точную цену."
            className="mt-1 block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 transition-colors placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50 dark:placeholder:text-surface-500"
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-200">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set({ is_active: e.target.checked })}
              className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-600"
            />
            Сценарий активен
          </label>
        </div>

        {saveMutation.isError && (
          <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <span className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{extractError(saveMutation.error)}</span>
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
            disabled={saveMutation.isPending}
          >
            Отмена
          </Button>
          <Button type="submit" loading={saveMutation.isPending}>
            {isEdit ? "Сохранить" : "Создать"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Test modal ---------------- */

function ScenarioTestModal({
  scenario,
  onClose,
}: {
  scenario: Scenario | null;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScenarioTestResult | null>(null);

  useEffect(() => {
    if (scenario) {
      setText("");
      setResult(null);
    }
  }, [scenario]);

  const testMutation = useMutation({
    mutationFn: () => scenariosApi.test(scenario!.id, text.trim()),
    onSuccess: (res) => setResult(res.data),
    onError: (err) => setResult({ matched: false, message: extractError(err) }),
  });

  return (
    <Modal
      open={Boolean(scenario)}
      onClose={onClose}
      title="Проверка сценария"
      description={scenario ? `Как реагирует «${scenario.name}» на текст` : undefined}
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">
            Сообщение клиента
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Например: Сколько стоит разработка сайта?"
            className="mt-1 block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 transition-colors placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50 dark:placeholder:text-surface-500"
          />
        </div>

        <Button
          onClick={() => testMutation.mutate()}
          loading={testMutation.isPending}
          disabled={!text.trim()}
          className="w-full"
        >
          <FlaskConical className="h-4 w-4" />
          Проверить
        </Button>

        {result && (
          <div
            className={cn(
              "flex items-start gap-2.5 rounded-lg border p-3 text-sm",
              result.matched
                ? "border-success-200 bg-success-50 text-success-700 dark:border-success-800 dark:bg-green-900/20 dark:text-green-300"
                : "border-surface-200 bg-surface-50 text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
            )}
          >
            {result.matched ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="space-y-1">
              {result.matched ? (
                <>
                  <p className="font-medium">
                    Совпадение по слову «{result.keyword}» — клиенту будет отправлен ответ.
                  </p>
                  <p className="flex items-start gap-1.5">
                    <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {result.reply}
                  </p>
                </>
              ) : (
                <p>{result.message || "Совпадений нет — автоответ не сработает."}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ---------------- helpers ---------------- */

function extractError(error: unknown): string {
  const axiosError = error as { response?: { data?: unknown } };
  const data = axiosError?.response?.data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.error === "string") {
      return obj.error;
    }
    if (typeof obj.detail === "string") {
      return obj.detail;
    }
    const firstKey = Object.keys(obj)[0];
    const firstValue = firstKey ? obj[firstKey] : undefined;
    if (firstValue && Array.isArray(firstValue)) {
      return String(firstValue[0]);
    }
    if (typeof firstValue === "string") {
      return firstValue;
    }
  }
  return "Не удалось выполнить операцию. Попробуйте ещё раз.";
}
