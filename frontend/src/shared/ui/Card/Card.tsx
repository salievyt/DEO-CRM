"use client";

import { cn } from "@/shared/utils/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddings = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  className,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-surface-200 bg-white shadow-sm dark:border-surface-700 dark:bg-surface-800",
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
