"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  className,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative w-full animate-slide-up rounded-xl border border-surface-200 bg-white p-6 shadow-xl dark:border-surface-700 dark:bg-surface-800",
          sizes[size],
          "mx-4 max-h-[85vh] overflow-y-auto",
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="mb-4">
            <div className="flex items-center justify-between">
              {title && (
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                  {title}
                </h2>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {description && (
              <p className="mt-1 text-sm text-surface-500">{description}</p>
            )}
          </div>
        )}

        {/* Close button if no header */}
        {!title && !description && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-700"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
