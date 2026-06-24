"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/shared/utils/cn";

export function Tabs({
  value,
  onValueChange,
  tabs,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  tabs: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      className={className}
    >
      <TabsPrimitive.List className="flex border-b border-surface-200 dark:border-surface-700">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors",
              "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200",
              "radix-state-active:border-b-2 radix-state-active:border-brand-600 radix-state-active:text-brand-600 dark:radix-state-active:text-brand-400",
              "focus:outline-none"
            )}
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}
