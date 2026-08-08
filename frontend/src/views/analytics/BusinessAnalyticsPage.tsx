"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingUp,
  Percent,
  Target,
  Wallet,
  Scale,
  RefreshCcw,
  Clock,
  Users,
  Filter,
  Download,
  FileText,
  BarChart3,
  PieChart,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Select } from "@/shared/ui/Select";
import { Input } from "@/shared/ui/Input";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { analyticsApi } from "@/shared/api/base";
import { formatCurrency, cn } from "@/shared/utils/formatters";
import { useAuth } from "@/hooks/useAuth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PeriodParams = Record<string, unknown> & { period: string };

interface PeriodQuery {
  period: string;
  start_date?: string;
  end_date?: string;
}

interface Summary {
  revenue: number;
  refunds: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  salaries: number;
  net_profit: number;
  total_leads: number;
  qualified_leads: number;
  deals: number;
  won_deals: number;
  lost_deals: number;
  won_revenue: number;
  conversion_rate: number;
  avg_deal_size: number;
  sales_cycle_days: number;
  ltv: number;
  ltv_paying_clients: number;
  repeat_purchase_rate: number;
  cac: number;
  profit_margin: number;
  churn: { active_base: number; retained: number; churned: number; churn_rate: number };
}

interface RevenueBreakdown {
  period: { start: string; end: string; label: string };
  money: {
    revenue: number;
    refunds: number;
    cogs: number;
    gross_profit: number;
    expenses: number;
    salaries: number;
    net_profit: number;
  };
  previous_period: { revenue: number; net_profit: number };
  revenue_delta_pct: number;
  dynamics: {
    granularity: string;
    series: { date: string; revenue: number; expenses: number; profit: number }[];
  };
  by_manager: { user_id: string | null; user_name: string; revenue: number }[];
  by_product: { product: string; revenue: number }[];
  by_source: { source: string; revenue: number }[];
}

interface Funnel {
  total_leads: number;
  qualified_leads: number;
  deals: number;
  won_deals: number;
  lost_deals: number;
  conversion_rate: number;
  lead_to_qualified: number;
  qualified_to_deal: number;
  deal_to_won: number;
  stages: { stage_id: string; name: string; kind: string; probability: number }[];
}

interface ManagerRow {
  user_id: string;
  user_name: string;
  leads: number;
  contacted: number;
  deals: number;
  won: number;
  lost: number;
  conversion: number;
  revenue: number;
  avg_deal_size: number;
  sales_cycle: number;
}

interface SourceRow {
  source: string;
  leads: number;
  qualified: number;
  deals: number;
  won: number;
  conversion: number;
  revenue: number;
  cost: number;
  new_clients: number;
  cac: number;
  roi: number;
}

interface LtvData {
  paying_clients: number;
  total_revenue: number;
  ltv: number;
  avg_orders_per_client: number;
  repeat_purchase_rate: number;
  ltv_by_cohort: Record<string, number>;
}

interface RetentionRow {
  cohort: string;
  size: number;
  retention: number[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERIODS = [
  { value: "today", label: "Сегодня" },
  { value: "yesterday", label: "Вчера" },
  { value: "7d", label: "7 дней" },
  { value: "30d", label: "30 дней" },
  { value: "90d", label: "90 дней" },
  { value: "year", label: "Год" },
  { value: "custom", label: "Свой период" },
];

const SOURCE_LABELS: Record<string, string> = {
  website: "Сайт",
  referral: "Рекомендация",
  instagram: "Instagram",
  facebook: "Facebook",
  telegram: "Telegram",
  call: "Звонок",
  other: "Другое",
};

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function BusinessAnalyticsPage() {
  const { user } = useAuth();
  const isAdmin = ["superadmin", "owner"].includes(user?.role_name?.toLowerCase() || "");

  const [periodKey, setPeriodKey] = useState("30d");

  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const params = useMemo<PeriodParams>(() => {
    const query: PeriodQuery =
      periodKey === "custom" && customStart && customEnd
        ? { period: "custom", start_date: customStart, end_date: customEnd }
        : { period: periodKey };
    return { ...query };
  }, [periodKey, customStart, customEnd]);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["business-summary", params],
    queryFn: () => analyticsApi.business.summary(params).then((r) => r.data as Summary),
  });

  const { data: revenue } = useQuery({
    queryKey: ["business-revenue", params],
    queryFn: () => analyticsApi.business.revenue(params).then((r) => r.data as RevenueBreakdown),
  });

  const { data: funnel } = useQuery({
    queryKey: ["business-funnel", params],
    queryFn: () => analyticsApi.business.funnel(params).then((r) => r.data as Funnel),
  });

  const { data: managers } = useQuery({
    queryKey: ["business-managers", params],
    queryFn: () => analyticsApi.business.managers(params).then((r) => r.data as ManagerRow[]),
  });

  const { data: sources } = useQuery({
    queryKey: ["business-sources", params],
    queryFn: () => analyticsApi.business.sources(params).then((r) => r.data as SourceRow[]),
  });

  const { data: ltv } = useQuery({
    queryKey: ["business-ltv"],
    queryFn: () => analyticsApi.business.ltv().then((r) => r.data as LtvData),
  });

  const { data: retention } = useQuery({
    queryKey: ["business-retention"],
    queryFn: () => analyticsApi.business.retention().then((r) => r.data as RetentionRow[]),
  });

  const handleExport = async (format: "csv" | "pdf") => {
    try {
      const res = await analyticsApi.business.exportFile(format, params);
      const suffix = format === "pdf" ? "pdf" : "csv";
      downloadBlob(res.data as Blob, `business_analytics_${periodKey}.${suffix}`);
    } catch {
      // silent — auth interceptor handles redirects
    }
  };

  const funnelData = useMemo(() => {
    if (!funnel) {
      return [];
    }
    return [
      { name: "Lead", count: funnel.total_leads, conversion: 100 },
      { name: "Qualified", count: funnel.qualified_leads, conversion: funnel.lead_to_qualified },
      { name: "Deal", count: funnel.deals, conversion: funnel.qualified_to_deal },
      { name: "Won", count: funnel.won_deals, conversion: funnel.deal_to_won },
    ];
  }, [funnel]);

  const series = revenue?.dynamics?.series || [];

  const kpis: {
    label: string;
    value: string;
    hint: string;
    icon: typeof DollarSign;
    color: string;
  }[] = [
    {
      label: "Выручка",
      value: formatCurrency(summary?.revenue || 0),
      hint: `Δ ${revenue?.revenue_delta_pct ?? 0}% к прошлому периоду`,
      icon: DollarSign,
      color: "text-success-600 bg-success-50 dark:bg-success-900/20",
    },
    {
      label: "Чистая прибыль",
      value: formatCurrency(summary?.net_profit || 0),
      hint: `Маржа ${summary?.profit_margin ?? 0}%`,
      icon: TrendingUp,
      color: "text-brand-600 bg-brand-50 dark:bg-brand-900/20",
    },
    {
      label: "Конверсия",
      value: `${summary?.conversion_rate ?? 0}%`,
      hint: `${summary?.won_deals ?? 0} won / ${summary?.total_leads ?? 0} лидов`,
      icon: Percent,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
    },
    {
      label: "LTV",
      value: formatCurrency(summary?.ltv || 0),
      hint: `${summary?.ltv_paying_clients ?? 0} покупающих клиентов`,
      icon: Target,
      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
    },
    {
      label: "CAC",
      value: formatCurrency(summary?.cac || 0),
      hint: "Стоимость привлечения",
      icon: Wallet,
      color: "text-warning-600 bg-warning-50 dark:bg-yellow-900/20",
    },
    {
      label: "Средний чек",
      value: formatCurrency(summary?.avg_deal_size || 0),
      hint: "Выигранные сделки",
      icon: Scale,
      color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20",
    },
    {
      label: "Churn",
      value: `${summary?.churn?.churn_rate ?? 0}%`,
      hint: `${summary?.churn?.churned ?? 0} из ${summary?.churn?.active_base ?? 0} клиентов`,
      icon: RefreshCcw,
      color: "text-danger-600 bg-danger-50 dark:bg-red-900/20",
    },
    {
      label: "Цикл продаж",
      value: `${summary?.sales_cycle_days ?? 0} дн.`,
      hint: "Lead → Won",
      icon: Clock,
      color: "text-rose-600 bg-rose-50 dark:bg-rose-900/20",
    },
    {
      label: "Лиды",
      value: String(summary?.total_leads ?? 0),
      hint: `${summary?.qualified_leads ?? 0} квалифицированы`,
      icon: Users,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Сделки",
      value: String(summary?.deals ?? 0),
      hint: "В работе",
      icon: BarChart3,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Won Deals",
      value: String(summary?.won_deals ?? 0),
      hint: formatCurrency(summary?.won_revenue || 0),
      icon: Target,
      color: "text-green-600 bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "Lost Deals",
      value: String(summary?.lost_deals ?? 0),
      hint: "Проигранные сделки",
      icon: Filter,
      color: "text-slate-600 bg-slate-100 dark:bg-slate-800",
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
        title="Business Analytics"
        description="Реальные бизнес-показатели: выручка, прибыль, воронка, LTV, CAC, отток и удержание"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => handleExport("csv")}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport("pdf")}>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        }
      />

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-surface-200 bg-white p-1 dark:border-surface-700 dark:bg-surface-900">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriodKey(p.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                periodKey === p.value
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                  : "text-surface-500 hover:bg-surface-100 hover:text-surface-800 dark:hover:bg-surface-800 dark:hover:text-surface-200"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {periodKey === "custom" && (
          <div className="flex items-center gap-2">
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-40" />
            <span className="text-surface-400">—</span>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-40" />
          </div>
        )}
        {revenue?.period && periodKey !== "custom" && (
          <span className="text-sm text-surface-400">
            {revenue.period.start} — {revenue.period.end}
          </span>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} hover className="group transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-500">{kpi.label}</p>
                  <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white transition-transform group-hover:scale-105 origin-left">
                    {kpi.value}
                  </p>
                </div>
                <div className={cn("rounded-lg p-2.5 transition-transform group-hover:scale-110", kpi.color)}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-xs text-surface-400">{kpi.hint}</p>
            </Card>
          );
        })}
      </div>

      {/* Revenue dynamics + funnel */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
              Динамика выручки и прибыли
            </h3>
            <span className="text-xs text-surface-400">
              {series.length > 31 ? "месяцы" : series.length > 14 ? "недели" : "дни"}
            </span>
          </div>
          {series.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={series} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-surface-700" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff" }}
                  formatter={(value: number | string, name: string) => [formatCurrency(Number(value)), name === "revenue" ? "Выручка" : name === "profit" ? "Прибыль" : "Расходы"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" />
                <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} fill="url(#profGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-surface-400">
              Нет данных за период
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">Воронка</h3>
          </div>
          {funnelData.length > 0 && funnelData.some((f) => f.count > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={funnelData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) {
                        return null;
                      }
                      const d = payload[0].payload as { name: string; count: number; conversion: number };
                      return (
                        <div className="rounded-xl border border-surface-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-sm dark:border-surface-700 dark:bg-surface-800/95">
                          <p className="text-sm font-medium text-surface-900 dark:text-white">{d.name}</p>
                          <p className="mt-0.5 text-xs text-surface-500">
                            {d.count} лидов · конверсия {d.conversion}%
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={26}>
                    {funnelData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {funnelData.slice(1).map((step) => (
                  <div key={step.name} className="flex items-center justify-between text-xs">
                    <span className="text-surface-500">Lead → {step.name}</span>
                    <span className="font-semibold text-surface-800 dark:text-surface-200">{step.conversion}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-surface-400">
              Нет сделок в воронке
            </div>
          )}
        </Card>
      </div>

      {/* Revenue breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Выручка по источникам клиентов
          </h3>
          <div className="space-y-3">
            {(revenue?.by_source || []).map((row) => {
              const max = Math.max(...(revenue?.by_source || []).map((r) => r.revenue), 1);
              return (
                <div key={row.source}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-surface-700 dark:text-surface-200">
                      {SOURCE_LABELS[row.source] || row.source}
                    </span>
                    <span className="text-success-600">{formatCurrency(row.revenue)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-700">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-700"
                      style={{ width: `${(row.revenue / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(revenue?.by_source || []).length === 0 && (
              <p className="text-sm text-surface-400">Нет данных</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Выручка по продуктам
          </h3>
          <div className="space-y-3">
            {(revenue?.by_product || []).map((row) => {
              const max = Math.max(...(revenue?.by_product || []).map((r) => r.revenue), 1);
              return (
                <div key={row.product}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-surface-700 dark:text-surface-200">{row.product}</span>
                    <span className="text-success-600">{formatCurrency(row.revenue)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-700">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-700"
                      style={{ width: `${(row.revenue / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(revenue?.by_product || []).length === 0 && (
              <p className="text-sm text-surface-400">Нет данных</p>
            )}
          </div>
        </Card>
      </div>

      {/* Sources table */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
          Эффективность источников лидов
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700">
                <th className="pb-2 pr-4 font-medium text-surface-500">Источник</th>
                <th className="pb-2 pr-4 font-medium text-surface-500">Лиды</th>
                <th className="pb-2 pr-4 font-medium text-surface-500">Сделки</th>
                <th className="pb-2 pr-4 font-medium text-surface-500">Won</th>
                <th className="pb-2 pr-4 font-medium text-surface-500">Конверсия</th>
                <th className="pb-2 pr-4 font-medium text-surface-500">Выручка</th>
                <th className="pb-2 pr-4 font-medium text-surface-500">CAC</th>
                <th className="pb-2 font-medium text-surface-500">ROI</th>
              </tr>
            </thead>
            <tbody>
              {(sources || []).map((row) => (
                <tr
                  key={row.source}
                  className="border-b border-surface-100 transition-colors last:border-0 hover:bg-surface-50 dark:border-surface-700/50 dark:hover:bg-surface-800/40"
                >
                  <td className="py-3 pr-4 font-medium text-surface-900 dark:text-white">
                    {SOURCE_LABELS[row.source] || row.source}
                  </td>
                  <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">{row.leads}</td>
                  <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">{row.deals}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                        row.won > 0
                          ? "bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400"
                          : "bg-surface-100 text-surface-500 dark:bg-surface-800"
                      )}
                    >
                      {row.won}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">{row.conversion}%</td>
                  <td className="py-3 pr-4 font-medium text-success-600">{formatCurrency(row.revenue)}</td>
                  <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">
                    {row.cac > 0 ? formatCurrency(row.cac) : "—"}
                  </td>
                  <td className="py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                        row.roi > 0
                          ? "bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400"
                          : row.roi < 0
                            ? "bg-danger-50 text-danger-700 dark:bg-danger-900/20 dark:text-danger-400"
                            : "bg-surface-100 text-surface-500 dark:bg-surface-800"
                      )}
                    >
                      {row.roi > 0 ? "+" : ""}
                      {row.roi}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Managers table */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
          Эффективность менеджеров
        </h3>
        {(managers || []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700">
                  <th className="pb-2 pr-4 font-medium text-surface-500">Менеджер</th>
                  <th className="pb-2 pr-4 font-medium text-surface-500">Лиды</th>
                  <th className="pb-2 pr-4 font-medium text-surface-500">Обработано</th>
                  <th className="pb-2 pr-4 font-medium text-surface-500">Сделки</th>
                  <th className="pb-2 pr-4 font-medium text-surface-500">Won</th>
                  <th className="pb-2 pr-4 font-medium text-surface-500">Lost</th>
                  <th className="pb-2 pr-4 font-medium text-surface-500">Конверсия</th>
                  <th className="pb-2 pr-4 font-medium text-surface-500">Выручка</th>
                  <th className="pb-2 pr-4 font-medium text-surface-500">Средний чек</th>
                  <th className="pb-2 font-medium text-surface-500">Цикл</th>
                </tr>
              </thead>
              <tbody>
                {(managers || []).map((m) => (
                  <tr
                    key={m.user_id}
                    className="border-b border-surface-100 transition-colors last:border-0 hover:bg-surface-50 dark:border-surface-700/50 dark:hover:bg-surface-800/40"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-white">
                          {m.user_name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-surface-900 dark:text-white">{m.user_name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">{m.leads}</td>
                    <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">{m.contacted}</td>
                    <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">{m.deals}</td>
                    <td className="py-3 pr-4 font-semibold text-success-600">{m.won}</td>
                    <td className="py-3 pr-4 text-danger-600">{m.lost}</td>
                    <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">{m.conversion}%</td>
                    <td className="py-3 pr-4 font-medium text-success-600">{formatCurrency(m.revenue)}</td>
                    <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">
                      {m.avg_deal_size > 0 ? formatCurrency(m.avg_deal_size) : "—"}
                    </td>
                    <td className="py-3 text-surface-600 dark:text-surface-300">
                      {m.sales_cycle > 0 ? `${m.sales_cycle} дн.` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-surface-400">Нет данных о менеджерах</p>
        )}
      </Card>

      {/* LTV + Retention */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">LTV клиентов</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-surface-50 p-3 dark:bg-surface-800/60">
              <span className="text-sm text-surface-500">Средний LTV</span>
              <span className="text-lg font-bold text-surface-900 dark:text-white">{formatCurrency(ltv?.ltv || 0)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-50 p-3 dark:bg-surface-800/60">
              <span className="text-sm text-surface-500">Покупающих клиентов</span>
              <span className="text-lg font-bold text-surface-900 dark:text-white">{ltv?.paying_clients || 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-50 p-3 dark:bg-surface-800/60">
              <span className="text-sm text-surface-500">Повторные покупки</span>
              <span className="text-lg font-bold text-surface-900 dark:text-white">{ltv?.repeat_purchase_rate ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-50 p-3 dark:bg-surface-800/60">
              <span className="text-sm text-surface-500">Среднее число заказов</span>
              <span className="text-lg font-bold text-surface-900 dark:text-white">{ltv?.avg_orders_per_client ?? 0}</span>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Удержание по когортам
          </h3>
          {(retention || []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700">
                    <th className="pb-2 pr-4 font-medium text-surface-500">Когорта</th>
                    <th className="pb-2 pr-4 font-medium text-surface-500">Клиентов</th>
                    {(retention || [])[0]?.retention.map((_, i) => (
                      <th key={i} className="px-1.5 pb-2 text-center font-medium text-surface-500">
                        M{i === 0 ? "0" : i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(retention || []).map((row) => (
                    <tr
                      key={row.cohort}
                      className="border-b border-surface-100 transition-colors last:border-0 hover:bg-surface-50 dark:border-surface-700/50 dark:hover:bg-surface-800/40"
                    >
                      <td className="py-2.5 pr-4 font-medium text-surface-900 dark:text-white">{row.cohort}</td>
                      <td className="py-2.5 pr-4 text-surface-600 dark:text-surface-300">{row.size}</td>
                      {row.retention.map((pct, i) => (
                        <td key={i} className="px-1.5 py-2.5">
                          <div
                            className="mx-auto flex h-7 w-9 items-center justify-center rounded-md text-[11px] font-semibold"
                            style={{
                              backgroundColor:
                                pct >= 75
                                  ? "rgba(34,197,94,0.85)"
                                  : pct >= 50
                                    ? "rgba(234,179,8,0.75)"
                                    : pct > 0
                                      ? "rgba(148,163,184,0.45)"
                                      : "rgba(148,163,184,0.15)",
                              color: pct >= 50 ? "#fff" : undefined,
                            }}
                            title={`${row.cohort}: ${pct}%`}
                          >
                            {Math.round(pct)}%
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-surface-400">Нет данных для когорт</p>
          )}
        </Card>
      </div>

      {/* Acquisition costs (admin only) */}
      {isAdmin && <AcquisitionCostsSection />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Acquisition costs manager (admin only)
// ---------------------------------------------------------------------------

function AcquisitionCostsSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    source: "website",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    amount: "",
  });

  const { data: costs } = useQuery({
    queryKey: ["business-acquisition-costs"],
    queryFn: () =>
      analyticsApi.business.acquisitionCosts.list({ page_size: 100 }).then((r) => r.data?.results || []),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      analyticsApi.business.acquisitionCosts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-acquisition-costs"] });
      queryClient.invalidateQueries({ queryKey: ["business-summary"] });
      queryClient.invalidateQueries({ queryKey: ["business-sources"] });
      setForm((f) => ({ ...f, amount: "" }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => analyticsApi.business.acquisitionCosts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-acquisition-costs"] });
      queryClient.invalidateQueries({ queryKey: ["business-summary"] });
      queryClient.invalidateQueries({ queryKey: ["business-sources"] });
    },
  });

  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
        Стоимость привлечения (для CAC / ROI)
      </h3>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Select
              label="Источник"
              options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }))}
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">Год</label>
              <Input
                type="number"
                value={String(form.year)}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">Месяц</label>
              <Input
                type="number"
                min={1}
                max={12}
                value={String(form.month)}
                onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">Сумма ₽</label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="10000"
                className="mt-1"
              />
            </div>
          </div>
          <Button
            className="mt-3"
            size="sm"
            disabled={!form.amount || Number(form.amount) <= 0}
            onClick={() =>
              createMutation.mutate({
                source: form.source,
                year: form.year,
                month: form.month,
                amount: Number(form.amount),
              })
            }
          >
            <Plus className="h-4 w-4" />
            Добавить затраты
          </Button>
        </div>

        <div className="max-h-56 overflow-y-auto">
          {(costs || []).length > 0 ? (
            <div className="divide-y divide-surface-100 dark:divide-surface-700">
              {(costs || []).map((c: { id: number; source: string; year: number; month: number; amount: string }) => (
                <div key={c.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-surface-800 dark:text-surface-200">
                      {SOURCE_LABELS[c.source] || c.source}
                    </span>
                    <span className="text-surface-400">
                      {String(c.month).padStart(2, "0")}/{c.year}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-surface-900 dark:text-white">
                      {formatCurrency(Number(c.amount))}
                    </span>
                    <button
                      onClick={() => deleteMutation.mutate(c.id)}
                      className="rounded-md p-1 text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-surface-400">
              Затраты не указаны — CAC и ROI будут равны нулю
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
