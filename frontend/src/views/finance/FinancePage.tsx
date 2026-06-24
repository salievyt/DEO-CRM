"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Tabs } from "@/shared/ui/Tabs";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { financeApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { formatCurrency, formatDate, timeAgo, cn } from "@/shared/utils/formatters";
import type { Invoice, FinancialSummary, ProfitByProject } from "@/entities/invoice/types";

export function FinancePage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: [QUERY_KEYS.FINANCE_SUMMARY],
    queryFn: () => financeApi.summary(),
    select: (res) => res.data as FinancialSummary,
  });

  const { data: invoices } = useQuery({
    queryKey: [QUERY_KEYS.INVOICES],
    queryFn: () => financeApi.invoices.list(),
    select: (res) => res.data?.results as Invoice[],
  });

  const { data: expenses } = useQuery({
    queryKey: [QUERY_KEYS.EXPENSES],
    queryFn: () => financeApi.expenses.list(),
    select: (res) => res.data?.results as any[],
  });

  const [showProfitModal, setShowProfitModal] = useState(false);
  const { data: profitByProject } = useQuery({
    queryKey: [QUERY_KEYS.PROFIT_BY_PROJECT],
    queryFn: () => financeApi.profitByProject(),
    select: (res) => res.data as ProfitByProject[],
    enabled: activeTab === "profit",
  });

  const tabs = [
    { value: "overview", label: "Обзор" },
    { value: "invoices", label: "Счета" },
    { value: "expenses", label: "Расходы" },
    { value: "profit", label: "Прибыль по проектам" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Финансы"
        description="Управление финансами компании"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowExpenseModal(true)}>
              <Plus className="h-4 w-4" />
              Расход
            </Button>
            <Button onClick={() => setShowInvoiceModal(true)}>
              <Plus className="h-4 w-4" />
              Новый счет
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <div className="flex items-center gap-2 text-success-600">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">Доход</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
              {formatCurrency(summary.revenue)}
            </p>
            <p className="text-xs text-surface-500">за текущий месяц</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-danger-600">
              <TrendingDown className="h-5 w-5" />
              <span className="text-sm font-medium">Расходы</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
              {formatCurrency(summary.expenses)}
            </p>
            <p className="text-xs text-surface-500">за текущий месяц</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-brand-600">
              <Wallet className="h-5 w-5" />
              <span className="text-sm font-medium">Прибыль</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
              {formatCurrency(summary.profit)}
            </p>
            <p className="text-xs text-surface-500">чистая прибыль</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-warning-600">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Задолженность</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-surface-900 dark:text-white">
              {formatCurrency(summary.outstanding)}
            </p>
            <p className="text-xs text-surface-500">неоплаченные счета</p>
          </Card>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        tabs={tabs}
      />

      {/* Tab Content */}
      {activeTab === "invoices" && (
        <Card padding="none">
          {(!invoices || invoices.length === 0) ? (
            <div className="p-6">
              <EmptyState
                title="Нет счетов"
                description="Создайте первый счет"
                action={
                  <Button onClick={() => setShowInvoiceModal(true)}>
                    <Plus className="h-4 w-4" />
                    Новый счет
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-surface-200 dark:divide-surface-700">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {invoice.number}
                    </p>
                    <p className="text-sm text-surface-500">
                      {invoice.client_name}
                      {invoice.project_name && ` · ${invoice.project_name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={invoice.status} />
                    <span className="font-medium">
                      {formatCurrency(invoice.amount)}
                    </span>
                    <span className="text-sm text-surface-400">
                      {formatDate(invoice.issued_date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "expenses" && (
        <Card padding="none">
          {(!expenses || expenses.length === 0) ? (
            <div className="p-6">
              <EmptyState
                title="Нет расходов"
                description="Добавьте первый расход"
                action={
                  <Button variant="secondary" onClick={() => setShowExpenseModal(true)}>
                    <Plus className="h-4 w-4" />
                    Добавить расход
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-surface-200 dark:divide-surface-700">
              {expenses.map((expense: any) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {expense.description}
                    </p>
                    <p className="text-sm text-surface-500">
                      {expense.category_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-danger-600">
                      {formatCurrency(expense.amount)}
                    </span>
                    <span className="text-sm text-surface-400">
                      {formatDate(expense.expense_date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "profit" && (
        <Card padding="none">
          {!profitByProject || profitByProject.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Нет данных" description="Данные по прибыли проектов" />
            </div>
          ) : (
            <div className="divide-y divide-surface-200 dark:divide-surface-700">
              {profitByProject.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">{p.name}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-surface-500">Доход</p>
                      <p className="text-sm font-medium text-success-600">
                        {formatCurrency(p.revenue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-surface-500">Расходы</p>
                      <p className="text-sm font-medium text-danger-600">
                        {formatCurrency(p.expenses)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-surface-500">Прибыль</p>
                      <p className={cn("text-sm font-medium", p.profit >= 0 ? "text-success-600" : "text-danger-600")}>
                        {formatCurrency(p.profit)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Create Invoice Modal */}
      <Modal
        open={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title="Новый счет"
      >
        <InvoiceForm onCancel={() => setShowInvoiceModal(false)} />
      </Modal>

      {/* Create Expense Modal */}
      <Modal
        open={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title="Новый расход"
      >
        <ExpenseForm onCancel={() => setShowExpenseModal(false)} />
      </Modal>
    </div>
  );
}

function InvoiceForm({ onCancel }: { onCancel: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    client: "",
    project: "",
    amount: "",
    description: "",
    issued_date: "",
    due_date: "",
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => financeApi.invoices.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVOICES] });
      onCancel();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      amount: Number(form.amount),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="ID клиента"
        value={form.client}
        onChange={(e) => setForm({ ...form, client: e.target.value })}
        required
      />
      <Input
        label="ID проекта"
        value={form.project}
        onChange={(e) => setForm({ ...form, project: e.target.value })}
      />
      <Input
        label="Сумма"
        type="number"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Дата выставления"
          type="date"
          value={form.issued_date}
          onChange={(e) => setForm({ ...form, issued_date: e.target.value })}
          required
        />
        <Input
          label="Срок оплаты"
          type="date"
          value={form.due_date}
          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-200">
          Описание
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="input mt-1"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          Создать счет
        </Button>
      </div>
    </form>
  );
}

function ExpenseForm({ onCancel }: { onCancel: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    category: "",
    amount: "",
    description: "",
    expense_date: "",
    project: "",
  });

  const { data: categories } = useQuery({
    queryKey: [QUERY_KEYS.EXPENSE_CATEGORIES],
    queryFn: () => financeApi.expenseCategories.list(),
    select: (res) => res.data?.results || res.data as any[],
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => financeApi.expenses.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXPENSES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FINANCE_SUMMARY] });
      onCancel();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      amount: Number(form.amount),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <select
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
        className="input"
        required
      >
        <option value="">Выберите категорию</option>
        {(categories || []).map((cat: any) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
      <Input
        label="Сумма"
        type="number"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        required
      />
      <Input
        label="Описание"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        required
      />
      <Input
        label="Дата"
        type="date"
        value={form.expense_date}
        onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
        required
      />
      <Input
        label="ID проекта (опционально)"
        value={form.project}
        onChange={(e) => setForm({ ...form, project: e.target.value })}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          Добавить расход
        </Button>
      </div>
    </form>
  );
}
