"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Card } from "@/shared/ui/Card";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { Sparkles, Copy, Check, Bot } from "lucide-react";

const promptTypes = [
  { value: "tz", label: "Техническое задание" },
  { value: "commercial_offer", label: "Коммерческое предложение" },
  { value: "contract", label: "Договор" },
  { value: "report", label: "Отчет" },
  { value: "summary", label: "Сводка" },
  { value: "estimate", label: "Оценка стоимости" },
];

export function GenerateAIForm() {
  const queryClient = useQueryClient();
  const [type, setType] = useState("tz");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [additional, setAdditional] = useState("");
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      aiApi.generate(String(data.prompt_type || "tz"), data),
    onSuccess: (res) => {
      setResult(res.data.output);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_HISTORY] });
    },
  });

  const handleGenerate = () => {
    mutation.mutate({
      prompt_type: type,
      variables: {
        project_name: projectName,
        client_name: clientName,
        additional,
      },
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Параметры генерации
          </h3>
          <div className="space-y-3">
            <Select
              label="Тип документа"
              options={promptTypes}
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
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
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">
                Дополнительные требования
              </label>
              <textarea
                value={additional}
                onChange={(e) => setAdditional(e.target.value)}
                rows={3}
                className="input mt-1"
                placeholder="Опишите дополнительные требования..."
              />
            </div>
            <Button
              onClick={handleGenerate}
              loading={mutation.isPending}
              fullWidth
            >
              <Sparkles className="h-4 w-4" />
              Сгенерировать
            </Button>
          </div>
        </Card>
      </div>

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
                <><Check className="h-3 w-3" /> Скопировано</>
              ) : (
                <><Copy className="h-3 w-3" /> Копировать</>
              )}
            </button>
          )}
        </div>

        {mutation.isPending ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-sm text-surface-500">
                DEO AI генерирует контент...
              </p>
            </div>
          </div>
        ) : result ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <pre className="whitespace-pre-wrap rounded-lg bg-surface-50 p-4 text-sm text-surface-700 dark:bg-surface-900 dark:text-surface-300 font-sans">
              {result}
            </pre>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <Bot className="h-16 w-16 text-surface-300" />
            <p className="mt-4 text-sm text-surface-500">
              Заполните параметры и нажмите &quot;Сгенерировать&quot;
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
