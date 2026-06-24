import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

/**
 * Merge Tailwind classes with conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date in Russian locale
 */
export function formatDate(date: string | Date, fmt = "dd.MM.yyyy") {
  return format(new Date(date), fmt, { locale: ru });
}

/**
 * Relative time (e.g., "2 часа назад")
 */
export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: ru,
  });
}

/**
 * Format currency in RUB
 */
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

/**
 * Get initials from first and last name
 */
export function getInitials(firstName?: string, lastName?: string) {
  if (!firstName && !lastName) return "??";
  return `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase();
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

/**
 * Generate a random color from a string key
 */
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
