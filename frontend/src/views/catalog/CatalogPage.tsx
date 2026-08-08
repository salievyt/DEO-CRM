"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Boxes,
  Wrench,
  Repeat,
  Plus,
  Download,
  Upload,
  Search,
  MoreVertical,
  History,
  PackagePlus,
  Archive,
  Trash2,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { SearchInput } from "@/shared/ui/SearchInput";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { catalogApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatCurrency, formatDate, cn } from "@/shared/utils/formatters";
import type {
  CatalogItem,
  CatalogItemType,
  CatalogItemWritePayload,
  CatalogStatus,
} from "@/entities/catalog/types";

const TYPE_SINGLE: Record<CatalogItemType, string> = {
  product: "Товар",
  service: "Услуга",
  package: "Пакет",
  subscription: "Подписка",
};

const TABS: { value: CatalogItemType | "all"; label: string; icon: typeof Boxes }[] = [
  { value: "all", label: "Все", icon: Layers },
  { value: "product", label: "Товары", icon: Boxes },
  { value: "service", label: "Услуги", icon: Wrench },
  { value: "package", label: "Пакеты", icon: Package },
  { value: "subscription", label: "Подписки", icon: Repeat },
];

export function CatalogPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<CatalogItemType | "all">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [historyItem, setHistoryItem] = useState<CatalogItem | null>(null);
  const [restockItem, setRestockItem] = useState<CatalogItem | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<CatalogItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const params = useMemo(() => {
    const p: Record<string, unknown> = { page, page_size: 20, ordering };
    if (tab !== "all") p.type = tab;
    if (debouncedSearch) p.search = debouncedSearch;
    if (statusFilter) p.status = statusFilter;
    if (stockFilter) p.stock_status = stockFilter;
    if (categoryFilter) p.category = categoryFilter;
    return p;
  }, [page, ordering, tab, debouncedSearch, statusFilter, stockFilter, categoryFilter]);

  const { data: listData, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.CATALOG, params],
    queryFn: () => catalogApi.items.list(params),
    select: (res) => res.data as {
      count: number; results: CatalogItem[]; next: string | null; previous: string | null;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: [QUERY_KEYS.CATALOG_CATEGORIES],
    queryFn: () => catalogApi.categories.list(),
    select: (res) => res.data as { id: string; name: string }[],
  });

  const categories = categoriesData || [];
  const items = useMemo(() => listData?.results || [], [listData]);
  const lowStockCount = useMemo(
    () => items.filter((i) => i.type === "product" && i.stock_status !== "ok").length,
    [items]
  );

  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATALOG] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATALOG_CATEGORIES] });
  };

  const bulkMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => catalogApi.bulk(data),
    onSuccess: (res) => {
      invalidate();
      setSelected([]);
      setBulkOpen(false);
      setNotice(`Выполнено: ${(res.data as { affected: number }).affected} позиций`);
    },
  });

  const restockMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      catalogApi.items.restock(restockItem!.id, data),
    onSuccess: () => {
      invalidate();
      setRestockItem(null);
      setNotice("Остаток обновлён");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => catalogApi.items.delete(id),
    onSuccess: () => {
      invalidate();
      setDeleteItem(null);
      setNotice("Позиция удалена");
    },
  });

  const handleExport = async () => {
    try {
      const res = await catalogApi.exportCsv(params);
      const blob = new Blob([(res.data as Blob)], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalog_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* noop */ }
  };

  const handleImport = (file: File) => {
    catalogApi.importCsv(file).then((res) => {
      const r = res.data as { created: number; updated: number; errors: unknown[] };
      const errorsPart = r.errors.length ? `, ошибок ${r.errors.length}` : "";
      setNotice(`Импорт: создано ${r.created}, обновлено ${r.updated}${errorsPart}`);
      invalidate();
    });
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const pageCount = listData ? Math.max(1, Math.ceil(listData.count / 20)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Каталог"
        description="Товары, услуги, пакеты и подписки"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Импорт CSV
            </Button>
            <Button variant="secondary" onClick={handleExport}>
              <Download className="h-4 w-4" /> Экспорт CSV
            </Button>
            <Button onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> Добавить позицию
            </Button>
          </div>
        }
      />

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-800 dark:bg-success-900/20 dark:text-success-300">
          <span>{notice}</span>
          <button className="ml-auto text-xs underline" onClick={() => setNotice(null)}>ок</button>
        </div>
      )}

      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4" />
          {lowStockCount} позиций требуют пополнения остатков
          <button
            className="ml-auto text-xs font-medium underline"
            onClick={() => { setStockFilter("low"); setPage(1); }}
          >
            Показать
          </button>
        </div>
      )}

      {/* Type tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-surface-200 bg-white p-1 dark:border-surface-700 dark:bg-surface-800">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => { setTab(t.value); setPage(1); setSelected([]); }}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all sm:flex-none",
                tab === t.value
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                  : "text-surface-500 hover:bg-surface-100 hover:text-surface-800 dark:hover:bg-surface-700"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]">
        <SearchInput value={search} onChange={handleSearch} placeholder="Поиск по названию, артикулу..." />
        <Select
          className="lg:w-44"
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          options={[{ value: "", label: "Все категории" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <Select
          className="lg:w-40"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          options={[
            { value: "", label: "Все статусы" },
            { value: "active", label: "Активен" },
            { value: "inactive", label: "Неактивен" },
            { value: "archived", label: "В архиве" },
          ]}
        />
        <Select
          className="lg:w-44"
          value={stockFilter}
          onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
          options={[
            { value: "", label: "Все остатки" },
            { value: "out", label: "Нет в наличии" },
            { value: "low", label: "Низкий остаток" },
          ]}
        />
        <Select
          className="lg:w-44"
          value={ordering}
          onChange={(e) => { setOrdering(e.target.value); setPage(1); }}
          options={[
            { value: "-created_at", label: "Сначала новые" },
            { value: "name", label: "По имени А–Я" },
            { value: "-name", label: "По имени Я–А" },
            { value: "price", label: "Цена ↑" },
            { value: "-price", label: "Цена ↓" },
            { value: "stock", label: "Остаток ↑" },
          ]}
        />
      </div>

      {/* Bulk toolbar */}
      {selected.length > 0 && (
        <div className="flex animate-fade-in flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 dark:border-brand-800 dark:bg-brand-900/20">
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
            Выбрано: {selected.length}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setBulkOpen(true)}>
              <Archive className="h-4 w-4" /> Изменить
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="text-danger-600 hover:bg-danger-50"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Удалить
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Отменить
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="p-0">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Каталог пуст"
            description="Добавьте товары, услуги, пакеты или подписки"
            action={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Добавить позицию</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-100 dark:divide-surface-700">
              <thead className="bg-surface-50 dark:bg-surface-800/60">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="accent-brand-600"
                      checked={selected.length === items.length && items.length > 0}
                      onChange={(e) =>
                        setSelected(e.target.checked ? items.map((i) => i.id) : [])
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Позиция</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Категория</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">SKU</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Цена</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Себест.</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-surface-500">Остаток</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-surface-500">Статус</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Обновлено</th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                {items.map((item) => (
                  <tr key={item.id} className="group transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="accent-brand-600"
                        checked={selected.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                          <TypeIcon type={item.type} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-surface-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-surface-400">
                            {TYPE_SINGLE[item.type]}
                            {item.type === "subscription" && item.billing_period ? ` · ${BILLING_LABELS[item.billing_period]}` : ""}
                            {item.type === "service" && item.duration_minutes ? ` · ${item.duration_minutes} мин` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-500">{item.category_name || "—"}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-surface-100 px-1.5 py-0.5 text-xs text-surface-600 dark:bg-surface-700 dark:text-surface-300">
                        {item.sku || "—"}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold text-surface-900 dark:text-white">{formatCurrency(item.price)}</p>
                      {item.discount > 0 && (
                        <p className="text-xs text-success-600">−{item.discount}%</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-surface-500">{formatCurrency(item.cost_price)}</td>
                    <td className="px-4 py-3 text-center">
                      {item.type === "product" ? (
                        <StockBadge status={item.stock_status} stock={item.stock} />
                      ) : (
                        <span className="text-xs text-surface-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-surface-400">{formatDate(item.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <RowActions
                        item={item}
                        onEdit={() => { setEditing(item); setShowForm(true); }}
                        onHistory={() => setHistoryItem(item)}
                        onRestock={() => setRestockItem(item)}
                        onDelete={() => setDeleteItem(item)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-surface-500">
          <span>
            Позиций: {listData?.count ?? 0} · стр. {page} из {pageCount}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Назад
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
              Вперёд
            </Button>
          </div>
        </div>
      )}

      {/* Create / edit modal */}
      <ItemFormModal
        open={showForm}
        editing={editing}
        categories={categories}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => {
          invalidate();
          setShowForm(false);
          setEditing(null);
        }}
      />

      {/* Price history modal */}
      <Modal
        open={!!historyItem}
        onClose={() => setHistoryItem(null)}
        title={`История цен: ${historyItem?.name || ""}`}
        size="lg"
      >
        {historyItem && <PriceHistoryPanel itemId={historyItem.id} />}
      </Modal>

      {/* Restock modal */}
      <Modal open={!!restockItem} onClose={() => setRestockItem(null)} title={`Пополнение: ${restockItem?.name || ""}`} size="sm">
        <RestockForm
          item={restockItem}
          submitting={restockMutation.isPending}
          onSubmit={(data) => restockMutation.mutate(data)}
          onClose={() => setRestockItem(null)}
        />
      </Modal>

      {/* Bulk ops modal */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Массовые операции" size="sm">
        <BulkForm
          categories={categories}
          submitting={bulkMutation.isPending}
          onSubmit={(data) => bulkMutation.mutate({ action: data.action, ids: selected, ...data.payload })}
          onClose={() => setBulkOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteItem}
        title="Удалить позицию?"
        description={deleteItem ? `«${deleteItem.name}» будет удалена без возможности восстановления.` : ""}
        confirmLabel="Удалить"
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        onCancel={() => setDeleteItem(null)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Удалить выбранные позиции?"
        description={`Будет удалено позиций: ${selected.length}`}
        confirmLabel="Удалить"
        onConfirm={() => bulkMutation.mutate({ action: "delete", ids: selected })}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}

function formatApiError(error: unknown): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (!data) return "проверьте данные";
  if (typeof data === "string") return data;
  const obj = data as Record<string, unknown>;
  if (obj.detail) return String(obj.detail);
  return Object.values(obj)
    .flat()
    .map(String)
    .join(", ");
}

const BILLING_LABELS: Record<string, string> = {
  monthly: "ежемесячно",
  quarterly: "ежеквартально",
  yearly: "ежегодно",
};

function TypeIcon({ type }: { type: CatalogItemType }) {
  const icons = {
    product: Boxes, service: Wrench, package: Package, subscription: Repeat,
  } as const;
  const Icon = icons[type] || Boxes;
  return <Icon className="h-5 w-5" />;
}

export function StockBadge({ status, stock }: { status: string; stock: number }) {
  if (status === "out") {
    return <Badge variant="danger">Нет ({stock})</Badge>;
  }
  if (status === "low") {
    return <Badge variant="warning">Мало ({stock})</Badge>;
  }
  return <Badge variant="success">{stock} шт.</Badge>;
}

export function StatusBadge({ status }: { status: CatalogStatus }) {
  if (status === "active") return <Badge variant="success">Активен</Badge>;
  if (status === "inactive") return <Badge variant="default">Неактивен</Badge>;
  return <Badge variant="default">В архиве</Badge>;
}

function RowActions({ item, onEdit, onHistory, onRestock, onDelete }: {
  item: CatalogItem;
  onEdit: () => void;
  onHistory: () => void;
  onRestock: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative opacity-0 transition-opacity group-hover:opacity-100">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-md p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-brand-600"
        aria-label="Действия"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-48 animate-scale-in rounded-xl border border-surface-200 bg-white py-1 shadow-xl dark:border-surface-700 dark:bg-surface-800">
            <RowAction icon={<PackagePlus className="h-4 w-4" />} label="Редактировать" onClick={() => { onEdit(); setOpen(false); }} />
            {item.type === "product" && (
              <RowAction icon={<Archive className="h-4 w-4" />} label="Пополнить остаток" onClick={() => { onRestock(); setOpen(false); }} />
            )}
            <RowAction icon={<History className="h-4 w-4" />} label="История цен" onClick={() => { onHistory(); setOpen(false); }} />
            <div className="my-1 border-t border-surface-100 dark:border-surface-700" />
            <RowAction icon={<Trash2 className="h-4 w-4" />} label="Удалить" danger onClick={() => { onDelete(); setOpen(false); }} />
          </div>
        </>
      )}
    </div>
  );
}

function RowAction({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
        danger
          ? "text-danger-600 hover:bg-danger-50 dark:text-red-400 dark:hover:bg-red-900/20"
          : "text-surface-700 hover:bg-surface-50 dark:text-surface-200 dark:hover:bg-surface-700/60"
      )}
    >
      {icon}{label}
    </button>
  );
}

/* ---------------- Item form ---------------- */

function ItemFormModal({ open, editing, categories, onClose, onSaved }: {
  open: boolean;
  editing: CatalogItem | null;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CatalogItemWritePayload & { package_items: { item: string; quantity: number }[] }>({
    name: "", description: "", type: "product", category: null, sku: "",
    price: 0, cost_price: 0, tax: 0, discount: 0, stock: 0, low_stock_threshold: 5,
    unit: "шт.", duration_minutes: null, billing_period: null, next_billing_date: null,
    status: "active", package_items: [], reason: "",
  });
  const [catSearch, setCatSearch] = useState("");

  // Reset form when modal opens
  const [lastKey, setLastKey] = useState<string | null>(null);
  const modalKey = editing?.id || "new";
  if (open && lastKey !== modalKey) {
    setLastKey(modalKey);
    setForm({
      name: editing?.name || "",
      description: editing?.description || "",
      type: editing?.type || "product",
      category: editing?.category || null,
      sku: editing?.sku || "",
      price: editing?.price ?? 0,
      cost_price: editing?.cost_price ?? 0,
      tax: editing?.tax ?? 0,
      discount: editing?.discount ?? 0,
      stock: editing?.stock ?? 0,
      low_stock_threshold: editing?.low_stock_threshold ?? 5,
      unit: editing?.unit || "шт.",
      duration_minutes: editing?.duration_minutes ?? null,
      billing_period: editing?.billing_period || null,
      next_billing_date: editing?.next_billing_date || null,
      status: editing?.status || "active",
      package_items: (editing?.package_items || []).map((p) => ({ item: p.item, quantity: Number(p.quantity) })),
      reason: "",
    });
  }

  // Load catalog items for the package picker
  const { data: pickerData } = useQuery({
    queryKey: [QUERY_KEYS.CATALOG, "picker", catSearch],
    queryFn: () => catalogApi.items.list({
      page_size: 50, type: catSearch ? undefined : undefined, search: catSearch || undefined,
      status: "active",
    }),
    select: (res) => (res.data as { results: CatalogItem[] }).results.filter(
      (i) => i.type === "product" || i.type === "service"
    ),
    enabled: open && form.type === "package",
  });

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editing ? catalogApi.items.update(editing.id, payload) : catalogApi.items.create(payload),
    onSuccess: onSaved,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const packageTotal = useMemo(() => {
    if (form.type !== "package") return null;
    const pool = pickerData || [];
    return form.package_items.reduce((acc, row) => {
      const it = pool.find((i) => i.id === row.item);
      return acc + (it ? it.price * row.quantity : 0);
    }, 0);
  }, [form.package_items, form.type, pickerData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description,
      type: form.type,
      category: form.category || undefined,
      sku: form.sku || undefined,
      price: Number(form.price) || 0,
      cost_price: Number(form.cost_price) || 0,
      tax: Number(form.tax) || 0,
      discount: Number(form.discount) || 0,
      status: form.status,
      reason: form.reason,
    };
    if (form.type === "product") {
      payload.stock = Number(form.stock) || 0;
      payload.low_stock_threshold = Number(form.low_stock_threshold) || 0;
      payload.unit = form.unit;
    }
    if (form.type === "service") {
      payload.duration_minutes = form.duration_minutes ? Number(form.duration_minutes) : null;
    }
    if (form.type === "subscription") {
      payload.billing_period = form.billing_period || null;
      payload.next_billing_date = form.next_billing_date || null;
    }
    if (form.type === "package") {
      payload.package_items = form.package_items.map((r) => ({ item: r.item, quantity: r.quantity }));
    }
    mutation.mutate(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Редактировать: ${editing.name}` : `Новая позиция`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-6 pt-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Название *" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          <Select
            label="Тип"
            value={form.type}
            onChange={(e) => set("type", e.target.value as CatalogItemType)}
            options={[
              { value: "product", label: "Товар" },
              { value: "service", label: "Услуга" },
              { value: "package", label: "Пакет" },
              { value: "subscription", label: "Подписка" },
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">Описание</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            className="input mt-1"
            placeholder="Краткое описание позиции"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Категория"
            value={form.category || ""}
            onChange={(e) => set("category", e.target.value || null)}
            options={[{ value: "", label: "Без категории" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <Select
            label="Статус"
            value={form.status}
            onChange={(e) => set("status", e.target.value as CatalogStatus)}
            options={[
              { value: "active", label: "Активен" },
              { value: "inactive", label: "Неактивен" },
              { value: "archived", label: "В архиве" },
            ]}
          />
        </div>

        {form.type === "product" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="SKU *" value={form.sku} onChange={(e) => set("sku", e.target.value)} required placeholder="Напр. LAP-001" />
            <Input label="Ед. изм." value={form.unit} onChange={(e) => set("unit", e.target.value)} />
            <Input label="Остаток" type="number" value={form.stock} onChange={(e) => set("stock", Number(e.target.value))} />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-4">
          <Input label="Цена" type="number" step="0.01" value={form.price} onChange={(e) => set("price", Number(e.target.value))} />
          <Input label="Себестоимость" type="number" step="0.01" value={form.cost_price} onChange={(e) => set("cost_price", Number(e.target.value))} />
          <Input label="Налог, %" type="number" step="0.01" value={form.tax} onChange={(e) => set("tax", Number(e.target.value))} />
          <Input label="Скидка, %" type="number" step="0.01" value={form.discount} onChange={(e) => set("discount", Number(e.target.value))} />
        </div>

        {form.type === "product" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Порог низкого остатка"
              type="number"
              value={form.low_stock_threshold}
              onChange={(e) => set("low_stock_threshold", Number(e.target.value))}
              hint="При остатке ≤ порога позиция подсвечивается"
            />
          </div>
        )}

        {form.type === "service" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Длительность (минут)"
              type="number"
              value={form.duration_minutes ?? ""}
              onChange={(e) => set("duration_minutes", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        )}

        {form.type === "subscription" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Период оплаты"
              value={form.billing_period || ""}
              onChange={(e) => set("billing_period", e.target.value || null)}
              options={[
                { value: "", label: "Не задан" },
                { value: "monthly", label: "Ежемесячно" },
                { value: "quarterly", label: "Ежеквартально" },
                { value: "yearly", label: "Ежегодно" },
              ]}
            />
            <Input
              label="Следующая оплата"
              type="date"
              value={form.next_billing_date || ""}
              onChange={(e) => set("next_billing_date", e.target.value || null)}
            />
          </div>
        )}

        {form.type === "package" && (
          <div className="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-surface-700 dark:text-surface-200">
                Состав пакета
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
                <input
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  placeholder="Найти позицию..."
                  className="input py-1.5 pl-8 text-sm"
                />
              </div>
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {(pickerData || []).map((it) => {
                const used = form.package_items.find((r) => r.item === it.id);
                return (
                  <div key={it.id} className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-800/60">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-100">{it.name}</p>
                      <p className="text-xs text-surface-400">{TYPE_SINGLE[it.type]} · {formatCurrency(it.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        className="input w-20 py-1 text-sm"
                        value={used?.quantity ?? 0}
                        onChange={(e) => {
                          const qty = Number(e.target.value) || 0;
                          setForm((f) => ({
                            ...f,
                            package_items:
                              qty > 0
                                ? [...f.package_items.filter((r) => r.item !== it.id), { item: it.id, quantity: qty }]
                                : f.package_items.filter((r) => r.item !== it.id),
                          }));
                        }}
                      />
                      <span className="w-16 text-right text-xs text-surface-400">
                        {formatCurrency((used?.quantity || 0) * it.price)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-surface-100 pt-3 dark:border-surface-700">
              <p className="text-sm text-surface-500">Сумма пакета (до скидки)</p>
              <p className="text-lg font-bold text-brand-600 dark:text-brand-400">
                {formatCurrency(packageTotal || 0)}
              </p>
            </div>
            <p className="mt-1 text-xs text-surface-400">
              Цена пакета пересчитывается автоматически из входящих позиций
            </p>
          </div>
        )}

        <Input
          label="Причина изменения (для истории цен)"
          value={form.reason}
          onChange={(e) => set("reason", e.target.value)}
          placeholder="Напр. «Повышение цен поставщика»"
        />

        {mutation.isError && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:bg-red-900/20 dark:text-red-400">
            Ошибка сохранения: {formatApiError(mutation.error)}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Сохранение..." : editing ? "Сохранить" : "Создать"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Price history panel ---------------- */

function PriceHistoryPanel({ itemId }: { itemId: string }) {
  const { data: item, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.CATALOG_ITEM, itemId],
    queryFn: () => catalogApi.items.get(itemId),
    select: (res) => res.data as CatalogItem,
  });

  if (isLoading) return <div className="p-6"><LoadingSpinner /></div>;

  const history = item?.price_history || [];
  return (
    <div className="p-6 pt-2">
      {history.length === 0 ? (
        <EmptyState title="Изменений цен не было" description="История появится после изменения цены или себестоимости" />
      ) : (
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-lg border border-surface-100 px-4 py-3 dark:border-surface-700">
              <div>
                <p className="text-sm font-medium text-surface-800 dark:text-surface-100">
                  {formatCurrency(Number(h.old_price ?? h.new_price))} → {formatCurrency(Number(h.new_price))}
                </p>
                <p className="text-xs text-surface-400">
                  {formatDate(h.created_at)} · {h.changed_by_name || "система"}{h.reason ? ` · ${h.reason}` : ""}
                </p>
              </div>
              {(h.old_cost != null || h.new_cost != null) && (
                <p className="text-xs text-surface-400">
                  Себестоимость: {formatCurrency(Number(h.old_cost ?? 0))} → {formatCurrency(Number(h.new_cost ?? 0))}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Restock form ---------------- */

function RestockForm({ item, submitting, onSubmit, onClose }: {
  item: CatalogItem | null;
  submitting: boolean;
  onSubmit: (data: { quantity: number; note: string }) => void;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(0);
  const [note, setNote] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ quantity: Number(quantity) || 0, note });
      }}
      className="space-y-4 p-6 pt-2"
    >
      {item && (
        <p className="rounded-lg bg-surface-50 px-3 py-2 text-sm text-surface-500 dark:bg-surface-800/60">
          Текущий остаток: <b className="text-surface-800 dark:text-surface-100">{item.stock} {item.unit}</b>
        </p>
      )}
      <Input
        label="Поступление (штук)"
        type="number"
        min={0}
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        required
        autoFocus
      />
      <Input label="Примечание" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Напр. «Новая партия от поставщика»" />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Отмена</Button>
        <Button type="submit" disabled={submitting || quantity <= 0}>
          {submitting ? "Сохранение..." : "Пополнить"}
        </Button>
      </div>
    </form>
  );
}

/* ---------------- Bulk form ---------------- */

function BulkForm({ categories, submitting, onSubmit, onClose }: {
  categories: { id: string; name: string }[];
  submitting: boolean;
  onSubmit: (data: { action: "change_status" | "change_category" | "adjust_price"; payload: Record<string, unknown> }) => void;
  onClose: () => void;
}) {
  const [action, setAction] = useState<"change_status" | "change_category" | "adjust_price">("change_status");
  const [status, setStatus] = useState("active");
  const [category, setCategory] = useState("");
  const [percent, setPercent] = useState(0);

  const payload = action === "change_status"
    ? { status }
    : action === "change_category"
      ? { category }
      : { percent: Number(percent) || 0 };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ action, payload });
      }}
      className="space-y-4 p-6 pt-2"
    >
      <Select
        label="Операция"
        value={action}
        onChange={(e) => setAction(e.target.value as typeof action)}
        options={[
          { value: "change_status", label: "Сменить статус" },
          { value: "change_category", label: "Сменить категорию" },
          { value: "adjust_price", label: "Изменить цены на %" },
        ]}
      />
      {action === "change_status" && (
        <Select
          label="Новый статус"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "active", label: "Активен" },
            { value: "inactive", label: "Неактивен" },
            { value: "archived", label: "В архиве" },
          ]}
        />
      )}
      {action === "change_category" && (
        <Select
          label="Новая категория"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={[{ value: "", label: "Выберите категорию" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          required
        />
      )}
      {action === "adjust_price" && (
        <Input
          label="Изменение цены, % (можно отрицательное)"
          type="number"
          step="0.01"
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          hint="Например: 10 — поднять на 10%, -5 — снизить на 5%"
        />
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Отмена</Button>
        <Button type="submit" disabled={submitting || (action === "change_category" && !category)}>
          {submitting ? "Выполняется..." : "Применить"}
        </Button>
      </div>
    </form>
  );
}
