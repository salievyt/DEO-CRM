"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, CalendarDays, DollarSign } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { cabinetApi } from "@/shared/api/base";
import { formatDate, formatCurrency } from "@/shared/utils/formatters";

interface CabinetInvoice {
  id: string;
  number: string;
  amount: number;
  paid_amount: number;
  status: string;
  description: string;
  issued_date: string;
  due_date: string;
  paid_at: string | null;
}

export function CabinetInvoicesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["cabinet-invoices"],
    queryFn: () => cabinetApi.invoices(),
    select: (res): CabinetInvoice[] => res.data?.results || (res.data as CabinetInvoice[]) || [],
  });

  if (isLoading) {
    return <div className="flex h-48 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  const invoices = data || [];

  if (invoices.length === 0) {
    return <EmptyState title="Нет счетов" description="У вас пока нет выставленных счетов" />;
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => (
        <Card key={invoice.id} className="transition-all hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-surface-900 dark:text-white">
                  {invoice.number}
                </p>
                {invoice.description && (
                  <p className="text-sm text-surface-500">{invoice.description}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-surface-900 dark:text-white">
                {formatCurrency(invoice.amount)}
              </p>
              <Badge
                variant={
                  invoice.status === "paid"
                    ? "success"
                    : invoice.status === "overdue"
                    ? "danger"
                    : "warning"
                }
              >
                {invoice.status === "paid"
                  ? "Оплачен"
                  : invoice.status === "overdue"
                  ? "Просрочен"
                  : "Ожидает оплаты"}
              </Badge>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-surface-400">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Выставлен: {formatDate(invoice.issued_date)}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Оплатить до: {formatDate(invoice.due_date)}
            </span>
            {invoice.paid_at && (
              <span className="flex items-center gap-1 text-success-600">
                <DollarSign className="h-3.5 w-3.5" />
                Оплачен: {formatDate(invoice.paid_at)}
              </span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
