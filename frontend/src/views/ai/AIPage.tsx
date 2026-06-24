"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Bot,
  FileText,
  FileSignature,
  FileSpreadsheet,
  FileJson,
  DollarSign,
  MessageSquareText,
  Sparkles,
  History,
  Copy,
  Check,
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
              <div className="flex items-center justify-between mb-4">
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
                <pre className="whitespace-pre-wrap rounded-lg bg-surface-50 p-4 text-sm text-surface-700 dark:bg-surface-900 dark:text-surface-300 font-sans">
                  {result}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center py-20">
                  <Bot className="h-16 w-16 text-surface-300" />
                  <p className="mt-4 text-sm text-surface-500">
                    Заполните параметры и нажмите "Сгенерировать"
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
          {(!history || history.length === 0) ? (
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
                      {formatDateTime(item.created_at)}
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
    </div>
  );
}
