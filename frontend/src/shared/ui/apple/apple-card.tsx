import { ReactNode } from "react";
import { cn } from "../../utils/cn";
import { AppleButton } from "./apple-button";

export interface AppleStoreCardProps {
  title: string;
  description: string;
  price?: string;
  imageSrc: string;
  imageAlt?: string;
  tags?: string[];
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: ReactNode;
}

export function AppleStoreCard({
  title,
  description,
  price,
  imageSrc,
  imageAlt,
  tags = [],
  actionLabel = "Подробнее",
  onAction,
  className,
  children,
}: AppleStoreCardProps) {
  return (
    <div className={cn(
      "apple-card-utility group hover:shadow-elevated transition-shadow duration-300",
      className
    )}>
      {/* Image */}
      <div className="mb-6 overflow-hidden rounded-sm bg-apple-dividerSoft">
        <img
          src={imageSrc}
          alt={imageAlt || title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full bg-apple-pearl text-apple-inkMuted80 text-xs font-sf-text"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title & Description */}
        <div className="space-y-2">
          <h3 className="font-sf-text text-apple-bodyStrong font-semibold leading-tight">
            {title}
          </h3>
          <p className="font-sf-text text-apple-body text-apple-inkMuted80 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Price */}
        {price && (
          <div className="pt-2">
            <span className="font-sf-text text-apple-body font-semibold text-apple-ink">
              {price}
            </span>
          </div>
        )}

        {/* Action */}
        <div className="pt-4">
          <AppleButton
            variant="secondary-pill"
            size="small"
            fullWidth
            onClick={onAction}
          >
            {actionLabel}
          </AppleButton>
        </div>

        {/* Additional content */}
        {children}
      </div>
    </div>
  );
}

export interface AppleConfiguratorChipProps {
  label: string;
  price?: string;
  isSelected?: boolean;
  onClick?: () => void;
  thumbnail?: ReactNode;
  className?: string;
}

export function AppleConfiguratorChip({
  label,
  price,
  isSelected = false,
  onClick,
  thumbnail,
  className,
}: AppleConfiguratorChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "apple-configurator-chip",
        "inline-flex items-center gap-3 px-4 py-3 rounded-pill",
        "border transition-all duration-200",
        "font-sf-text text-apple-caption",
        "hover:bg-apple-dividerSoft active:scale-95",
        isSelected
          ? "border-2 border-apple-primaryFocus bg-apple-pearl"
          : "border-apple-hairline bg-apple-canvas",
        className
      )}
    >
      {thumbnail && (
        <div className="w-8 h-8 flex items-center justify-center">
          {thumbnail}
        </div>
      )}
      <div className="flex-1 text-left">
        <div className="font-medium">{label}</div>
        {price && (
          <div className="text-apple-inkMuted48 text-xs mt-1">{price}</div>
        )}
      </div>
    </button>
  );
}

export interface AppleQuoteCardProps {
  quote: string;
  author?: string;
  backgroundColor?: "tile-1" | "tile-2" | "tile-3";
  className?: string;
}

export function AppleQuoteCard({
  quote,
  author,
  backgroundColor = "tile-1",
  className,
}: AppleQuoteCardProps) {
  const bgColors = {
    "tile-1": "bg-apple-tile-1",
    "tile-2": "bg-apple-tile-2",
    "tile-3": "bg-apple-tile-3",
  };

  return (
    <div className={cn(
      "py-20 px-6 text-center",
      bgColors[backgroundColor],
      "text-apple-bodyOnDark",
      className
    )}>
      <div className="max-w-3xl mx-auto space-y-8">
        <blockquote className="font-sf-display text-apple-display-lg font-semibold leading-tight">
          "{quote}"
        </blockquote>
        {author && (
          <div className="font-sf-text text-apple-tagline opacity-80">
            — {author}
          </div>
        )}
      </div>
    </div>
  );
}

export interface AppleFloatingBarProps {
  leftContent: ReactNode;
  rightContent: ReactNode;
  className?: string;
}

export function AppleFloatingBar({
  leftContent,
  rightContent,
  className,
}: AppleFloatingBarProps) {
  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0",
      "apple-glass",
      "border-t border-apple-hairline/50",
      "px-8 py-4",
      "flex items-center justify-between",
      "shadow-modal",
      className
    )}>
      {/* Left content */}
      <div className="font-sf-text text-apple-body">
        {leftContent}
      </div>

      {/* Right content */}
      <div>
        {rightContent}
      </div>
    </div>
  );
}