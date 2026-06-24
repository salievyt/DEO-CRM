import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

export function formatDate(date: string | Date, fmt = "dd.MM.yyyy") {
  return format(new Date(date), fmt, { locale: ru });
}

export function formatDateTime(date: string | Date, fmt = "dd.MM.yyyy HH:mm") {
  return format(new Date(date), fmt, { locale: ru });
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: ru,
  });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function getInitials(firstName?: string, lastName?: string) {
  if (!firstName && !lastName) return "??";
  return `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase();
}

export function truncate(text: string, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

export function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
    "#f97316", "#eab308", "#22c55e", "#14b8a6",
    "#06b6d4", "#3b82f6",
  ];
  return colors[Math.abs(hash) % colors.length];
}

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}
