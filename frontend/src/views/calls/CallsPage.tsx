"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Phone,
  Plus,
  Pencil,
  Trash2,
  PlugZap,
  Server,
  Radio,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Headset,
  UserCircle,
  Filter,
  X,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Modal } from "@/shared/ui/Modal";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { DataTable } from "@/shared/ui/Table";
import { authApi, callsApi, clientsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDateTime, cn } from "@/shared/utils/formatters";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  CallRecord,
  CallStats,
  PBXConnection,
  PBXProvider,
  SipAccount,
} from "@/entities/calls/types";

const STATUS_META: Record<
  string,
  { label: string; variant: "success" | "default" | "danger" | "warning" }
> = {
  connected: { label: "Подключен", variant: "success" },
  disabled: { label: "Отключен", variant: "default" },
  error: { label: "Ошибка", variant: "danger" },
};

const CALL_STATUS_LABELS: Record<string, string> = {
  answered: "Отвечен",
  missed: "Пропущен",
  busy: "Занято",
  failed: "Не удался",
  canceled: "Отменен",
  voicemail: "Голосовая почта",
};

const CALL_STATUS_VARIANTS: Record<string, "success" | "danger" | "warning" | "default"> = {
  answered: "success",
  missed: "danger",
  busy: "warning",
  failed: "danger",
  canceled: "default",
  voicemail: "warning",
};

const PROVIDERS: { value: PBXProvider; label: string }[] = [
  { value: "asterisk", label: "Asterisk / FreePBX" },
  { value: "mikopbx", label: "MikoPBX" },
  { value: "yeastar", label: "Yeastar" },
  { value: "grandstream", label: "Grandstream" },
  { value: "other", label: "Другая" },
];

function formatDuration(seconds: number): string {
  const s = Math.max(0, seconds || 0);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/* ---------------- Period presets ---------------- */

const PERIOD_OPTIONS = [
  { value: "today", label: "Сегодня" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "", label: "Всё время" },
];

type PeriodKey = "" | "today" | "week" | "month";

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function periodParams(period: PeriodKey): { date_from?: string; date_to?: string } {
  if (!period) {
    return {};
  }
  const today = new Date();
  const to = toDateStr(today);
  const from = new Date(today);
  if (period === "today") {
    return { date_from: to, date_to: to };
  }
  if (period === "week") {
    from.setDate(from.getDate() - 6);
  }
  if (period === "month") {
    from.setDate(from.getDate() - 29);
  }
  return { date_from: toDateStr(from), date_to: to };
}

function extractApiError(error: unknown): string {
  const data = (error as AxiosError<Record<string, unknown>>)?.response?.data;
  if (data && typeof data === "object") {
    if (typeof data.error === "string") return data.error;
    const detail = data.detail;
    if (detail && typeof detail === "object") {
      const firstKey = Object.keys(detail)[0];
      const firstValue = firstKey ? (detail as Record<string, unknown>)[firstKey] : undefined;
      if (firstValue && Array.isArray(firstValue)) return String(firstValue[0]);
      if (typeof firstValue === "string") return firstValue;
    }
    if (typeof detail === "string") return detail;
  }
  return "Не удалось выполнить операцию. Попробуйте ещё раз.";
}

interface TestResult {
  ok: boolean;
  message: string;
}

function extractTestResult(data: unknown): TestResult {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (obj.ok === true) {
      const parts: string[] = [];
      if (obj.api_reachable) parts.push("API АТС отвечает");
      if (obj.ami_reachable) parts.push("AMI-порт доступен");
      return { ok: true, message: parts.length ? `Подключение работает: ${parts.join(", ")}.` : "Подключение работает." };
    }
    if (typeof obj.error === "string") return { ok: false, message: obj.error };
  }
  return { ok: false, message: "Не удалось проверить подключение. Попробуйте ещё раз." };
}

export function CallsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("client_id");
  const [connectOpen, setConnectOpen] = useState(false);
  const [editing, setEditing] = useState<PBXConnection | null>(null);
  const [sipOpen, setSipOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>("");
  const [employeeId, setEmployeeId] = useState("");

  const filterParams = useMemo(() => {
    const params: Record<string, unknown> = {};
    if (clientId) {
      params.client_id = clientId;
    }
    if (employeeId) {
      params.employee = employeeId;
    }
    Object.assign(params, periodParams(period));
    return params;
  }, [clientId, employeeId, period]);

  const { data: records, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.CALL_RECORDS, clientId || "all", period, employeeId || "all"],
    queryFn: () => callsApi.records.list({ ...filterParams, page_size: 100 }),
    select: (res): CallRecord[] => res.data?.results || (res.data as CallRecord[]),
  });

  const { data: stats } = useQuery({
    queryKey: [QUERY_KEYS.CALL_STATS, clientId || "all", period, employeeId || "all"],
    queryFn: () => callsApi.stats(filterParams),
    select: (res): CallStats => res.data as CallStats,
  });

  const { data: filterClientName } = useQuery({
    queryKey: [QUERY_KEYS.CLIENT, clientId],
    queryFn: () => clientsApi.get(clientId!),
    select: (res) => (res.data as { full_name?: string })?.full_name || "",
    enabled: !!clientId,
  });

  const { data: employees } = useQuery({
    queryKey: [QUERY_KEYS.USERS],
    queryFn: () => authApi.users.list(),
    select: (res) => {
      const all: { id: string; full_name: string; role_name?: string | null }[] =
        res.data?.results ||
        (res.data as { id: string; full_name: string; role_name?: string | null }[]) ||
        [];
      // Team members only — exclude roleless users and client accounts.
      return all.filter((u) => {
        const role = u.role_name?.toLowerCase();
        return Boolean(role) && role !== "client";
      });
    },
  });

  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: [QUERY_KEYS.PBX_CONNECTIONS],
    queryFn: () => callsApi.connections.list(),
    select: (res): PBXConnection[] => res.data?.results || (res.data as PBXConnection[]),
  });

  const { data: sipAccounts } = useQuery({
    queryKey: [QUERY_KEYS.SIP_ACCOUNTS],
    queryFn: () => callsApi.sip.list(),
    select: (res): SipAccount[] => res.data?.results || (res.data as SipAccount[]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => callsApi.connections.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PBX_CONNECTIONS] }),
  });

  const handleDelete = (connection: PBXConnection) => {
    if (window.confirm(`Удалить подключение АТС «${connection.name}»? Журнал звонков сохранится.`)) {
      deleteMutation.mutate(connection.id);
    }
  };

  const columns: ColumnDef<CallRecord>[] = [
    {
      accessorKey: "direction",
      header: "Направление",
      cell: ({ row }) => {
        const incoming = row.original.direction === "incoming";
        return (
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                incoming
                  ? "bg-success-50 text-success-600 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300"
              )}
            >
              {incoming ? (
                <PhoneIncoming className="h-4 w-4" />
              ) : (
                <PhoneOutgoing className="h-4 w-4" />
              )}
            </span>
            <span className="text-sm font-medium text-surface-700 dark:text-surface-200">
              {incoming ? "Входящий" : "Исходящий"}
            </span>
          </span>
        );
      },
    },
    {
      accessorKey: "call_type",
      header: "Тип",
      cell: ({ row }) => (
        <Badge variant={row.original.call_type === "internal" ? "default" : "warning"}>
          {row.original.call_type === "internal" ? "Внутренний" : "Внешний"}
        </Badge>
      ),
    },
    {
      accessorKey: "phone_number",
      header: "Номер",
      cell: ({ row }) => (
        <span className="font-mono text-sm text-surface-800 dark:text-surface-100">
          {row.original.phone_number || "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Статус",
      cell: ({ row }) => (
        <Badge variant={CALL_STATUS_VARIANTS[row.original.status] || "default"}>
          {CALL_STATUS_LABELS[row.original.status] || row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "duration_seconds",
      header: "Длительность",
      cell: ({ row }) => (
        <span className="text-sm text-surface-600 dark:text-surface-300">
          {formatDuration(row.original.duration_seconds)}
        </span>
      ),
    },
    {
      accessorKey: "employee_name",
      header: "Сотрудник",
      cell: ({ row }) => (
        <span className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
          <UserCircle className="h-4 w-4 text-surface-400" />
          {row.original.employee_name || "—"}
        </span>
      ),
    },
    {
      accessorKey: "started_at",
      header: "Дата",
      cell: ({ row }) => (
        <span className="text-sm text-surface-500">
          {row.original.started_at ? formatDateTime(row.original.started_at) : "—"}
        </span>
      ),
    },
  ];

  const hasRecords = (records?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Звонки"
        description={
          clientId && filterClientName
            ? `Журнал звонков · ${filterClientName}`
            : "Журнал звонков компании"
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setSipOpen(true)}>
              <Headset className="h-4 w-4" />
              Быстрое подключение SIP
            </Button>
            <Button onClick={() => { setEditing(null); setConnectOpen(true); }}>
              <Plus className="h-4 w-4" />
              Новое подключение
            </Button>
          </>
        }
      />

      {/* Client filter banner */}
      {clientId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-800 dark:bg-brand-900/20">
          <p className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-200">
            <Filter className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
            Показаны звонки клиента{" "}
            <span className="font-medium">{filterClientName || "…"}</span>
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.replace("/calls")}
          >
            <X className="h-4 w-4" />
            Сбросить фильтр
          </Button>
        </div>
      )}

      {/* Filters: period + employee */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
            Период
          </p>
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-surface-200 bg-white p-1 dark:border-surface-700 dark:bg-surface-900">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.value || "all"}
                onClick={() => setPeriod(p.value as PeriodKey)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                  period === p.value
                    ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                    : "text-surface-500 hover:bg-surface-100 hover:text-surface-800 dark:hover:bg-surface-800 dark:hover:text-surface-200"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <Select
          label="Сотрудник"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          options={(employees || []).map((e) => ({
            value: e.id,
            label: e.full_name || e.id,
          }))}
          placeholder="Все сотрудники"
          className="w-full sm:w-60"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<PhoneCall className="h-5 w-5" />}
          label="Всего звонков"
          value={stats?.total ?? 0}
          iconClass="bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300"
        />
        <StatCard
          icon={<PhoneIncoming className="h-5 w-5" />}
          label="Входящие"
          value={stats?.incoming ?? 0}
          iconClass="bg-success-50 text-success-600 dark:bg-green-900/20 dark:text-green-400"
        />
        <StatCard
          icon={<PhoneOutgoing className="h-5 w-5" />}
          label="Исходящие"
          value={stats?.outgoing ?? 0}
          iconClass="bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300"
        />
        <StatCard
          icon={<PhoneMissed className="h-5 w-5" />}
          label="Пропущенные"
          value={stats?.missed ?? 0}
          iconClass="bg-danger-50 text-danger-600 dark:bg-red-900/20 dark:text-red-400"
        />
      </div>

      {/* Call log */}
      <Card padding="none">
        <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-700">
          <div>
            <h2 className="text-sm font-semibold text-surface-900 dark:text-white">
              Журнал звонков
            </h2>
            <p className="mt-1 text-xs text-surface-500">
              {hasRecords
                ? `${records?.length} звонков в журнале`
                : clientId
                  ? "У этого клиента пока нет звонков"
                  : "Звонки появятся после подключения АТС"}
            </p>
          </div>
          <Badge variant="default">АТС</Badge>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : hasRecords ? (
            <DataTable
              data={records || []}
              columns={columns}
              loading={false}
              searchable
              searchPlaceholder="Поиск по номеру или сотруднику..."
            />
          ) : (
            <EmptyState
              icon={<PhoneMissed className="h-12 w-12" />}
              title="Нет звонков"
              description={
                clientId
                  ? "У этого клиента пока нет звонков в журнале."
                  : "Подключите АТС в настройках, чтобы звонки автоматически попадали в журнал."
              }
              action={
                clientId ? undefined : (
                  <Button onClick={() => { setEditing(null); setConnectOpen(true); }}>
                    <Plus className="h-4 w-4" />
                    Подключить АТС
                  </Button>
                )
              }
            />
          )}
        </div>
      </Card>

      {/* PBX connections */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-surface-900 dark:text-white">
              Подключения АТС
            </h2>
            <p className="mt-0.5 text-xs text-surface-500">
              Провайдеры, API и AMI-доступ для приёма журнала звонков
            </p>
          </div>
        </div>
        {connectionsLoading ? (
          <div className="flex h-32 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : connections && connections.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {connections.map((connection) => (
              <PBXConnectionCard
                key={connection.id}
                connection={connection}
                onEdit={() => { setEditing(connection); setConnectOpen(true); }}
                onDelete={() => handleDelete(connection)}
              />
            ))}
          </div>
        ) : (
          <Card className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-100 text-surface-500 dark:bg-surface-800">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-white">
                  АТС ещё не подключена
                </p>
                <p className="text-xs text-surface-500">
                  Создайте подключение, чтобы принимать журнал звонков
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => { setEditing(null); setConnectOpen(true); }}>
              <Plus className="h-4 w-4" />
              Подключить
            </Button>
          </Card>
        )}
      </div>

      {/* SIP accounts */}
      {sipAccounts && sipAccounts.length > 0 && (
        <Card>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
            <Headset className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            SIP аккаунты сотрудников
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {sipAccounts.map((account) => (
              <span
                key={account.id}
                className="inline-flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-1.5 text-sm dark:border-surface-700 dark:bg-surface-800"
              >
                <span className="font-mono font-medium text-surface-800 dark:text-surface-100">
                  {account.extension}
                </span>
                {account.name && (
                  <span className="text-surface-500">{account.name}</span>
                )}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Modals */}
      <PBXConnectionModal
        open={connectOpen}
        onClose={() => { setConnectOpen(false); setEditing(null); }}
        editing={editing}
      />
      <QuickSipModal
        open={sipOpen}
        onClose={() => setSipOpen(false)}
      />
    </div>
  );
}

/* ---------------- Stat card ---------------- */

function StatCard({
  icon,
  label,
  value,
  iconClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconClass: string;
}) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-sm text-surface-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
          {value}
        </p>
      </div>
      <div className={cn("rounded-lg p-2.5", iconClass)}>{icon}</div>
    </Card>
  );
}

/* ---------------- PBX connection card ---------------- */

function PBXConnectionCard({
  connection,
  onEdit,
  onDelete,
}: {
  connection: PBXConnection;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const testMutation = useMutation({
    mutationFn: () => callsApi.connections.testById(connection.id),
    onSuccess: (res) => setTestResult(extractTestResult(res.data)),
    onError: (err) => setTestResult(extractTestResult((err as AxiosError)?.response?.data)),
  });

  const status = STATUS_META[connection.status] || STATUS_META.disabled;

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300">
            <Server className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-surface-900 dark:text-white">
              {connection.name}
            </p>
            <p className="flex items-center gap-1 text-xs text-surface-500">
              <Radio className="h-3 w-3" />
              {PROVIDERS.find((p) => p.value === connection.provider)?.label ||
                connection.provider}
            </p>
          </div>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <div className="mt-4 space-y-2 rounded-lg bg-surface-50 p-3 text-xs dark:bg-surface-800/60">
        <p className="flex items-center justify-between gap-2">
          <span className="text-surface-400">URL API АТС</span>
          <code className="truncate text-surface-700 dark:text-surface-200">
            {connection.api_url || "—"}
          </code>
        </p>
        <p className="flex items-center justify-between gap-2">
          <span className="text-surface-400">AMI</span>
          <code className="text-surface-700 dark:text-surface-200">
            {connection.ami_host ? `${connection.ami_host}:${connection.ami_port}` : "—"}
          </code>
        </p>
        {connection.sip_domain && (
          <p className="flex items-center justify-between gap-2">
            <span className="text-surface-400">SIP домен</span>
            <code className="text-surface-700 dark:text-surface-200">
              {connection.sip_domain}
            </code>
          </p>
        )}
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

      <div className="mt-auto flex items-center justify-between pt-4">
        <p className="text-[11px] text-surface-400">
          {formatDateTime(connection.created_at)}
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
            aria-label="Редактировать подключение"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-red-900/20"
            aria-label="Удалить подключение"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ---------------- PBX connect modal ---------------- */

interface PBXConnectionModalProps {
  open: boolean;
  onClose: () => void;
  editing: PBXConnection | null;
}

function PBXConnectionModal({ open, onClose, editing }: PBXConnectionModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(editing);

  const [form, setForm] = useState({
    name: "",
    provider: "asterisk",
    api_url: "",
    api_key: "",
    ami_host: "",
    ami_port: "5038",
    ami_user: "",
    ami_password: "",
    ws_url: "",
    sip_domain: "",
  });
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        name: editing?.name || "",
        provider: editing?.provider || "asterisk",
        api_url: editing?.api_url || "",
        api_key: "",
        ami_host: editing?.ami_host || "",
        ami_port: String(editing?.ami_port || 5038),
        ami_user: editing?.ami_user || "",
        ami_password: "",
        ws_url: editing?.ws_url || "",
        sip_domain: editing?.sip_domain || "",
      });
      setTestResult(null);
    }
  }, [open, editing]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEdit
        ? callsApi.connections.update(editing!.id, data)
        : callsApi.connections.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PBX_CONNECTIONS] });
      onClose();
    },
  });

  const testMutation = useMutation({
    mutationFn: () => {
      if (isEdit) return callsApi.connections.testById(editing!.id);
      return callsApi.connections.test({
        name: form.name.trim() || "draft",
        provider: form.provider,
        api_url: form.api_url.trim(),
        api_key: form.api_key.trim(),
        ami_host: form.ami_host.trim(),
        ami_port: form.ami_port.trim(),
        ami_user: form.ami_user.trim(),
        ami_password: form.ami_password.trim(),
        ws_url: form.ws_url.trim(),
        sip_domain: form.sip_domain.trim(),
      });
    },
    onSuccess: (res) => setTestResult(extractTestResult(res.data)),
    onError: (err) => setTestResult(extractTestResult((err as AxiosError)?.response?.data)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      provider: form.provider,
      api_url: form.api_url.trim(),
      ami_host: form.ami_host.trim(),
      ami_port: parseInt(form.ami_port || "5038", 10) || 5038,
      ami_user: form.ami_user.trim(),
      ws_url: form.ws_url.trim(),
      sip_domain: form.sip_domain.trim(),
    };
    if (form.api_key.trim()) payload.api_key = form.api_key.trim();
    if (form.ami_password.trim()) payload.ami_password = form.ami_password.trim();
    saveMutation.mutate(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Редактировать подключение АТС" : "Новое подключение"}
      description="Данные для подключения к АТС и приёма журнала звонков"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Название"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Например: Офисная АТС"
            required
          />
          <Select
            label="Провайдер"
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value as PBXProvider })}
            options={PROVIDERS}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="URL API АТС"
            value={form.api_url}
            onChange={(e) => setForm({ ...form, api_url: e.target.value })}
            placeholder="http://pbx.example.com:8088"
            hint="Эндпоинт для проверки доступности"
          />
          <Input
            label="API ключ / токен"
            type="password"
            value={form.api_key}
            onChange={(e) => setForm({ ...form, api_key: e.target.value })}
            placeholder={isEdit ? "Оставьте пустым, чтобы не менять" : "Токен АТС"}
            hint="Используется АТС для отправки CDR"
          />
        </div>

        <div className="rounded-lg border border-surface-200 p-4 dark:border-surface-700">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
            <Server className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            Asterisk AMI
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="AMI хост"
              value={form.ami_host}
              onChange={(e) => setForm({ ...form, ami_host: e.target.value })}
              placeholder="pbx.example.com"
            />
            <Input
              label="AMI порт"
              value={form.ami_port}
              onChange={(e) => setForm({ ...form, ami_port: e.target.value })}
              placeholder="5038"
              type="number"
            />
            <Input
              label="AMI пользователь"
              value={form.ami_user}
              onChange={(e) => setForm({ ...form, ami_user: e.target.value })}
              placeholder="admin"
            />
            <Input
              label="AMI пароль"
              type="password"
              value={form.ami_password}
              onChange={(e) => setForm({ ...form, ami_password: e.target.value })}
              placeholder={isEdit ? "Оставьте пустым, чтобы не менять" : "Пароль"}
            />
          </div>
        </div>

        <div className="rounded-lg border border-surface-200 p-4 dark:border-surface-700">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
            <PhoneCall className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            WebRTC / SIP (звонки из браузера)
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="WebSocket URL (WSS)"
              value={form.ws_url}
              onChange={(e) => setForm({ ...form, ws_url: e.target.value })}
              placeholder="wss://pbx.example.com:8089/ws"
            />
            <Input
              label="SIP домен"
              value={form.sip_domain}
              onChange={(e) => setForm({ ...form, sip_domain: e.target.value })}
              placeholder="sip.example.com"
            />
          </div>
          <p className="mt-2 text-xs text-surface-400">
            SIP аккаунты сотрудников подключаются через «Быстрое подключение SIP».
          </p>
        </div>

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
              <span>{extractApiError(saveMutation.error)}</span>
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <Button
            variant="secondary"
            type="button"
            onClick={() => testMutation.mutate()}
            loading={testMutation.isPending}
            disabled={!form.api_url.trim() && !form.ami_host.trim()}
            title="Проверить доступность API АТС и AMI-порта"
          >
            <PlugZap className="h-4 w-4" />
            Проверить подключение
          </Button>
          <Button variant="secondary" type="button" onClick={onClose} disabled={saveMutation.isPending}>
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

/* ---------------- Quick SIP modal ---------------- */

function QuickSipModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ extension: "", password: "", name: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({ extension: "", password: "", name: "" });
      setError("");
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      callsApi.sip.quickCreate({
        extension: form.extension.trim(),
        password: form.password,
        name: form.name.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SIP_ACCOUNTS] });
      onClose();
    },
    onError: (err) => setError(extractApiError(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Быстрое подключение SIP"
      description="Внутренний номер и пароль для сотрудника"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Внутренний номер"
          value={form.extension}
          onChange={(e) => setForm({ ...form, extension: e.target.value })}
          placeholder="101"
          required
        />
        <Input
          label="Пароль"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Пароль SIP"
          required
        />
        <Input
          label="Имя (необязательно)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Иван Петров"
        />

        {error && (
          <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <span className="flex items-start gap-2">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={mutation.isPending}>
            Отмена
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            <ShieldCheck className="h-4 w-4" />
            Сохранить
          </Button>
        </div>
      </form>
    </Modal>
  );
}
