"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Download, Table2 } from "lucide-react";

import { surveysApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { toast } from "@/shared/ui/Toast";
import { cn } from "@/shared/utils/cn";
import type { ResponseRow, ResponsesTable } from "@/entities/surveys/types";
import { SurveyHeader } from "@/features/surveys/SurveyHeader";
import {
  extractError,
  filenameFromDisposition,
  formatDate,
  formatDateTime,
} from "@/features/surveys/utils";

const PAGE_SIZES = [20, 50, 100];

export function SurveyResponsesPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [QUERY_KEYS.SURVEY_RESPONSES, id, page, pageSize],
    queryFn: () =>
      surveysApi
        .responses(id, { page, page_size: pageSize })
        .then((res) => res.data as ResponsesTable),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await surveysApi.exportCsv(id);
      const filename = filenameFromDisposition(res.headers?.["content-disposition"]);
      downloadBlob(res.data, filename || `survey-${id}.csv`);
    } catch (err) {
      toast({ title: "Не удалось выгрузить CSV", message: extractError(err), type: "error" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SurveyHeader
        id={id}
        active="responses"
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={handleExport}
            loading={exporting}
            disabled={!data?.count}
          >
            <Download className="h-4 w-4" />
            Экспорт CSV
          </Button>
        }
      />
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" text="Загружаем ответы..." />
        </div>
      ) : error || !data ? (
        <EmptyState title="Не удалось загрузить ответы" description={extractError(error)} />
      ) : (
        <ResponsesTableView
          table={data}
          page={page}
          pageSize={pageSize}
          loading={isFetching}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Pure view over `GET /surveys/{id}/responses/` (exported for tests). */
export function ResponsesTableView({
  table: data,
  page,
  pageSize,
  loading = false,
  onPageChange,
  onPageSizeChange,
}: {
  table: ResponsesTable;
  page: number;
  pageSize: number;
  loading?: boolean;
  onPageChange: (_page: number) => void;
  onPageSizeChange: (_size: number) => void;
}) {
  const columns = useMemo<ColumnDef<ResponseRow>[]>(() => {
    const first: ColumnDef<ResponseRow> = {
      id: "respondent",
      header: data.is_anonymous ? "Дата" : "Респондент",
      cell: ({ row }) =>
        data.is_anonymous ? (
          <span className="tabular-nums">{formatDate(row.original.submitted_date)}</span>
        ) : (
          <div className="min-w-0">
            <p className="truncate font-medium text-surface-900 dark:text-white">
              {row.original.respondent_name || "Без имени"}
            </p>
            <p className="text-xs tabular-nums text-surface-500">
              {row.original.submitted_at
                ? formatDateTime(row.original.submitted_at)
                : formatDate(row.original.submitted_date)}
            </p>
          </div>
        ),
    };
    const questionColumns: ColumnDef<ResponseRow>[] = data.columns.map((column) => ({
      id: column.id,
      header: () => (
        <span
          className="block"
          title={`${column.code ? `${column.code} ` : ""}${column.text}\nРаздел: ${column.section_title}`}
        >
          {column.code && (
            <span className="block font-semibold text-surface-900 dark:text-white">
              {column.code}
            </span>
          )}
          <span className="line-clamp-2 font-normal">{column.text}</span>
        </span>
      ),
      cell: ({ row }) => {
        const cell = row.original.answers[column.id];
        if (!cell || !cell.display) {
          return <span className="text-surface-300 dark:text-surface-600">—</span>;
        }
        return (
          <span className="line-clamp-3 whitespace-pre-line" title={cell.display}>
            {cell.display}
          </span>
        );
      },
    }));
    return [first, ...questionColumns];
  }, [data.columns, data.is_anonymous]);

  const table = useReactTable({
    data: data.results,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(data.count / pageSize)),
  });

  if (data.count === 0) {
    return (
      <EmptyState
        icon={<Table2 className="h-10 w-10" />}
        title="Ответов пока нет"
        description="Каждый отправленный опрос станет строкой таблицы, вопросы — колонками."
      />
    );
  }

  const pageCount = Math.max(1, Math.ceil(data.count / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(data.count, page * pageSize);

  return (
    <Card
      padding="none"
      className={cn("overflow-hidden transition-opacity", loading && "opacity-70")}
    >
      <div className="overflow-x-auto" role="region" aria-label="Таблица ответов" tabIndex={0}>
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header, index) => (
                  <th
                    key={header.id}
                    scope="col"
                    className={cn(
                      "border-b border-surface-200 bg-surface-50 px-4 py-3 text-left align-bottom text-xs font-medium text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300",
                      index === 0
                        ? "sticky left-0 z-20 min-w-[9rem] max-w-[14rem] border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                        : "min-w-[12rem] max-w-[20rem]"
                    )}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="group">
                {row.getVisibleCells().map((cell, index) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "border-b border-surface-100 px-4 py-3 align-top text-surface-700 group-hover:bg-surface-50 dark:border-surface-700/60 dark:text-surface-200 dark:group-hover:bg-surface-700/40",
                      index === 0
                        ? "sticky left-0 z-10 max-w-[14rem] border-r border-r-surface-200 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] dark:border-r-surface-700 dark:bg-surface-800"
                        : "max-w-[20rem]"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-surface-200 px-4 py-3 text-sm dark:border-surface-700 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-surface-500">
          {from}–{to} из {data.count}
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-surface-500">
            На странице
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-surface-300 bg-white py-1 pl-2 text-sm dark:border-surface-600 dark:bg-surface-800"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Предыдущая страница"
              className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 disabled:opacity-30 dark:hover:bg-surface-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tabular-nums text-surface-600 dark:text-surface-300">
              {page} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pageCount || !data.next}
              aria-label="Следующая страница"
              className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 disabled:opacity-30 dark:hover:bg-surface-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
