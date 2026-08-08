"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  Users,
  FileUp,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Select } from "@/shared/ui/Select";
import { crmApi, leadsApi } from "@/shared/api/base";
import { cn } from "@/shared/utils/formatters";

export function ImportExportPage() {
  const [importResult, setImportResult] = useState<{ created: number; errors: string[]; total: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStage, setImportStage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleExport = async () => {
    try {
      const res = await leadsApi.list({ limit: 10000 });
      const data = res.data?.results || [];
      const headers = ["Контакт", "Компания", "Телефон", "Email", "Telegram", "Бюджет", "Этап", "Источник", "Заметки", "Создан"];
      const rows = data.map((l: any) => [
        l.contact_name,
        l.company_name,
        l.phone,
        l.email,
        l.telegram,
        l.budget || "",
        l.stage_name,
        l.source,
        (l.notes || "").replace(/"/g, '""'),
        l.created_at,
      ]);
      const csv = [headers.join(","), ...rows.map((r: string[]) =>
        r.map((v) => `"${v}"`).join(",")
      )].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (importStage) formData.append("stage_id", importStage);

      const res = await crmApi.leads.importCsv(formData);
      setImportResult(res.data as { created: number; errors: string[]; total: number });
    } catch (err: any) {
      setImportResult({
        created: 0,
        errors: [err?.response?.data?.detail || err?.message || "Ошибка импорта"],
        total: 0,
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Импорт / Экспорт"
        description="Загрузка CSV, массовое редактирование и выгрузка данных"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Export */}
        <Card>
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-brand-50 p-3 dark:bg-brand-900/20">
              <Download className="h-6 w-6 text-brand-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                Экспорт лидов
              </h3>
              <p className="mt-1 text-sm text-surface-500">
                Выгрузите все лиды в CSV-файл для анализа в Excel или Google Sheets.
                Файл содержит все поля: контакт, компания, телефон, email, бюджет, этап, источник, заметки.
              </p>
              <Button className="mt-4" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Скачать CSV
              </Button>
            </div>
          </div>
        </Card>

        {/* Import */}
        <Card>
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-success-50 p-3 dark:bg-green-900/20">
              <Upload className="h-6 w-6 text-success-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                Импорт лидов
              </h3>
              <p className="mt-1 text-sm text-surface-500">
                Загрузите CSV-файл с лидами. Формат: Контакт, Компания, Телефон, Email, Telegram, Бюджет, Источник, Заметки.
                Первая строка должна содержать заголовки.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <Select
              label="Этап для новых лидов (опционально)"
              options={[
                { value: "", label: "Первый этап (по умолчанию)" },
              ]}
              value={importStage}
              onChange={(e) => setImportStage(e.target.value)}
            />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "mt-4 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all",
              dragOver
                ? "border-brand-400 bg-brand-50/50 dark:border-brand-600 dark:bg-brand-900/10"
                : "border-surface-300 hover:border-surface-400 dark:border-surface-600 dark:hover:border-surface-500"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {isImporting ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                <p className="text-sm text-surface-500">Импортируем...</p>
              </div>
            ) : (
              <>
                <FileUp className="mx-auto h-8 w-8 text-surface-400" />
                <p className="mt-2 text-sm font-medium text-surface-600 dark:text-surface-300">
                  Перетащите CSV-файл сюда
                </p>
                <p className="mt-1 text-xs text-surface-400">
                  или нажмите для выбора файла
                </p>
              </>
            )}
          </div>

          {/* Import result */}
          {importResult && (
            <div className={cn(
              "mt-4 rounded-xl border p-4",
              importResult.errors.length === 0
                ? "border-success-200 bg-success-50 dark:border-green-800 dark:bg-green-900/20"
                : "border-warning-200 bg-warning-50 dark:border-yellow-800 dark:bg-yellow-900/20"
            )}>
              <div className="flex items-center gap-2">
                {importResult.errors.length === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-success-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-warning-600" />
                )}
                <p className="text-sm font-medium">
                  Импортировано: {importResult.created} / {importResult.total}
                </p>
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-warning-700 dark:text-yellow-300">
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-brand-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-surface-900 dark:text-white">
              Массовое редактирование и объединение дублей
            </h4>
            <p className="mt-1 text-sm text-surface-500">
              Для массового редактирования экспортируйте лиды, отредактируйте в Excel и импортируйте обратно.
              Система автоматически проверяет дубли по телефону и email при импорте.
            </p>
            <div className="mt-3 flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2 text-surface-600 dark:text-surface-300">
                <FileSpreadsheet className="h-4 w-4" />
                Поддержка CSV
              </div>
              <div className="flex items-center gap-2 text-surface-600 dark:text-surface-300">
                <Users className="h-4 w-4" />
                Массовое создание
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
