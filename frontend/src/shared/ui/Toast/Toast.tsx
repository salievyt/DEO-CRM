"use client";

import { create } from "zustand";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, toast.duration || 4000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export function toast(options: Omit<Toast, "id">) {
  useToastStore.getState().addToast(options);
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: "border-success-500 bg-success-50 dark:bg-green-900/20",
  error: "border-danger-500 bg-danger-50 dark:bg-red-900/20",
  warning: "border-warning-500 bg-warning-50 dark:bg-yellow-900/20",
  info: "border-brand-500 bg-brand-50 dark:bg-brand-900/20",
};

const iconStyles = {
  success: "text-success-600",
  error: "text-danger-600",
  warning: "text-warning-600",
  info: "text-brand-600",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 min-w-[320px] max-w-[420px]",
              styles[t.type]
            )}
          >
            <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", iconStyles[t.type])} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 dark:text-white">
                {t.title}
              </p>
              {t.message && (
                <p className="mt-0.5 text-xs text-surface-600 dark:text-surface-300">
                  {t.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 text-surface-400 hover:text-surface-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
