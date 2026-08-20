import { forwardRef, ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type AppleButtonVariant =
  | "primary"
  | "secondary-pill"
  | "dark-utility"
  | "store-hero"
  | "pearl-capsule"
  | "icon-circular";

export interface AppleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppleButtonVariant;
  size?: "default" | "large" | "small";
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const AppleButton = forwardRef<HTMLButtonElement, AppleButtonProps>(
  ({
    className,
    variant = "primary",
    size = "default",
    fullWidth = false,
    isLoading = false,
    children,
    disabled,
    ...props
  }, ref) => {

    const baseStyles = "inline-flex items-center justify-center border-0 cursor-pointer transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary: "bg-apple-primary text-apple-onPrimary rounded-pill font-sf-text text-apple-body font-normal px-[22px] py-[11px] hover:bg-[#0077ED] focus-visible:ring-apple-primaryFocus",
      "secondary-pill": "bg-transparent text-apple-primary border border-apple-primary rounded-pill font-sf-text text-apple-body font-normal px-[22px] py-[11px] hover:bg-apple-primary/5",
      "dark-utility": "bg-apple-ink text-apple-onDark rounded-sm font-sf-text text-apple-button-utility font-normal px-[15px] py-[8px] hover:bg-[#2A2A2C]",
      "store-hero": "bg-apple-primary text-apple-onPrimary rounded-pill font-sf-text text-apple-button-large font-light px-[28px] py-[14px] hover:bg-[#0077ED] focus-visible:ring-apple-primaryFocus",
      "pearl-capsule": "bg-apple-pearl text-apple-inkMuted80 rounded-md font-sf-text text-apple-caption font-normal border border-apple-dividerSoft px-[14px] py-[8px] hover:bg-[#F0F0F0]",
      "icon-circular": "bg-apple-chipGray text-apple-ink rounded-full w-11 h-11 flex items-center justify-center hover:bg-[#C0C0C5]",
    };

    const sizes = {
      default: "",
      large: "px-[32px] py-[16px] text-lg",
      small: "px-[16px] py-[8px] text-sm",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          isLoading && "opacity-70 cursor-wait",
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </div>
        ) : (
          children
        )}
      </button>
    );
  }
);

AppleButton.displayName = "AppleButton";

// Export convenience components
export const ApplePrimaryButton = forwardRef<HTMLButtonElement, Omit<AppleButtonProps, "variant">>(
  (props, ref) => <AppleButton ref={ref} variant="primary" {...props} />
);

export const AppleSecondaryButton = forwardRef<HTMLButtonElement, Omit<AppleButtonProps, "variant">>(
  (props, ref) => <AppleButton ref={ref} variant="secondary-pill" {...props} />
);

ApplePrimaryButton.displayName = "ApplePrimaryButton";
AppleSecondaryButton.displayName = "AppleSecondaryButton";