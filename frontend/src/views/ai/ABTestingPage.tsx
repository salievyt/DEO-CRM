"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  FlaskConical,
  Plus,
  BarChart3,
  TrendingUp,
  Target,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  DollarSign,
  FileSignature,
  Copy,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { aiApi } from "@/shared/api/base";
import { formatDate, formatPercent, cn } from "@/shared/utils/formatters";

const FOCUS_OPTIONS = [
  { value: "price", label: "💰 Акцент на цену", desc: "Оптимальная стоимость" },
  { value: "timeline", label: "⏱ Акцент на сроки", desc: "Быстрый запуск" },
  { value: "quality", label: "✨ Акцент на качество", desc: "Премиум качество" },
  { value: "features", label: "⚡ Акцент на функционал", desc: "Максимум возможностей" },
  { value: "support", label: "🤝 Акцент на поддержку", desc: "Полное сопровождение" },
  { value: "roi", label: "📊 Акцент на ROI", desc: "Окупаемость инвестиций" },
  { value: "cases", label: "🏆 Акцент на кейсы", desc: "Опыт и результаты" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300",
  running: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  completed: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
};

interface CampaignVariant {
  id: string;
  name: string;
  focus: string;
  focus_display: string;
  content: string;
  sent_count: number;
  viewed_count: number;
  converted_count: number;
  conversion_rate: number;
  total_sent: number;
  total_converted: number;
}

interface ABCampaign {
  id: string;
  name: string;
  description: string;
  status: string;
  status_display: string;
  variants: CampaignVariant[];
  variant_count: number;
  winner_name: string | null;
  created_at: string;
}

type TabView = "generate" | "campaigns" | "stats";

export function ABTestingPage() {
  const [activeTab, setActiveTab] = useState<TabView>("generate");
  const [selectedCampaign, setSelectedCampaign] = useState<ABCampaign | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="A/B Тестирование КП"
        description="Создавайте варианты коммерческих предложений и отслеживайте конверсию"
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700">
        {[
          { value: "generate" as const, label: "Создать тест", icon: Plus },
          { value: "campaigns" as const, label: "Кампании", icon: FlaskConical },
          { value: "stats" as const, label: "Статистика", icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.value
                  ? "border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300"
                  : "border-transparent text-surface-500 hover:border-surface-300 hover:text-surface-700 dark:hover:border-surface-600"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "generate" && <GenerateTab />}
      {activeTab === "campaigns" && <CampaignsTab onSelect={setSelectedCampaign} />}
      {activeTab === "stats" && <StatsTab />}

      {/* Campaign Detail Modal */}
      {selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      )}
    </div>
  );
}

function GenerateTab() {
  const [campaignName, setCampaignName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [selectedFocuses, setSelectedFocuses] = useState<string[]>(["price", "timeline"]);
  const [result, setResult] = useState<{ campaign: ABCampaign; variants: CampaignVariant[] } | null>(null);
  const [activeVariant, setActiveVariant] = useState<CampaignVariant | null>(null);

  const generateMutation = useMutation({
    mutationFn: () =>
      aiApi.abTest.generate({
        campaign_name: campaignName || `A/B тест: ${projectName}`,
        project_name: projectName,
        client_name: clientName,
        focuses: selectedFocuses,
      }),
    onSuccess: (res) => {
      setResult(res.data);
      setActiveVariant(res.data.variants[0]);
    },
  });

  const toggleFocus = (focus: string) => {
    setSelectedFocuses((prev) =>
      prev.includes(focus)
        ? prev.filter((f) => f !== focus)
        : [...prev, focus]
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left - Input */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Параметры теста
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-surface-600 dark:text-surface-300">
                Название кампании
              </label>
              <input
                className="input"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder={`A/B тест: ${projectName || "Проект"}`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-surface-600 dark:text-surface-300">
                Название проекта
              </label>
              <input
                className="input"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Например: Интернет-магазин"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-surface-600 dark:text-surface-300">
                Клиент
              </label>
              <input
                className="input"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Например: ООО Ромашка"
              />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Акценты вариантов ({selectedFocuses.length})
          </h3>
          <p className="mb-3 text-xs text-surface-500">
            Выберите 2-5 разных акцентов для A/B сравнения
          </p>
          <div className="space-y-1.5">
            {FOCUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleFocus(opt.value)}
                disabled={!selectedFocuses.includes(opt.value) && selectedFocuses.length >= 5}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left text-xs transition-all",
                  selectedFocuses.includes(opt.value)
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                    : "border-surface-200 text-surface-600 hover:border-surface-300 dark:border-surface-700 dark:text-surface-400"
                )}
              >
                {opt.label}
                <span className="mt-0.5 block text-[10px] text-surface-400">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>

          <Button
            onClick={() => generateMutation.mutate()}
            loading={generateMutation.isPending}
            fullWidth
            disabled={selectedFocuses.length < 2 || !projectName || !clientName}
            className="mt-4"
          >
            <Sparkles className="h-4 w-4" />
            Создать {selectedFocuses.length} варианта
          </Button>
        </Card>
      </div>

      {/* Right - Results */}
      <div className="lg:col-span-2 space-y-4">
        {generateMutation.isPending ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-20">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-sm text-surface-500">
                DEO AI генерирует варианты...
              </p>
              <p className="text-xs text-surface-400">
                Создаётся {selectedFocuses.length} вариантов с разными акцентами
              </p>
            </div>
          </Card>
        ) : result ? (
          <>
            {/* Variant Tabs */}
            <div className="flex gap-2 overflow-x-auto">
              {result.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setActiveVariant(v)}
                  className={cn(
                    "flex-shrink-0 rounded-lg border px-4 py-2 text-left text-xs transition-all",
                    activeVariant?.id === v.id
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                      : "border-surface-200 hover:border-surface-300 dark:border-surface-700"
                  )}
                >
                  <p className="font-medium text-surface-900 dark:text-white">
                    {v.name}
                  </p>
                  <p className="mt-0.5 text-surface-500">{v.focus_display}</p>
                </button>
              ))}
            </div>

            {/* Active Variant Content */}
            {activeVariant && (
              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
                    {activeVariant.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{activeVariant.focus_display}</Badge>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeVariant.content);
                      }}
                      className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap rounded-lg bg-surface-50 p-4 text-sm text-surface-700 dark:bg-surface-900 dark:text-surface-300 font-sans">
                  {activeVariant.content}
                </pre>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <div className="flex flex-col items-center justify-center py-20">
              <FlaskConical className="h-16 w-16 text-surface-300" />
              <p className="mt-4 text-sm font-medium text-surface-500">
                Создайте A/B тест
              </p>
              <p className="text-xs text-surface-400">
                Выберите акценты и заполните параметры проекта
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function CampaignsTab({
  onSelect,
}: {
  onSelect: (c: ABCampaign) => void;
}) {
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["ab-campaigns"],
    queryFn: () => aiApi.abTest.campaigns.list().then((r) => r.data?.results || r.data as ABCampaign[]),
  });

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </Card>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center py-12 text-center">
          <FlaskConical className="mb-3 h-12 w-12 text-surface-300" />
          <p className="text-sm font-medium text-surface-500">
            Нет A/B тестов
          </p>
          <p className="mt-1 text-xs text-surface-400">
            Создайте первый тест во вкладке «Создать тест»
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {campaigns.map((c) => {
        const bestVariant = c.variants?.reduce(
          (best, v) => (v.conversion_rate > (best?.conversion_rate || 0) ? v : best),
          null as CampaignVariant | null
        );

        return (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="card text-left transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-surface-900 dark:text-white">
                {c.name}
              </h3>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                  STATUS_COLORS[c.status] || ""
                )}
              >
                {c.status_display}
              </span>
            </div>

            <p className="mb-3 text-xs text-surface-500 line-clamp-2">
              {c.description || "Нет описания"}
            </p>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-surface-50 p-2 dark:bg-surface-800">
                <p className="text-lg font-bold text-surface-900 dark:text-white">
                  {c.variant_count}
                </p>
                <p className="text-[10px] text-surface-500">Вариантов</p>
              </div>
              <div className="rounded-lg bg-surface-50 p-2 dark:bg-surface-800">
                <p className="text-lg font-bold text-surface-900 dark:text-white">
                  {c.variants?.reduce((s, v) => s + v.total_sent, 0) || 0}
                </p>
                <p className="text-[10px] text-surface-500">Отправлено</p>
              </div>
              <div className="rounded-lg bg-surface-50 p-2 dark:bg-surface-800">
                <p className="text-lg font-bold text-green-600">
                  {bestVariant?.conversion_rate || 0}%
                </p>
                <p className="text-[10px] text-surface-500">Лучший</p>
              </div>
            </div>

            {c.winner_name && (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Победитель: {c.winner_name}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function StatsTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["ab-stats"],
    queryFn: () => aiApi.abTest.stats().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <div className="flex flex-col items-center py-12 text-center">
          <BarChart3 className="mb-3 h-12 w-12 text-surface-300" />
          <p className="text-sm text-surface-500">
            Нет данных для статистики
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center gap-2 text-brand-600">
            <FlaskConical className="h-5 w-5" />
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {stats.total_campaigns}
          </p>
          <p className="text-sm text-surface-500">Всего кампаний</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-green-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {stats.active_campaigns}
          </p>
          <p className="text-sm text-surface-500">Активных</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-purple-600">
            <Send className="h-5 w-5" />
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {stats.total_sent}
          </p>
          <p className="text-sm text-surface-500">Отправлено КП</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-warning-600">
            <Target className="h-5 w-5" />
          </div>
          <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
            {stats.overall_conversion_rate || 0}%
          </p>
          <p className="text-sm text-surface-500">Конверсия</p>
        </Card>
      </div>

      {/* Focus Breakdown */}
      {stats.focus_breakdown && stats.focus_breakdown.length > 0 && (
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Разбивка по акцентам
          </h3>
          <div className="space-y-3">
            {stats.focus_breakdown.map((item: any) => (
              <div
                key={item.focus}
                className="flex items-center justify-between rounded-lg border border-surface-200 p-4 dark:border-surface-700"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-900 dark:text-white">
                    {FOCUS_OPTIONS.find((f) => f.value === item.focus)?.label.split(" ").slice(1).join(" ") || item.focus}
                  </p>
                  <p className="text-xs text-surface-500">
                    {item.sent} отправлено · {item.converted} конверсий
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-24 rounded-full bg-surface-200 dark:bg-surface-700">
                    <div
                      className="h-2 rounded-full bg-brand-600"
                      style={{
                        width: `${Math.min(item.rate * 5, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="min-w-[48px] text-right text-sm font-bold text-surface-900 dark:text-white">
                    {item.rate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top Variant */}
      {stats.top_variant?.name && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-warning-50 p-2 dark:bg-warning-900/20">
                <Target className="h-5 w-5 text-warning-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-white">
                  Лучший вариант: {stats.top_variant.name}
                </p>
                <p className="text-xs text-surface-500">
                  Конверсия: {stats.top_variant.conversion_rate}%
                </p>
              </div>
            </div>
            <Badge variant="success">Победитель</Badge>
          </div>
        </Card>
      )}
    </div>
  );
}

function CampaignDetailModal({
  campaign,
  onClose,
}: {
  campaign: ABCampaign;
  onClose: () => void;
}) {
  const [selectedVariant, setSelectedVariant] = useState<CampaignVariant>(
    campaign.variants?.[0]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-10 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-surface-900 m-4">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">
              {campaign.name}
            </h2>
            <p className="mt-1 text-sm text-surface-500">
              {campaign.description}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                STATUS_COLORS[campaign.status]
              )}
            >
              {campaign.status_display}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Variant Comparison */}
        {campaign.variants && campaign.variants.length > 0 && (
          <>
            {/* Variant Selector */}
            <div className="mb-4 flex gap-2 overflow-x-auto">
              {campaign.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariant(v)}
                  className={cn(
                    "flex-shrink-0 rounded-lg border px-4 py-2 text-left text-xs transition-all",
                    selectedVariant?.id === v.id
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                      : "border-surface-200 hover:border-surface-300 dark:border-surface-700"
                  )}
                >
                  <p className="font-medium text-surface-900 dark:text-white">
                    {v.name}
                  </p>
                  <p className="mt-1 text-surface-500">{v.focus_display}</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px]">
                    <span className="text-surface-400">
                      <Send className="mr-0.5 inline h-3 w-3" />
                      {v.total_sent}
                    </span>
                    <span className="text-green-600">
                      <CheckCircle2 className="mr-0.5 inline h-3 w-3" />
                      {v.conversion_rate}%
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Stats Comparison */}
            <div className="mb-4 grid grid-cols-3 gap-3">
              {["Отправлено", "Конверсий", "Конверсия"].map((label, i) => (
                <div key={label} className="rounded-lg bg-surface-50 p-3 text-center dark:bg-surface-800">
                  <p className="text-xs text-surface-500">{label}</p>
                  <div className="mt-1 space-y-1">
                    {campaign.variants.map((v) => (
                      <div key={v.id} className="flex items-center justify-between text-xs">
                        <span className="text-surface-600 dark:text-surface-300">
                          {v.name.split(":")[0]}
                        </span>
                        <span className="font-medium text-surface-900 dark:text-white">
                          {i === 0 ? v.total_sent : i === 1 ? v.total_converted : `${v.conversion_rate}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Variant Content */}
            {selectedVariant && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-200">
                  {selectedVariant.name}
                </h4>
                <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg bg-surface-50 p-4 text-sm text-surface-700 dark:bg-surface-900 dark:text-surface-300 font-sans">
                  {selectedVariant.content}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
