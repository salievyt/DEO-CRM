import {
  BarChart3,
  CheckSquare,
  GraduationCap,
  Handshake,
  MessageSquare,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { learningApi } from "@/shared/api/base";
import type { LearningCategory } from "@/entities/learning/types";

export interface CategoryMeta {
  label: string;
  icon: LucideIcon;
  /** Tinted chip for the icon square on cards. */
  chip: string;
  /** Accent color for the category badge. */
  badge: string;
}

export const CATEGORY_META: Record<LearningCategory, CategoryMeta> = {
  basics: {
    label: "Основы",
    icon: GraduationCap,
    chip: "bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300",
    badge: "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300",
  },
  sales: {
    label: "Продажи",
    icon: Handshake,
    chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  },
  channels: {
    label: "Каналы связи",
    icon: MessageSquare,
    chip: "bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-300",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300",
  },
  automation: {
    label: "Автоматизация",
    icon: Sparkles,
    chip: "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300",
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300",
  },
  analytics: {
    label: "Аналитика",
    icon: BarChart3,
    chip: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  },
  team: {
    label: "Команда",
    icon: Users,
    chip: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300",
  },
  tasks: {
    label: "Задачи и напоминания",
    icon: CheckSquare,
    chip: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300",
    badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300",
  },
};

export const READ_STORAGE_KEY = "learning:read";

/**
 * One-time migration of reading progress saved under the old localStorage key
 * into the backend. Idempotent and best-effort: the key is cleared once every
 * slug was synced or is confirmed gone (404 for a deleted/unpublished article).
 * Network failures keep the key so the migration retries on a later visit.
 */
export function migrateLegacyReads(): void {
  if (typeof window === "undefined") return;
  let legacy: string[] = [];
  try {
    legacy = JSON.parse(localStorage.getItem(READ_STORAGE_KEY) || "[]");
  } catch {
    legacy = [];
  }
  if (!legacy.length) return;
  Promise.allSettled(legacy.map((slug) => learningApi.read.mark(slug))).then(
    (results) => {
      const blocked = results.some(
        (r) =>
          r.status === "rejected" &&
          (r.reason as { response?: { status?: number } })?.response?.status !== 404
      );
      if (!blocked) {
        try {
          localStorage.removeItem(READ_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
    }
  );
}
