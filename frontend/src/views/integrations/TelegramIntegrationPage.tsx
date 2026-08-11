"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  Send,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  KeyRound,
  Globe,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Star,
  PlugZap,
  MessageSquareText,
  Users,
  Bot,
  MousePointerClick,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { messagingApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDateTime, cn } from "@/shared/utils/formatters";
import type { TelegramAccount } from "@/entities/inbox/types";

const STATUS_META: Record<
  string,
  { label: string; variant: "success" | "default" | "danger" | "warning" }
> = {
  active: { label: "Активен", variant: "success" },
  disabled: { label: "Отключён", variant: "default" },
  invalid_credentials: { label: "Неверные учётные данные", variant: "danger" },
  rate_limited: { label: "Превышен лимит", variant: "warning" },
};

const FEATURES = [
  {
    icon: MessageSquareText,
    title: "Все диалоги в одной CRM",
    text: "Переписка с клиентами из Telegram попадает в общий мессенджер рядом с WhatsApp",
  },
  {
    icon: Users,
    title: "Авто-создание карточек лидов",
    text: "Новый клиент, написавший боту, автоматически появляется в базе клиентов",
  },
  {
    icon: Bot,
    title: "AI-ответы и сценарии",
    text: "Подключайте AI-ассистента и сценарии ответов, чтобы обрабатывать запросы быстрее",
  },
];

interface TestResult {
  ok: boolean;
  message: string;
}

export function TelegramIntegrationPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TelegramAccount | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const { data: accounts, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.TELEGRAM_ACCOUNTS],
    queryFn: () => messagingApi.telegram.accounts.list(),
    select: (res): TelegramAccount[] =>
      res.data?.results || (res.data as TelegramAccount[]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => messagingApi.telegram.accounts.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TELEGRAM_ACCOUNTS] }),
  });

  const handleDelete = (account: TelegramAccount) => {
    if (
      window.confirm(
        `Удалить Telegram бота «${account.name}»? Диалоги и история сохранятся.`
      )
    ) {
      deleteMutation.mutate(account.id);
    }
  };

  const webhookBase = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/v1/webhooks/telegram/`;
  }, []);

  const handleCopyWebhook = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (account: TelegramAccount) => {
    setEditing(account);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Telegram — Официальная интеграция"
        description="Общайтесь с клиентами через Telegram Bot, не покидая CRM"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Подключить бота
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : accounts && accounts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={() => openEdit(account)}
              onDelete={() => handleDelete(account)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400">
              <Send className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-surface-900 dark:text-white">
              Telegram интеграция не настроена
            </h2>
            <p className="mt-1 max-w-md text-sm text-surface-500">
              Подключите Telegram-бота, чтобы общаться с клиентами и собирать
              лиды прямо в CRM
            </p>
            <div className="mt-6 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-surface-200 bg-surface-50/60 p-4 text-left dark:border-surface-700 dark:bg-surface-800/40"
                >
                  <feature.icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  <p className="mt-2 text-sm font-semibold text-surface-900 dark:text-white">
                    {feature.title}
                  </p>
                  <p className="mt-1 text-xs text-surface-500">{feature.text}</p>
                </div>
              ))}
            </div>
            <Button className="mt-6" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Подключить бота
            </Button>
            <p className="mt-3 text-xs text-surface-400">
              Создайте бота через @BotFather и вставьте его токен — это займёт
              пару минут
            </p>
          </div>
        </Card>
      )}

      {/* Webhook + setup guide */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
            <Globe className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            Webhook для входящих сообщений
          </h3>
          <p className="mt-1 text-xs text-surface-500">
            У каждого бота свой адрес webhook: нажмите «Настроить webhook» на
            карточке бота, и система сама подключит приём входящих сообщений.
            Формат адреса:
          </p>
          <div className="mt-4 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200">
              {webhookBase}
              {"<bot_username>/"}
            </code>
            <Button
              variant="secondary"
              onClick={() => handleCopyWebhook(webhookBase)}
              aria-label="Скопировать префикс"
            >
              {copiedUrl ? (
                <Check className="h-4 w-4 text-success-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-surface-400">
            Telegram требует уникальный URL для каждого бота, поэтому адрес
            привязан к username. Webhook защищён секретным токеном.
          </p>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Для продакшена обязателен HTTPS. В локальной разработке можно
                использовать туннель (ngrok) и переменную{" "}
                <code>TELEGRAM_WEBHOOK_BASE_URL</code>.
              </span>
            </p>
          </div>
        </Card>

        <Card>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
            <MousePointerClick className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            Как создать и подключить бота
          </h3>
          <ol className="mt-4 space-y-3 text-sm text-surface-600 dark:text-surface-300">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-600 dark:bg-sky-900/20 dark:text-sky-400">
                1
              </span>
              <span>
                Откройте{" "}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-brand-600 hover:underline"
                >
                  @BotFather <ExternalLink className="h-3 w-3" />
                </a>{" "}
                в Telegram и отправьте команду{" "}
                <code className="rounded bg-surface-100 px-1.5 py-0.5 text-xs dark:bg-surface-800">
                  /newbot
                </code>
                .
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-600 dark:bg-sky-900/20 dark:text-sky-400">
                2
              </span>
              <span>
                Придумайте имя и username бота — вы получите{" "}
                <b>bot token</b> (вида{" "}
                <code className="rounded bg-surface-100 px-1.5 py-0.5 text-xs dark:bg-surface-800">
                  123456:ABC-DEF...
                </code>
                ).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-600 dark:bg-sky-900/20 dark:text-sky-400">
                3
              </span>
              <span>
                Введите токен в форме «Подключить бота» и нажмите{" "}
                <b>«Проверить бота»</b> — система запросит getMe и покажет имя и
                username бота. Сохранять ничего не нужно.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-600 dark:bg-sky-900/20 dark:text-sky-400">
                4
              </span>
              <span>
                Нажмите <b>«Подключить»</b>, а затем{" "}
                <b>«Настроить webhook»</b> на карточке бота — входящие
                сообщения начнут появляться в мессенджере CRM.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-600 dark:bg-sky-900/20 dark:text-sky-400">
                5
              </span>
              <span>
                Напишите боту первым сообщением <b>«/start»</b> — клиент
                создастся в базе автоматически.
              </span>
            </li>
          </ol>
        </Card>
      </div>

      {/* Security note */}
      <Card className="flex items-start gap-3 border-success-200 bg-success-50/50 dark:border-green-800 dark:bg-green-900/10">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-600 dark:text-success-400" />
        <div className="text-sm text-surface-600 dark:text-surface-300">
          <p className="font-medium text-surface-900 dark:text-white">Безопасность</p>
          <p className="mt-1">
            Bot token шифруется на сервере (SECRET_KEY) и никогда не возвращается
            API, во фронтенд или в логи. Webhook проверяется по секретному токену
            (X-Telegram-Bot-Api-Secret-Token). Работает только официальное
            Telegram Bot API.
          </p>
        </div>
      </Card>

      <TelegramBotModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        editing={editing}
      />
    </div>
  );
}

/* ---------------- Account card ---------------- */

function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: TelegramAccount;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [webhookResult, setWebhookResult] = useState<TestResult | null>(null);

  const testMutation = useMutation({
    mutationFn: () => messagingApi.telegram.accounts.testById(account.id),
    onSuccess: (res) => {
      setTestResult(extractTestResult(res.data));
    },
    onError: (err) => {
      setTestResult(extractTestResult((err as AxiosError)?.response?.data));
    },
  });

  const webhookMutation = useMutation({
    mutationFn: () => messagingApi.telegram.accounts.webhook(account.id),
    onSuccess: (res) => {
      const data = res.data as { ok: boolean; url?: string; error?: string };
      setWebhookResult(
        data.ok && data.url
          ? { ok: true, message: `Webhook настроен: ${data.url}` }
          : { ok: false, message: data.error || "Не удалось настроить webhook" }
      );
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TELEGRAM_ACCOUNTS] });
    },
    onError: (err) => {
      setWebhookResult(extractTestResult((err as AxiosError)?.response?.data));
    },
  });

  const status = STATUS_META[account.status] || STATUS_META.disabled;

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400">
            <Send className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-semibold text-surface-900 dark:text-white">
              {account.name}
              {account.is_default && (
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              )}
            </p>
            <p className="flex items-center gap-1 text-xs text-surface-500">
              {account.bot_username ? (
                <>@{account.bot_username}</>
              ) : (
                "username не определён"
              )}
            </p>
          </div>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <div className="mt-4 space-y-2 rounded-lg bg-surface-50 p-3 text-xs dark:bg-surface-800/60">
        <p className="flex items-center justify-between gap-2">
          <span className="text-surface-400">Имя бота</span>
          <span className="truncate text-surface-700 dark:text-surface-200">
            {account.bot_name || "—"}
          </span>
        </p>
        <p className="flex items-center justify-between gap-2">
          <span className="text-surface-400">Username</span>
          <code className="text-surface-700 dark:text-surface-200">
            {account.bot_username ? `@${account.bot_username}` : "—"}
          </code>
        </p>
      </div>

      {testResult && (
        <div
          className={cn(
            "mt-3 flex items-start gap-2 rounded-lg border p-2.5 text-xs",
            testResult.ok
              ? "border-success-200 bg-success-50 text-success-700 dark:border-success-800 dark:bg-green-900/20 dark:text-green-300"
              : "border-warning-200 bg-warning-50 text-warning-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
          )}
        >
          {testResult.ok ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span className="break-all">{testResult.message}</span>
        </div>
      )}

      {webhookResult && (
        <div
          className={cn(
            "mt-3 flex items-start gap-2 rounded-lg border p-2.5 text-xs",
            webhookResult.ok
              ? "border-success-200 bg-success-50 text-success-700 dark:border-success-800 dark:bg-green-900/20 dark:text-green-300"
              : "border-warning-200 bg-warning-50 text-warning-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
          )}
        >
          {webhookResult.ok ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span className="break-all">{webhookResult.message}</span>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-4">
        <p className="text-[11px] text-surface-400">
          Подключён {formatDateTime(account.created_at)}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => webhookMutation.mutate()}
            disabled={webhookMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800 disabled:opacity-50 dark:hover:bg-surface-700 dark:hover:text-surface-200"
            title="Настроить приём входящих сообщений"
          >
            <Globe className="h-3.5 w-3.5" />
            {webhookMutation.isPending ? "Настройка..." : "Webhook"}
          </button>
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800 disabled:opacity-50 dark:hover:bg-surface-700 dark:hover:text-surface-200"
          >
            <PlugZap className="h-3.5 w-3.5" />
            {testMutation.isPending ? "Проверка..." : "Проверить"}
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-200"
            aria-label="Редактировать бота"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-red-900/20"
            aria-label="Удалить бота"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ---------------- helpers ---------------- */

function extractAccountError(error: unknown): string {
  const axiosError = error as AxiosError<Record<string, unknown>>;
  const data = axiosError?.response?.data;
  if (data && typeof data === "object") {
    if (typeof data.error === "string") return data.error;
    const detail = data.detail;
    if (detail && typeof detail === "object") {
      const detailObj = detail as Record<string, unknown>;
      if (typeof detailObj.detail === "string") return detailObj.detail;
      const firstKey = Object.keys(detailObj)[0];
      const firstValue = firstKey ? detailObj[firstKey] : undefined;
      if (firstValue && Array.isArray(firstValue)) return String(firstValue[0]);
      if (typeof firstValue === "string") return firstValue;
    }
    if (typeof detail === "string") return detail;
  }
  return "Не удалось выполнить операцию. Попробуйте ещё раз.";
}

function extractTestResult(data: unknown): TestResult {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (obj.ok === true) {
      const parts: string[] = [];
      if (typeof obj.bot_username === "string" && obj.bot_username) {
        parts.push(`@${obj.bot_username}`);
      }
      if (typeof obj.bot_name === "string" && obj.bot_name) {
        parts.push(`«${obj.bot_name}»`);
      }
      return {
        ok: true,
        message: parts.length
          ? `Бот ${parts.join(" ")} работает.`
          : "Бот работает.",
      };
    }
    if (typeof obj.error === "string") {
      return { ok: false, message: obj.error };
    }
  }
  return { ok: false, message: "Не удалось проверить подключение. Попробуйте ещё раз." };
}

/* ---------------- Connect modal ---------------- */

interface TelegramBotModalProps {
  open: boolean;
  onClose: () => void;
  editing: TelegramAccount | null;
}

function TelegramBotModal({ open, onClose, editing }: TelegramBotModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(editing);

  const [form, setForm] = useState({
    name: "",
    bot_token: "",
  });
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Reset the form every time the modal opens (create vs edit)
  useEffect(() => {
    if (open) {
      setForm({
        name: editing?.name || "",
        bot_token: "",
      });
      setTestResult(null);
    }
  }, [open, editing]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEdit
        ? messagingApi.telegram.accounts.update(editing!.id, data)
        : messagingApi.telegram.accounts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TELEGRAM_ACCOUNTS] });
      onClose();
    },
  });

  const testMutation = useMutation({
    mutationFn: () => {
      if (isEdit && !form.bot_token.trim()) {
        return messagingApi.telegram.accounts.testById(editing!.id);
      }
      return messagingApi.telegram.accounts.test({
        name: form.name.trim() || "draft",
        bot_token: form.bot_token.trim(),
      });
    },
    onSuccess: (res) => {
      const result = extractTestResult(res.data);
      setTestResult(result);
      const data = res.data as { bot_name?: string; bot_username?: string };
      // Pre-fill the bot name from getMe so the manager doesn't have to.
      if (!form.name.trim() && data.bot_name) {
        setForm((prev) => ({ ...prev, name: data.bot_name || "" }));
      }
      if (result.ok && data.bot_username) {
        setTestResult({
          ok: true,
          message: `Бот @${data.bot_username} работает. Можно подключать.`,
        });
      }
    },
    onError: (err) => setTestResult(extractTestResult((err as AxiosError)?.response?.data)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
    };
    if (form.bot_token.trim()) {
      payload.bot_token = form.bot_token.trim();
    }
    saveMutation.mutate(payload);
  };

  const canTest = isEdit ? true : Boolean(form.bot_token.trim());

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Редактировать бота" : "Подключить Telegram бота"}
      description={
        isEdit
          ? "Обновите данные Telegram-бота"
          : "Вставьте токен, полученный от @BotFather"
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Название бота"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Например: DEO Studio Bot"
          hint="Подставится автоматически после проверки токена"
          required
        />
        <Input
          label="Bot token"
          type="password"
          value={form.bot_token}
          onChange={(e) => setForm({ ...form, bot_token: e.target.value })}
          placeholder={isEdit ? "Оставьте пустым, чтобы не менять" : "123456:ABC-DEF..."}
          hint={
            isEdit
              ? "Токен не показывается — укажите новый, только если он изменился"
              : "Получите у @BotFather командой /newbot"
          }
          required={!isEdit}
        />

        {testResult && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
              testResult.ok
                ? "border-success-200 bg-success-50 text-success-700 dark:border-success-800 dark:bg-green-900/20 dark:text-green-300"
                : "border-warning-200 bg-warning-50 text-warning-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
            )}
          >
            {testResult.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {saveMutation.isError && (
          <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <span className="flex items-start gap-2">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{extractAccountError(saveMutation.error)}</span>
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <Button
            variant="secondary"
            type="button"
            onClick={() => testMutation.mutate()}
            loading={testMutation.isPending}
            disabled={!canTest}
            title={
              canTest
                ? "Проверить токен через Bot API (getMe)"
                : "Введите bot token для проверки"
            }
          >
            <PlugZap className="h-4 w-4" />
            Проверить бота
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
            disabled={saveMutation.isPending}
          >
            Отмена
          </Button>
          <Button type="submit" loading={saveMutation.isPending}>
            {isEdit ? "Сохранить" : "Подключить"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
