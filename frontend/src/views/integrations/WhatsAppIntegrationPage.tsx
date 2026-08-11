"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  MessageCircle,
  Phone,
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
import type { WhatsAppAccount } from "@/entities/inbox/types";

const STATUS_META: Record<
  string,
  { label: string; variant: "success" | "default" | "danger" | "warning" }
> = {
  active: { label: "Активен", variant: "success" },
  disabled: { label: "Отключён", variant: "default" },
  invalid_credentials: { label: "Неверные учётные данные", variant: "danger" },
  rate_limited: { label: "Превышен лимит", variant: "warning" },
};

interface TestResult {
  ok: boolean;
  message: string;
}

export function WhatsAppIntegrationPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WhatsAppAccount | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const { data: accounts, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.WHATSAPP_ACCOUNTS],
    queryFn: () => messagingApi.whatsapp.accounts.list(),
    select: (res): WhatsAppAccount[] => res.data?.results || (res.data as WhatsAppAccount[]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => messagingApi.whatsapp.accounts.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WHATSAPP_ACCOUNTS] }),
  });

  const handleDelete = (account: WhatsAppAccount) => {
    if (
      window.confirm(
        `Удалить WhatsApp аккаунт «${account.name}»? Диалоги и история сохранятся.`
      )
    ) {
      deleteMutation.mutate(account.id);
    }
  };

  const webhookUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/v1/webhooks/whatsapp/`;
  }, []);

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = webhookUrl;
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

  const openEdit = (account: WhatsAppAccount) => {
    setEditing(account);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp интеграция"
        description="Подключение WhatsApp Business аккаунтов для общения с клиентами"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Подключить аккаунт
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
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-green-900/20 dark:text-green-400">
              <MessageCircle className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-surface-900 dark:text-white">
              WhatsApp ещё не подключён
            </h2>
            <p className="mt-1 max-w-md text-sm text-surface-500">
              Подключите WhatsApp Business аккаунт, чтобы общаться с клиентами прямо из
              системы: входящие появляются автоматически, исходящие доставляются через
              официальное API Meta.
            </p>
            <Button className="mt-5" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Подключить аккаунт
            </Button>
            <p className="mt-3 text-xs text-surface-400">
              Токены из переменных окружения (WHATSAPP_ACCESS_TOKEN) работают как запасной вариант
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
            Укажите этот адрес в настройках приложения Meta, чтобы входящие сообщения
            автоматически появлялись в мессенджере.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-xs text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200">
              {webhookUrl}
            </code>
            <Button variant="secondary" onClick={handleCopyWebhook} aria-label="Скопировать URL">
              {copiedUrl ? (
                <Check className="h-4 w-4 text-success-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-surface-400">
            Meta → приложение → WhatsApp → Configuration → Callback URL. Verify token — из
            переменной <code>WHATSAPP_WEBHOOK_VERIFY_TOKEN</code>.
          </p>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Для продакшена обязателен HTTPS и <code>WHATSAPP_WEBHOOK_APP_SECRET</code>.
              </span>
            </p>
          </div>
        </Card>

        <Card>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
            <ShieldCheck className="h-4 w-4 text-success-600 dark:text-success-400" />
            Как подключить аккаунт
          </h3>
          <ol className="mt-4 space-y-3 text-sm text-surface-600 dark:text-surface-300">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">1</span>
              <span>
                Создайте Business Portfolio на{" "}
                <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-brand-600 hover:underline">
                  business.facebook.com <ExternalLink className="h-3 w-3" />
                </a>{" "}
                и приложение типа Business на{" "}
                <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-brand-600 hover:underline">
                  developers.facebook.com <ExternalLink className="h-3 w-3" />
                </a>
                .
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">2</span>
              <span>
                Добавьте продукт WhatsApp и подключите номер телефона — появятся{" "}
                <b>WABA ID</b> и <b>Phone Number ID</b> (мастер{" "}
                <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-brand-600 hover:underline">
                  WhatsApp API Setup <ExternalLink className="h-3 w-3" />
                </a>
                ).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">3</span>
              <span>
                Сгенерируйте постоянный access token (System User, права{" "}
                <code>whatsapp_business_messaging</code>).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">4</span>
              <span>
                Введите данные в форме «Подключить аккаунт» и нажмите{" "}
                <b>«Проверить подключение»</b> — система сама проверит токен и номер через
                Graph API, ничего сохранять не нужно.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">5</span>
              <span>
                Настройте webhook (поле выше) и подпишитесь на событие <b>messages</b>.
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
            Access token шифруется на сервере (SECRET_KEY) и никогда не возвращается API,
            во фронтенд или в логи. Работает только официальное WhatsApp Business Cloud API
            от Meta — без WhatsApp Web и QR-кодов.
          </p>
        </div>
      </Card>

      <WhatsAppAccountModal
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
  account: WhatsAppAccount;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const testMutation = useMutation({
    mutationFn: () => messagingApi.whatsapp.accounts.testById(account.id),
    onSuccess: (res) => {
      setTestResult(extractTestResult(res.data));
    },
    onError: (err) => {
      setTestResult(extractTestResult((err as AxiosError)?.response?.data));
    },
  });

  const status = STATUS_META[account.status] || STATUS_META.disabled;

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success-50 text-success-600 dark:bg-green-900/20 dark:text-green-400">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-semibold text-surface-900 dark:text-white">
              {account.name}
              {account.is_default && (
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              )}
            </p>
            <p className="flex items-center gap-1 text-xs text-surface-500">
              <Phone className="h-3 w-3" />
              {account.display_phone_number}
            </p>
          </div>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <div className="mt-4 space-y-2 rounded-lg bg-surface-50 p-3 text-xs dark:bg-surface-800/60">
        <p className="flex items-center justify-between gap-2">
          <span className="text-surface-400">Business Account (WABA)</span>
          <code className="text-surface-700 dark:text-surface-200">
            {account.business_account_id}
          </code>
        </p>
        <p className="flex items-center justify-between gap-2">
          <span className="text-surface-400">Phone Number ID</span>
          <code className="text-surface-700 dark:text-surface-200">
            {account.phone_number_id}
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
          <span>{testResult.message}</span>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-4">
        <p className="text-[11px] text-surface-400">
          Подключён {formatDateTime(account.created_at)}
        </p>
        <div className="flex items-center gap-1">
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
            aria-label="Редактировать аккаунт"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-red-900/20"
            aria-label="Удалить аккаунт"
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

const QUALITY_LABELS: Record<string, string> = {
  GREEN: "высокое",
  YELLOW: "среднее",
  RED: "низкое",
};

function extractTestResult(data: unknown): TestResult {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (obj.ok === true) {
      const parts: string[] = [];
      if (typeof obj.display_phone_number === "string" && obj.display_phone_number) {
        parts.push(`номер ${obj.display_phone_number}`);
      }
      if (typeof obj.verified_name === "string" && obj.verified_name) {
        parts.push(`имя «${obj.verified_name}»`);
      }
      if (typeof obj.quality_rating === "string" && obj.quality_rating) {
        parts.push(
          `качество ${QUALITY_LABELS[obj.quality_rating] || obj.quality_rating}`
        );
      }
      if (obj.expires_at === 0) {
        parts.push("токен постоянный");
      } else if (
        typeof obj.expires_at === "number" &&
        obj.expires_at &&
        obj.expires_at > 1_600_000_000
      ) {
        const date = new Date(obj.expires_at * 1000).toLocaleDateString("ru-RU");
        parts.push(`токен истекает ${date}`);
      }
      return {
        ok: true,
        message: parts.length
          ? `Подключение работает: ${parts.join(", ")}.`
          : "Подключение работает.",
      };
    }
    if (typeof obj.error === "string") {
      return { ok: false, message: obj.error };
    }
  }
  return { ok: false, message: "Не удалось проверить подключение. Попробуйте ещё раз." };
}

/* ---------------- Account create/edit modal ---------------- */

interface WhatsAppAccountModalProps {
  open: boolean;
  onClose: () => void;
  editing: WhatsAppAccount | null;
}

function WhatsAppAccountModal({ open, onClose, editing }: WhatsAppAccountModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(editing);

  const [form, setForm] = useState({
    name: "",
    business_account_id: "",
    phone_number_id: "",
    display_phone_number: "",
    access_token: "",
    is_default: false,
  });
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Reset the form every time the modal opens (create vs edit, or another account)
  useEffect(() => {
    if (open) {
      setForm({
        name: editing?.name || "",
        business_account_id: editing?.business_account_id || "",
        phone_number_id: editing?.phone_number_id || "",
        display_phone_number: editing?.display_phone_number || "",
        access_token: "",
        is_default: editing?.is_default || false,
      });
      setTestResult(null);
    }
  }, [open, editing]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEdit
        ? messagingApi.whatsapp.accounts.update(editing!.id, data)
        : messagingApi.whatsapp.accounts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WHATSAPP_ACCOUNTS] });
      onClose();
    },
  });

  const testMutation = useMutation({
    mutationFn: () => {
      // In edit mode without a new token, verify the already-saved credentials.
      if (isEdit && !form.access_token.trim()) {
        return messagingApi.whatsapp.accounts.testById(editing!.id);
      }
      return messagingApi.whatsapp.accounts.test({
        name: form.name.trim() || "draft",
        business_account_id: form.business_account_id.trim(),
        phone_number_id: form.phone_number_id.trim(),
        display_phone_number: form.display_phone_number.trim(),
        access_token: form.access_token.trim(),
      });
    },
    onSuccess: (res) => setTestResult(extractTestResult(res.data)),
    onError: (err) => setTestResult(extractTestResult((err as AxiosError)?.response?.data)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      business_account_id: form.business_account_id.trim(),
      phone_number_id: form.phone_number_id.trim(),
      display_phone_number: form.display_phone_number.trim(),
      is_default: form.is_default,
    };
    if (form.access_token.trim()) {
      payload.access_token = form.access_token.trim();
    }
    saveMutation.mutate(payload);
  };

  const canTest = isEdit
    ? true // без нового токена проверим сохранённые учётные данные
    : Boolean(
        form.access_token.trim() &&
          form.phone_number_id.trim() &&
          form.business_account_id.trim()
      );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Редактировать аккаунт" : "Подключить WhatsApp аккаунт"}
      description={
        isEdit
          ? "Обновите данные аккаунта WhatsApp Business"
          : "Введите данные из WhatsApp API Setup в Meta"
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Название аккаунта"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Например: Основной номер студии"
          required
        />
        <Input
          label="Номер телефона (display)"
          value={form.display_phone_number}
          onChange={(e) => setForm({ ...form, display_phone_number: e.target.value })}
          placeholder="+7 (900) 000-00-00"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Business Account ID (WABA)"
            value={form.business_account_id}
            onChange={(e) => setForm({ ...form, business_account_id: e.target.value })}
            placeholder="102290123456789"
            hint="Meta → WhatsApp → API Setup → WABA ID"
            required
          />
          <Input
            label="Phone Number ID"
            value={form.phone_number_id}
            onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
            placeholder="123456789012345"
            hint="Meta → WhatsApp → API Setup → Phone Number ID"
            required
          />
        </div>
        <Input
          label="Access token"
          type="password"
          value={form.access_token}
          onChange={(e) => setForm({ ...form, access_token: e.target.value })}
          placeholder={
            isEdit
              ? "Оставьте пустым, чтобы не менять"
              : "Постоянный токен Graph API"
          }
          hint={
            isEdit
              ? "Токен не показывается — укажите новый, только если он изменился"
              : "Хранится зашифрованным на сервере"
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
                ? "Проверить токен и номер через Graph API"
                : "Заполните WABA ID, Phone Number ID и токен"
            }
          >
            <PlugZap className="h-4 w-4" />
            Проверить подключение
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
