"use client";

import { useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import styles from "./Modal.module.css";

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
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
  full: styles.sizeFull,
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
  const panelRef = useRef<HTMLDivElement>(null);

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
    <div className={styles.overlay}>
      {/* Backdrop with blur */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          styles.panel,
          styles.sizeSmMobile,
          sizes[size] || styles.sizeMd,
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className={styles.header}>
            <div className={styles.titleRow}>
              {title && <h2 className={styles.title}>{title}</h2>}
              <button
                onClick={onClose}
                className={styles.closeBtn}
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {description && (
              <p className={styles.description}>{description}</p>
            )}
          </div>
        )}

        {/* Close button if no header */}
        {!title && !description && (
          <button
            onClick={onClose}
            className={cn(styles.closeBtn, "absolute right-4 top-4")}
            aria-label="Закрыть"
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
