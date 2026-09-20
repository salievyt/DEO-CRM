"use client";

import type { LucideIcon } from "lucide-react";

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  labelRight?: React.ReactNode;
  icon?: LucideIcon;
  rightSlot?: React.ReactNode;
}

export function AuthField({
  label,
  labelRight,
  icon: Icon,
  rightSlot,
  id,
  className,
  ...props
}: AuthFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-surface-700 dark:text-surface-200"
        >
          {label}
        </label>
        {labelRight}
      </div>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        )}
        <input
          id={id}
          className={`input ${Icon ? "pl-10" : ""} ${rightSlot ? "pr-10" : ""} ${
            className ?? ""
          }`}
          {...props}
        />
        {rightSlot && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
}