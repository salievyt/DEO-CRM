"use client";

import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, TrendingDown, Wallet, CalendarDays } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { cabinetApi } from "@/shared/api/base";
import { formatDate, formatCurrency } from "@/shared/utils/formatters";

interface CabinetPayment {
  id: string;
  invoice: string;
  invoice_number: string;
  amount: number;
  method: string;
  paid_at: string;
  notes: string;
}

export function CabinetFinanceTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["cabinet-payments"],
    queryFn: () => cabinetApi.payments(),
    select: (res): CabinetPayment[] => res.data?.results || (res.data as CabinetPayment[]) || [],
  });

  if (isLoading) {
    return <div className="flex h-48 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  const payments = data || [];

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-50 text-success-600 dark:bg-green-900/20 dark:text-green-400">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-surface-500">Всего оплачено</p>
              <p className="text-2xl font-bold text-success-600 dark:text-green-400">
                {formatCurrency(totalPaid)}
              </p>
            </div>
          </div>
          <Badge variant="success">{payments.length} платежей</Badge>
        </div>
      </Card>

      {/* Payments list */}
      {payments.length === 0 ? (
        <EmptyState title="Нет платежей" description="История платежей пуста" />
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <Card key={payment.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-50 text-success-600 dark:bg-green-900/20 dark:text-green-400">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">
                      Счёт {payment.invoice_number}
                    </p>
                    <p className="text-xs text-surface-500">
                      Способ: {payment.method === "bank_transfer" ? "Банковский перевод"
                        : payment.method === "card" ? "Банковская карта"
                        : payment.method === "cash" ? "Наличные"
                        : payment.method}
                    </p>
                    {payment.notes && (
                      <p className="mt-1 text-xs text-surface-400">{payment.notes}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-success-600">
                    +{formatCurrency(payment.amount)}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-surface-400 mt-1">
                    <CalendarDays className="h-3 w-3" />
                    {formatDate(payment.paid_at)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
