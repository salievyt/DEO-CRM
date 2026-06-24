import { cn } from "@/shared/utils/cn";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
  style?: React.CSSProperties;
}

const variants: Record<BadgeVariant, string> = {
  default:
    "bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-300",
  success:
    "bg-success-50 text-success-600 dark:bg-green-900/20 dark:text-green-400",
  warning:
    "bg-warning-50 text-warning-600 dark:bg-yellow-900/20 dark:text-yellow-400",
  danger:
    "bg-danger-50 text-danger-600 dark:bg-red-900/20 dark:text-red-400",
  info: "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400",
};

export function Badge({
  children,
  variant = "default",
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "default" && "bg-surface-400",
            variant === "success" && "bg-success-500",
            variant === "warning" && "bg-warning-500",
            variant === "danger" && "bg-danger-500",
            variant === "info" && "bg-brand-500"
          )}
        />
      )}
      {children}
    </span>
  );
}
