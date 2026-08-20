import { ReactNode } from "react";
import { cn } from "../../utils/cn";
import { AppleButton, AppleButtonVariant } from "./apple-button";

export interface ProductTileAction {
  label: string;
  variant: AppleButtonVariant;
  onClick?: () => void;
}

export interface AppleProductTileProps {
  variant: "light" | "dark" | "parchment";
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  actions?: ProductTileAction[];
  className?: string;
  children?: ReactNode;
}

const variantStyles = {
  light: "bg-apple-canvas text-apple-ink",
  dark: "bg-apple-tile-1 text-apple-bodyOnDark",
  parchment: "bg-apple-parchment text-apple-ink",
};

export function AppleProductTile({
  variant,
  title,
  description,
  imageSrc,
  imageAlt,
  actions = [],
  className,
  children,
}: AppleProductTileProps) {
  return (
    <section className={cn(
      "py-section px-4 w-full",
      variantStyles[variant],
      className
    )}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h2 className="font-sf-display text-apple-display-lg font-semibold leading-tight tracking-tight">
                {title}
              </h2>
              <p className="font-sf-display text-apple-lead leading-relaxed opacity-90">
                {description}
              </p>
            </div>

            {/* Actions */}
            {actions.length > 0 && (
              <div className="flex flex-wrap gap-4">
                {actions.map((action, index) => (
                  <AppleButton
                    key={index}
                    variant={action.variant}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </AppleButton>
                ))}
              </div>
            )}

            {/* Additional content */}
            {children}
          </div>

          {/* Image */}
          <div className="relative">
            <div className="relative z-10">
              <img
                src={imageSrc}
                alt={imageAlt}
                className="w-full h-auto rounded-lg apple-product-shadow"
              />
            </div>

            {/* Optional decorative element */}
            {variant === "light" && (
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-apple-primary/10 to-transparent rounded-full blur-2xl" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// Export convenience components
export function AppleLightProductTile(props: Omit<AppleProductTileProps, "variant">) {
  return <AppleProductTile variant="light" {...props} />;
}

export function AppleDarkProductTile(props: Omit<AppleProductTileProps, "variant">) {
  return <AppleProductTile variant="dark" {...props} />;
}

export function AppleParchmentProductTile(props: Omit<AppleProductTileProps, "variant">) {
  return <AppleProductTile variant="parchment" {...props} />;
}