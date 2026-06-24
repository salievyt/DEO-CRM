"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: "left" | "right";
  size?: "sm" | "md" | "lg" | "full";
}

export function Drawer({ open, onClose, title, children, side = "right", size = "md" }: DrawerProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

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

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    full: "max-w-full w-full",
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed inset-y-0 z-50 flex flex-col bg-white shadow-xl transition-transform duration-300 dark:bg-surface-800",
          sizeClasses[size],
          side === "right" ? "right-0" : "left-0",
          side === "right"
            ? open ? "translate-x-0" : "translate-x-full"
            : open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-surface-200 px-6 py-4 dark:border-surface-700">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  );
}
