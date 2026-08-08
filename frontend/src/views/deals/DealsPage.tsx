"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Handshake,
  ArrowRightLeft,
  CreditCard,
  CheckCircle2,
  XCircle,
  Ban,
  Trash2,
  DollarSign,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { SearchInput } from "@/shared/ui/SearchInput";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { catalogApi, dealsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatCurrency, formatDate, cn } from "@/shared/utils/formatters";
import type {
  AvailableLead,
  Deal,
  DealItemWritePayload,
  DealStatus,
} from "@/entities/deals/types";
import type { CatalogItem } from "@/entities/catalog/types";

const STATUS_META: Record<DealStatus, { label: string; className: string; dot: string }> = {
  draft: { label: "Черновик", className: "bg-surface-200 text-surface-600", dot: "bg-surface-400" },
  open: { label: "В работе", className: "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300", dot: "bg-brand-500" },
  won: { label: "Выиграна", className: "bg-success-50 text-success-700 dark:bg-green-900/30 dark:text-green-300", dot: "bg-success-500" },
  lost: { label: "Проиграна", className: "bg-danger-50 text-danger-700 dark:bg-red-900/30 dark:text-red-300", dot: "bg-danger-500" },
  cancelled: { label: "Отменена", className: "bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-300", dot: "bg-surface-500" },
};

export function DealsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [convertLead, setConvertLead] = useState<AvailableLead | null>(null);
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [deleteDeal, setDeleteDeal] = useState<Deal | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const params = useMemo(() => {
    const p: Record<string, unknown> = { page, page_size: 20 };
    if (debouncedSearch) p.search = debouncedSearch;
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [page, debouncedSearch, statusFilter]);

  const { data: listData, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.DEALS, params],
    queryFn: () => dealsApi.list(params),
    select: (res) => res.data as { count: number; results: Deal[] },
  });

  const deals = listData?.results || [];
  const pageCount = listData ? Math.max(1, Math.ceil(listData.count / 20)) : 1;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DEALS] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DEAL] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DEAL_LEADS_AVAILABLE] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      dealsApi.changeStatus(id, status),
    onSuccess: () => {
      invalidate();
      setNotice("Статус сделки обновлён");
    },
    onError: (err) => {
      const data = (err as { response?: { data?: { detail?: unknown; shortages?: { name: string; error?: string; available?: number }[] } } }).response?.data;
      const shortages = data?.shortages;
      if (shortages?.length) {
        setErrorNotice(
          `Недостаточно товара на складе: ${shortages.map((s) => `${s.name} (${s.error ?? "нет на складе"})`).join(", ")}`
        );
      } else {
        setErrorNotice(extractError(err) || "Не удалось изменить статус");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dealsApi.delete(id),
    onSuccess: () => {
      invalidate();
      setDeleteDeal(null);
      setNotice("Сделка удалена");
    },
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Сделки"
        description="Продажи, конвертированные из лидов, с позициями и итогами"
        actions={
          <Button onClick={() => setShowLeadPicker(true)}>
            <Handshake className="h-4 w-4" /> Создать из лида
          </Button>
        }
      />

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-800 dark:bg-success-900/20 dark:text-success-300">
          <span>{notice}</span>
          <button className="ml-auto text-xs underline" onClick={() => setNotice(null)}>ок</button>
        </div>
      )}
      {errorNotice && (
        <div className="flex items-center gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <span>{errorNotice}</span>
          <button className="ml-auto text-xs underline" onClick={() => setErrorNotice(null)}>ок</button>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <SearchInput value={search} onChange={handleSearch} placeholder="Поиск по номеру, названию, лиду..." />
        <Select
          className="lg:w-44"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          options={[
            { value: "", label: "Все статусы" },
            { value: "open", label: "В работе" },
            { value: "won", label: "Выиграны" },
            { value: "lost", label: "Проиграны" },
            { value: "cancelled", label: "Отменены" },
            { value: "draft", label: "Черновики" },
          ]}
        />
      </div>

      <Card className="p-0">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>
        ) : deals.length === 0 ? (
          <EmptyState
            title="Сделок пока нет"
            description="Конвертируйте лид в сделку с товарами и услугами"
            action={<Button onClick={() => setShowLeadPicker(true)}><Handshake className="h-4 w-4" /> Создать из лида</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-100 dark:divide-surface-700">
              <thead className="bg-surface-50 dark:bg-surface-800/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Сделка</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Клиент / Лид</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-surface-500">Позиций</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Итого</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Прибыль</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Оплачено</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-surface-500">Статус</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Создана</th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                {deals.map((deal) => {
                  const meta = STATUS_META[deal.status];
                  return (
                    <tr
                      key={deal.id}
                      className="group cursor-pointer transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50"
                      onClick={() => setDetailDeal(deal)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-surface-900 dark:text-white">{deal.title}</p>
                        <p className="text-xs text-surface-400">{deal.number}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <p className="text-surface-700 dark:text-surface-200">{deal.client_name || deal.lead_contact}</p>
                        <p className="text-xs text-surface-400">Лид: {deal.lead_contact}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-surface-500">{deal.item_count}</td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-surface-900 dark:text-white">{formatCurrency(deal.total)}</p>
                        {deal.remaining > 0 && deal.status === "won" && (
                          <p className="text-xs text-warning-600">долг {formatCurrency(deal.remaining)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className={cn("font-medium", deal.profit >= 0 ? "text-success-600" : "text-danger-600")}>
                          {formatCurrency(deal.profit)}
                        </p>
                        <p className="text-xs text-surface-400">маржа {deal.margin}%</p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-surface-500">
                        {deal.paid_amount > 0 ? formatCurrency(deal.paid_amount) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", meta.className)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-surface-400">{formatDate(deal.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteDeal(deal); }}
                          className="rounded-md p-1.5 text-surface-300 opacity-0 transition-all hover:bg-danger-50 hover:text-danger-600 group-hover:opacity-100"
                          aria-label="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-surface-500">
          <span>Сделок: {listData?.count ?? 0} · стр. {page} из {pageCount}</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Назад</Button>
            <Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Вперёд</Button>
          </div>
        </div>
      )}

      {/* Lead picker */}
      <LeadPickerModal
        open={showLeadPicker}
        onClose={() => setShowLeadPicker(false)}
        onPick={(lead) => {
          setShowLeadPicker(false);
          setEditingDeal(null);
          setConvertLead(lead);
          setShowEditForm(true);
        }}
      />

      {/* Deal form (convert) */}
      <DealFormModal
        open={showEditForm && !editingDeal}
        deal={null}
        leadId={convertLead?.id}
        leadName={convertLead?.contact_name}
        onClose={() => setShowEditForm(false)}
        onSaved={() => {
          setShowEditForm(false);
          setConvertLead(null);
          invalidate();
          setNotice("Сделка создана из лида");
        }}
      />

      {/* Deal detail */}
      <DealDetailModal
        deal={detailDeal}
        onClose={() => setDetailDeal(null)}
        onEdit={(d) => {
          setDetailDeal(null);
          setEditingDeal(d);
          setShowEditForm(true);
        }}
        onStatus={(status) => {
          if (detailDeal) {
            statusMutation.mutate({ id: detailDeal.id, status });
          }
        }}
        statusPending={statusMutation.isPending}
      />

      {/* Deal edit form */}
      <DealFormModal
        open={showEditForm && !!editingDeal}
        deal={editingDeal}
        onClose={() => { setShowEditForm(false); setEditingDeal(null); }}
        onSaved={() => {
          setShowEditForm(false);
          setEditingDeal(null);
          invalidate();
          setNotice("Сделка обновлена");
        }}
      />

      <ConfirmDialog
        open={!!deleteDeal}
        title="Удалить сделку?"
        description={deleteDeal ? `Сделка «${deleteDeal.number}» будет удалена. История позиций и платежей будет потеряна.` : ""}
        confirmLabel="Удалить"
        onConfirm={() => deleteDeal && deleteMutation.mutate(deleteDeal.id)}
        onCancel={() => setDeleteDeal(null)}
      />
    </div>
  );
}

function extractError(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data as
    | Record<string, unknown>
    | string
    | undefined;
  if (!data) return "";
  if (typeof data === "string") return data;
  const detail = data.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const nested = detail as Record<string, unknown>;
    const nonField = nested.non_field_errors;
    if (Array.isArray(nonField)) return nonField.map(String).join(", ");
    return Object.values(nested).flat().map(String).join(", ");
  }
  return "";
}

/* ---------------- Lead picker ---------------- */

function LeadPickerModal({ open, onClose, onPick }: {
  open: boolean;
  onClose: () => void;
  onPick: (lead: AvailableLead) => void;
}) {
  const { data: leads, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.DEAL_LEADS_AVAILABLE],
    queryFn: () => dealsApi.leadsAvailable(),
    select: (res) => res.data as AvailableLead[],
    enabled: open,
  });
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<AvailableLead | null>(null);

  const filtered = (leads || []).filter(
    (l) =>
      !search ||
      l.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      l.company_name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search)
  );

  return (
    <Modal open={open} onClose={onClose} title="Создать сделку из лида" size="lg">
      <div className="p-6 pt-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Поиск по имени, компании, телефону..." />
        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : filtered.length === 0 ? (
            <EmptyState title="Нет лидов для конвертации" description="Все лиды уже конвертированы, либо воронка пуста" />
          ) : (
            filtered.map((lead) => (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                  selectedLead?.id === lead.id
                    ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500 dark:bg-brand-900/20"
                    : "border-surface-200 hover:border-brand-300 hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800/60"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-surface-900 dark:text-white">{lead.contact_name}</p>
                  <p className="truncate text-xs text-surface-500">
                    {lead.company_name || "—"} · {lead.phone} · {lead.stage_name}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  {lead.budget && (
                    <span className="text-sm font-medium text-success-600">{formatCurrency(lead.budget)}</span>
                  )}
                  <ArrowRightLeft className="h-4 w-4 text-surface-300" />
                </div>
              </button>
            ))
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button disabled={!selectedLead} onClick={() => selectedLead && onPick(selectedLead)}>
            <Plus className="h-4 w-4" /> Добавить позиции
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Deal form (create/edit) ---------------- */

function DealFormModal({ open, deal, leadId, leadName, onClose, onSaved }: {
  open: boolean;
  deal: Deal | null;
  leadId?: string;
  leadName?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items, setItems] = useState<DealItemWritePayload[]>([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [description, setDescription] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: catalogData } = useQuery({
    queryKey: [QUERY_KEYS.CATALOG, "deal-picker", itemSearch],
    queryFn: () => catalogApi.items.list({
      page_size: 50, search: itemSearch || undefined, status: "active",
    }),
    select: (res) => (res.data as { results: CatalogItem[] }).results.filter(
      (i) => i.type === "product" || i.type === "service" || i.type === "package"
    ),
    enabled: open,
  });

  // Reset on open
  const [lastKey, setLastKey] = useState<string | null>(null);
  const modalKey = deal ? deal.id : "new";
  if (open && lastKey !== modalKey) {
    setLastKey(modalKey);
    setItems(
      (deal?.items || []).map((it) => ({
        item: it.item || "",
        quantity: Number(it.quantity),
        discount: Number(it.discount),
        tax: Number(it.tax),
      }))
    );
    setDiscount(Number(deal?.discount || 0));
    setTax(Number(deal?.tax || 0));
    setDescription(deal?.description || "");
    setError(null);
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        items,
        discount,
        tax,
        description,
        ...(deal ? {} : { lead: leadId }),
      };
      return deal ? dealsApi.update(deal.id, payload) : dealsApi.convert(payload);
    },
    onSuccess: onSaved,
    onError: (err) => {
      setError(extractError(err) || "Не удалось сохранить сделку");
    },
  });

  const lines = useMemo(() => {
    const pool = catalogData || [];
    return items.map((row) => {
      const it = pool.find((i) => i.id === row.item);
      const subtotal = row.quantity * (it?.price || 0);
      const rowDiscount = row.discount || 0;
      const rowTax = row.tax || 0;
      return {
        ...row,
        name: it?.name || "Позиция",
        unit_price: it?.price || 0,
        line_total: Math.max(subtotal - rowDiscount + rowTax, 0),
      };
    });
  }, [items, catalogData]);

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const total = Math.max(subtotal - discount + tax, 0);

  const setItem = (index: number, patch: Partial<DealItemWritePayload>) =>
    setItems((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError("Добавьте хотя бы одну позицию");
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={deal ? `Редактировать: ${deal.number}` : "Новая сделка из лида"}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-6 pt-2">
        {!deal && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
            Сделка будет создана из лида <b>{leadName || "..."}</b>; лид останется в воронке.
          </p>
        )}

        {/* Line items */}
        <div className="rounded-xl border border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between border-b border-surface-100 px-4 py-3 dark:border-surface-700">
            <p className="text-sm font-semibold text-surface-700 dark:text-surface-200">Позиции сделки</p>
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
              <input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Найти в каталоге..."
                className="input py-1.5 pl-8 text-sm"
              />
            </div>
          </div>
          <div className="divide-y divide-surface-100 dark:divide-surface-700">
            {lines.map((line, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-100">{line.name}</p>
                  <p className="text-xs text-surface-400">{formatCurrency(line.unit_price)} / ед.</p>
                </div>
                <Input
                  className="w-20"
                  type="number"
                  min={0}
                  step="0.01"
                  value={line.quantity}
                  onChange={(e) => setItem(idx, { quantity: Number(e.target.value) || 0 })}
                  aria-label="Количество"
                />
                <Input
                  className="w-24"
                  type="number"
                  min={0}
                  step="0.01"
                  value={line.discount}
                  onChange={(e) => setItem(idx, { discount: Number(e.target.value) || 0 })}
                  placeholder="Скидка ₽"
                />
                <Input
                  className="w-24"
                  type="number"
                  min={0}
                  step="0.01"
                  value={line.tax}
                  onChange={(e) => setItem(idx, { tax: Number(e.target.value) || 0 })}
                  placeholder="Налог ₽"
                />
                <span className="w-24 text-right text-sm font-semibold text-surface-900 dark:text-white">
                  {formatCurrency(line.line_total)}
                </span>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  className="rounded-md p-1.5 text-surface-300 transition-colors hover:bg-danger-50 hover:text-danger-600"
                  aria-label="Удалить позицию"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-surface-100 px-4 py-3 dark:border-surface-700">
            <Select
              className="w-full sm:w-72"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                const existing = items.find((i) => i.item === id);
                if (existing) return;
                setItems((prev) => [...prev, { item: id, quantity: 1, discount: 0, tax: 0 }]);
                e.target.value = "";
              }}
              options={[
                { value: "", label: "+ Добавить позицию из каталога..." },
                ...(catalogData || []).map((i) => ({
                  value: i.id,
                  label: `${i.name} — ${formatCurrency(i.price)}`,
                })),
              ]}
            />
          </div>
        </div>

        {/* Order-level discount/tax */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Скидка на сделку (₽)"
            type="number"
            min={0}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value) || 0)}
          />
          <Input
            label="Налог на сделку (₽)"
            type="number"
            min={0}
            step="0.01"
            value={tax}
            onChange={(e) => setTax(Number(e.target.value) || 0)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input mt-1"
            placeholder="Комментарий к сделке"
          />
        </div>

        {/* Live totals */}
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl bg-surface-50 px-4 py-3 dark:bg-surface-800/60">
          <div className="space-y-1 text-sm text-surface-500">
            <p>Подытог: <span className="font-medium text-surface-800 dark:text-surface-100">{formatCurrency(subtotal)}</span></p>
            <p>Скидка: <span className="font-medium text-danger-600">−{formatCurrency(discount)}</span></p>
            <p>Налог: <span className="font-medium text-surface-800 dark:text-surface-100">+{formatCurrency(tax)}</span></p>
          </div>
          <div className="text-right">
            <p className="text-xs text-surface-400">Итого</p>
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{formatCurrency(total)}</p>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Сохранение..." : deal ? "Сохранить" : "Создать сделку"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Deal detail ---------------- */

function DealDetailModal({ deal, onClose, onEdit, onStatus, statusPending }: {
  deal: Deal | null;
  onClose: () => void;
  onEdit: (deal: Deal) => void;
  onStatus: (status: DealStatus) => void;
  statusPending: boolean;
}) {
  const { data: detail } = useQuery({
    queryKey: [QUERY_KEYS.DEAL, deal?.id],
    queryFn: () => dealsApi.get(deal!.id),
    select: (res) => res.data as Deal,
    enabled: !!deal,
  });
  const queryClient = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("card");

  const d = detail || deal;

  const addPayment = useMutation({
    mutationFn: (amount: number) =>
      dealsApi.addPayment(d!.id, { amount, method: paymentMethod }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DEAL, d!.id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DEALS] });
      setPaymentOpen(false);
      setPaymentAmount(0);
    },
  });

  if (!d) return null;
  const meta = STATUS_META[d.status];

  return (
    <Modal open={!!deal} onClose={onClose} title={`Сделка ${d.number}`} size="xl">
      <div className="space-y-5 p-6 pt-2">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-surface-900 dark:text-white">{d.title}</h3>
            <p className="text-sm text-surface-500">
              Лид: {d.lead_contact} · Клиент: {d.client_name || "—"} · Ответственный: {d.assigned_to_name || "—"}
            </p>
            <p className="text-xs text-surface-400">Создана {formatDate(d.created_at)}</p>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium", meta.className)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />{meta.label}
          </span>
        </div>

        {d.description && (
          <p className="rounded-lg bg-surface-50 px-3 py-2 text-sm text-surface-600 dark:bg-surface-800/60 dark:text-surface-300">
            {d.description}
          </p>
        )}

        {/* Items */}
        <div>
          <p className="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-200">
            Позиции ({d.items?.length || 0})
          </p>
          <div className="overflow-x-auto rounded-lg border border-surface-200 dark:border-surface-700">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-50 text-left text-xs uppercase tracking-wide text-surface-500 dark:bg-surface-800/60">
                <tr>
                  <th className="px-3 py-2">Позиция</th>
                  <th className="px-3 py-2 text-right">Кол-во</th>
                  <th className="px-3 py-2 text-right">Цена</th>
                  <th className="px-3 py-2 text-right">Скидка</th>
                  <th className="px-3 py-2 text-right">Налог</th>
                  <th className="px-3 py-2 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                {(d.items || []).map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-surface-800 dark:text-surface-100">{it.name}</p>
                      {it.item_sku && <p className="text-xs text-surface-400">{it.item_sku}</p>}
                    </td>
                    <td className="px-3 py-2 text-right text-surface-600 dark:text-surface-300">{it.quantity}</td>
                    <td className="px-3 py-2 text-right text-surface-600 dark:text-surface-300">{formatCurrency(it.unit_price)}</td>
                    <td className="px-3 py-2 text-right text-danger-600">{it.discount ? `−${formatCurrency(it.discount)}` : "—"}</td>
                    <td className="px-3 py-2 text-right text-surface-600 dark:text-surface-300">{it.tax ? `+${formatCurrency(it.tax)}` : "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold text-surface-900 dark:text-white">{formatCurrency(it.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="grid gap-4 sm:grid-cols-4">
          <TotalsCard label="Подытог" value={formatCurrency(d.subtotal)} />
          <TotalsCard label="Скидка" value={`−${formatCurrency(d.discount)}`} tone="danger" />
          <TotalsCard label="Налог" value={`+${formatCurrency(d.tax)}`} />
          <TotalsCard label="Итого" value={formatCurrency(d.total)} strong />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TotalsCard label="Себестоимость" value={formatCurrency(d.total_cost)} muted />
          <TotalsCard
            label="Прибыль"
            value={formatCurrency(d.profit)}
            tone={d.profit >= 0 ? "success" : "danger"}
          />
          <TotalsCard label="Маржа" value={`${d.margin}%`} muted />
        </div>

        {/* Payments */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-surface-700 dark:text-surface-200">
              Платежи · оплачено {formatCurrency(d.paid_amount)} из {formatCurrency(d.total)}
            </p>
            <Button size="sm" variant="secondary" onClick={() => setPaymentOpen(!paymentOpen)}>
              <CreditCard className="h-4 w-4" /> Принять платёж
            </Button>
          </div>
          {paymentOpen && (
            <div className="mb-2 flex flex-wrap items-end gap-2 rounded-lg border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-800 dark:bg-brand-900/10">
              <Input
                className="w-32"
                label="Сумма"
                type="number"
                min={0}
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
              />
              <Select
                className="w-40"
                label="Способ"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={[
                  { value: "bank_transfer", label: "Перевод" },
                  { value: "cash", label: "Наличные" },
                  { value: "card", label: "Карта" },
                  { value: "crypto", label: "Криптовалюта" },
                ]}
              />
              <Button size="sm" disabled={paymentAmount <= 0 || addPayment.isPending} onClick={() => addPayment.mutate(paymentAmount)}>
                {addPayment.isPending ? "..." : "Записать"}
              </Button>
            </div>
          )}
          {(d.payments || []).length > 0 ? (
            <div className="space-y-1.5">
              {(d.payments || []).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-surface-100 px-3 py-2 text-sm dark:border-surface-700">
                  <span className="text-surface-600 dark:text-surface-300">
                    {formatCurrency(p.amount)} · {p.method} {p.transaction_id && `· ${p.transaction_id}`}
                  </span>
                  <span className="text-xs text-surface-400">{formatDate(p.paid_at)} · {p.created_by_name || "—"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-surface-400">Платежей пока нет</p>
          )}
        </div>

        {/* Documents */}
        {(d.documents || []).length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-200">Документы</p>
            <div className="flex flex-wrap gap-2">
              {(d.documents || []).map((doc) => (
                <span key={doc.id} className="inline-flex items-center gap-1.5 rounded-lg bg-surface-100 px-3 py-1.5 text-xs text-surface-600 dark:bg-surface-700 dark:text-surface-300">
                  <DollarSign className="h-3.5 w-3.5" /> {doc.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-100 pt-4 dark:border-surface-700">
          <div className="flex flex-wrap gap-2">
            {d.status !== "won" && (
              <Button size="sm" disabled={statusPending} onClick={() => onStatus("won")}>
                <CheckCircle2 className="h-4 w-4" /> Выиграна
              </Button>
            )}
            {d.status !== "lost" && (
              <Button size="sm" variant="secondary" disabled={statusPending} onClick={() => onStatus("lost")}>
                <XCircle className="h-4 w-4" /> Проиграна
              </Button>
            )}
            {d.status !== "cancelled" && (
              <Button size="sm" variant="ghost" disabled={statusPending} onClick={() => onStatus("cancelled")}>
                <Ban className="h-4 w-4" /> Отменить
              </Button>
            )}
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={!detail}
            title={detail ? undefined : "Позиции ещё загружаются…"}
            onClick={() => detail && onEdit(detail)}
          >
            Редактировать
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TotalsCard({ label, value, tone, strong, muted }: {
  label: string;
  value: string;
  tone?: "danger" | "success";
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-surface-200 px-4 py-3 dark:border-surface-700">
      <p className="text-xs text-surface-400">{label}</p>
      <p
        className={cn(
          "mt-1 font-semibold",
          strong && "text-lg text-brand-600 dark:text-brand-400",
          tone === "danger" && "text-danger-600",
          tone === "success" && "text-success-600",
          muted && "text-surface-500",
          !strong && !tone && !muted && "text-surface-900 dark:text-white"
        )}
      >
        {value}
      </p>
    </div>
  );
}
