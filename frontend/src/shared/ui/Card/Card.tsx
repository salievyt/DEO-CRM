"use client";

import { cn } from "@/shared/utils/cn";
import styles from "./Card.module.css";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "default" | "glass" | "accent-top";
  hover?: boolean;
}

const paddings = {
  none: styles.paddingNone,
  sm: styles.paddingSm,
  md: styles.paddingMd,
  lg: styles.paddingLg,
};

const variants = {
  default: "",
  glass: styles.glass,
  "accent-top": styles.accentTop,
};

export function Card({
  children,
  className,
  padding = "md",
  variant = "default",
  hover = false,
}: CardProps) {
  return (
    <div
      className={cn(
        styles.base,
        paddings[padding],
        variants[variant],
        hover && styles.interactive,
        className
      )}
    >
      {children}
    </div>
  );
}
