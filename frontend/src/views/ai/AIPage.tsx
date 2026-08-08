"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  FileText,
  FileSignature,
  FileSpreadsheet,
  FileJson,
  DollarSign,
  MessageSquareText,
  Sparkles,
  Copy,
  Check,
  Settings2,
  PlugZap,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Input } from "@/shared/ui/Input";
import { Tabs } from "@/shared/ui/Tabs";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { aiApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatDateTime, cn } from "@/shared/utils/formatters";

const promptTypes = [
  {
    id: "tz",
    label: "ТЗ",
    icon: FileText,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
  },
  {
    id: "commercial_offer",
    label: "КП",
    icon: FileSignature,
    color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
  },
  {
    id: "contract",
    label: "Договор",
    icon: FileJson,
    color: "text-green-600 bg-green-50 dark:bg-green-900/20",
  },
  {
    id: "report",
    label: "Отчет",
    icon: FileSpreadsheet,
    color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
  },
  {
    id: "summary",
    label: "Сводка",
    icon: MessageSquareText,
    color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20",
  },
  {
    id: "estimate",
    label: "Оценка",
    icon: DollarSign,
    color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
  },
];

interface AISettingsData {
  api_url: string;
  api_key_preview: string;
  model: string;
  temperature: string;
  max_tokens: number;
  timeout: number;
  enabled: boolean;
  configured: boolean;
  updated_at: string;
}

export function AIPage() {
  const [activeTab, setActiveTab] = useState("generate");
  const [selectedType, setSelectedType] = useState<string>("tz");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [result, setResult] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const { data: history } = useQuery({
    queryKey: [QUERY_KEYS.AI_HISTORY],
    queryFn: () => aiApi.history(),
    select: (res) => res.data?.results || res.data as any[],
    enabled: activeTab === "history",
  });

  const generateMutation = useMutation({
    mutationFn: (data: { type: string; variables: Record<string, string> }) =>
      aiApi.generateTZ({
        prompt_type: data.type,
        variables: data.variables,
      }),
    onSuccess: (res) => {
      setResult(res.data.output);
    },
    onError: (err) => {
      const data = (err as { response?: { data?: { error?: string } } }).response?.data;
      setResult("");
      alert(data?.error || "Не удалось выполнить генерацию");
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      type: selectedType,
      variables: {
        project_name: projectName,
        client_name: clientName,
      },
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="DEO AI"
        description="Интеллектуальный помощник для автоматизации задач"
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        tabs={[
          { value: "generate", label: "Генерация" },
          { value: "history", label: "История" },
          { value: "settings", label: "Настройки" },
        ]}
      />

      {activeTab === "generate" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left - Input */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
                Выберите тип генерации
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {promptTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-all",
                        selectedType === type.id
                          ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                          : "border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-400"
                      )}
                    >
                      <div className={cn("rounded-lg p-1.5", type.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
                Параметры
              </h3>
              <div className="space-y-3">
                <Input
                  label="Название проекта"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Например: Интернет-магазин"
                />
                <Input
                  label="Клиент"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Например: ООО Ромашка"
                />
                <Button
                  onClick={handleGenerate}
                  loading={generateMutation.isPending}
                  fullWidth
                  className="mt-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Сгенерировать
                </Button>
              </div>
            </Card>
          </div>

          {/* Right - Result */}
          <div className="lg:col-span-2">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
                  Результат
                </h3>
                {result && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs text-surface-500 hover:text-surface-700"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" />
                        Скопировано
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Копировать
                      </>
                    )}
                  </button>
                )}
              </div>

              {generateMutation.isPending ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-sm text-surface-500">
                      DEO AI генерирует контент...
                    </p>
                  </div>
                </div>
              ) : result ? (
                <pre className="whitespace-pre-wrap rounded-lg bg-surface-50 p-4 font-sans text-sm text-surface-700 dark:bg-surface-900 dark:text-surface-300">
                  {result}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center py-20">
                  <Bot className="h-16 w-16 text-surface-300" />
                  <p className="mt-4 text-sm text-surface-500">
                    Заполните параметры и нажмите &quot;Сгенерировать&quot;
                  </p>
                  <p className="text-xs text-surface-400">
                    DEO AI поможет с созданием ТЗ, КП, договоров и отчетов
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <Card padding="none">
          {!history || history.length === 0 ? (
            <div className="p-12 text-center text-sm text-surface-500">
              История запросов пуста
            </div>
          ) : (
            <div className="divide-y divide-surface-200 dark:divide-surface-700">
              {history.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {item.prompt_type}
                    </p>
                    <p className="text-xs text-surface-500">
                      {formatDateTime(item.created_at)} · {item.model || "—"}
                    </p>
                  </div>
                  <Badge
                    variant={item.status === "completed" ? "success" : "default"}
                  >
                    {item.status === "completed" ? "Готово" : item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "settings" && <AISettingsTab />}
    </div>
  );
}

/* ---------------- AI settings ---------------- */

function AISettingsTab() {
  const queryClient = useQueryClient();
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState(2048);
  const [enabled, setEnabled] = useState(true);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.AI_SETTINGS],
    queryFn: () => aiApi.settings.get(),
    select: (res) => res.data as AISettingsData,
  });

  // Sync form when settings load
  const [synced, setSynced] = useState(false);
  if (settings && !synced) {
    setSynced(true);
    setApiUrl(settings.api_url || "");
    setModel(settings.model || "");
    setTemperature(String(Number(settings.temperature) || 0.7));
    setMaxTokens(settings.max_tokens || 2048);
    setEnabled(settings.enabled);
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      aiApi.settings.update({
        api_url: apiUrl,
        api_key: apiKey,
        model,
        temperature: Number(temperature) || 0,
        max_tokens: Number(maxTokens) || 0,
        enabled,
      }),
    onSuccess: () => {
      setApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_SETTINGS] });
    },
  });

  const testMutation = useMutation({
    mutationFn: () =>
      aiApi.settings.test({
        api_url: apiUrl,
        api_key: apiKey,
        model,
      }),
    onSuccess: (res) => {
      const r = res.data as { ok: boolean; model: string; response: string };
      setTestResult({
        ok: true,
        message: `Подключение работает. Модель: ${r.model}. Ответ: ${r.response || "—"}`,
      });
    },
    onError: (err) => {
      const data = (err as { response?: { data?: { error?: string } } }).response?.data;
      setTestResult({ ok: false, message: data?.error || "Не удалось подключиться" });
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Status */}
      <Card>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl",
                settings?.configured
                  ? "bg-success-50 text-success-600 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-warning-50 text-warning-600 dark:bg-yellow-900/20 dark:text-yellow-400"
              )}
            >
              {settings?.configured ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-medium text-surface-900 dark:text-white">
                {settings?.configured ? "Провайдер настроен" : "AI не настроен"}
              </p>
              <p className="text-sm text-surface-500">
                {settings?.configured
                  ? `Модель: ${settings.model}`
                  : "Укажите API URL, ключ и модель ниже"}
              </p>
            </div>
          </div>
          {settings?.configured && (
            <Badge variant="success">Активно</Badge>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <Input
            label="API URL"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://provider.example.com/v1"
            hint="OpenAI-совместимый endpoint (без /chat/completions)"
          />
          <Input
            label="API ключ"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={settings?.api_key_preview || "Введите ключ"}
            hint={
              settings?.api_key_preview
                ? `Текущий ключ: ${settings.api_key_preview} — оставьте поле пустым, чтобы не менять`
                : "Ключ хранится в зашифрованном виде и никогда не показывается полностью"
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="AI модель"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="например: kr/qwen3-coder-next"
            />
            <Input
              label="Температура"
              type="number"
              step="0.1"
              min={0}
              max={2}
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Макс. токенов"
              type="number"
              min={1}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value) || 0)}
            />
            <label className="flex items-center gap-2 pt-6 text-sm text-surface-600 dark:text-surface-300">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 accent-brand-600"
              />
              AI включен
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => testMutation.mutate()}
              loading={testMutation.isPending}
              disabled={!apiUrl && !apiKey && !model}
            >
              <PlugZap className="h-4 w-4" /> Проверить подключение
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!apiUrl || !model}
            >
              <Settings2 className="h-4 w-4" /> Сохранить
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-success-600">
                <Check className="h-4 w-4" /> Сохранено
              </span>
            )}
          </div>

          {testResult && (
            <div
              className={cn(
                "rounded-lg border px-4 py-3 text-sm",
                testResult.ok
                  ? "border-success-200 bg-success-50 text-success-700 dark:border-success-800 dark:bg-green-900/20 dark:text-green-300"
                  : "border-danger-200 bg-danger-50 text-danger-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
              )}
            >
              {testResult.message}
            </div>
          )}
        </div>
      </Card>

      {/* How it works */}
      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-700 dark:text-surface-200">
          <Settings2 className="h-4 w-4" /> Как это работает
        </h3>
        <ol className="space-y-3 text-sm text-surface-600 dark:text-surface-300">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">1</span>
            Настройте OpenAI-совместимый провайдер: укажите API URL, ключ и модель.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">2</span>
            Нажмите «Проверить подключение» — DEO AI отправит тестовый запрос.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">3</span>
            Сохраните настройки и используйте генерацию ТЗ, КП, договоров и отчетов.
          </li>
        </ol>
        <div className="mt-5 rounded-lg bg-surface-50 p-4 text-xs text-surface-500 dark:bg-surface-800/60">
          <p className="mb-1 font-medium text-surface-600 dark:text-surface-300">Безопасность:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>API-ключ хранится в настройках приложения и никогда не возвращается API целиком — только маскированный превью.</li>
            <li>Значения из переменных окружения (AI_API_URL, AI_API_KEY, AI_MODEL) используются как запасной вариант.</li>
            <li>Запросы и результаты сохраняются в истории AI для аудита.</li>
          </ul>
        </div>
        {isLoading && (
          <div className="mt-4 flex justify-center"><LoadingSpinner /></div>
        )}
      </Card>
    </div>
  );
}
