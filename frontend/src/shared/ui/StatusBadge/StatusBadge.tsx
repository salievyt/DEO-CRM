import { Badge } from "@/shared/ui/Badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusVariantMap: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  // Task statuses
  "новая": "info",
  "в работе": "warning",
  "на проверке": "warning",
  "выполнена": "success",
  "отклонена": "danger",
  "отменена": "danger",
  // Project statuses
  "планирование": "info",
  "дизайн": "info",
  "разработка": "warning",
  "тестирование": "warning",
  "доработка": "warning",
  "запуск": "success",
  "завершен": "success",
  "приостановлен": "danger",
  // Lead statuses
  "новый лид": "info",
  "первый контакт": "info",
  "переговоры": "warning",
  "подготовка предложения": "warning",
  "подписание договора": "warning",
  "проект в работе": "warning",
  "проект завершен": "success",
  "сделка потеряна": "danger",
  // Invoice statuses
  "черновик": "default",
  "отправлен": "info",
  "оплачен": "success",
  "просрочен": "danger",
  "отменен": "danger",
  // Document statuses
  "готов": "success",
  "архив": "default",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = statusVariantMap[status.toLowerCase()] || "default";
  return (
    <Badge variant={variant} dot className={className}>
      {status}
    </Badge>
  );
}
