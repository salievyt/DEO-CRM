import { ReactNode } from "react";
import { cn } from "../../utils/cn";
import { AppleButton } from "./apple-button";
import { Menu, X, Search, ShoppingBag } from "lucide-react";

interface NavigationLink {
  label: string;
  href: string;
  icon?: ReactNode;
}

interface AppleGlobalNavProps {
  logo?: ReactNode;
  links?: NavigationLink[];
  rightItems?: ReactNode;
  className?: string;
}

export function AppleGlobalNav({
  logo = "DEO Core Codes",
  links = [
    { label: "Проекты", href: "/projects" },
    { label: "Услуги", href: "/services" },
    { label: "О студии", href: "/about" },
    { label: "Блог", href: "/blog" },
  ],
  rightItems,
  className,
}: AppleGlobalNavProps) {
  return (
    <nav className={cn(
      "apple-global-nav",
      className
    )}>
      {/* Left: Logo */}
      <div className="flex items-center gap-8">
        <a href="/" className="text-lg font-medium hover:opacity-80 transition-opacity">
          {logo}
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.href}
              className="text-apple-bodyOnDark hover:text-apple-primaryOnDark transition-colors text-sm font-normal"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {rightItems || (
          <>
            <button
              className="p-2 hover:bg-white/10 rounded-sm transition-colors"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              className="p-2 hover:bg-white/10 rounded-sm transition-colors"
              aria-label="Bag"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

interface AppleSubNavProps {
  title: string;
  links?: NavigationLink[];
  primaryAction?: {
    label: string;
    onClick?: () => void;
  };
  className?: string;
}

export function AppleSubNav({
  title,
  links = [
    { label: "Все проекты", href: "/projects/all" },
    { label: "Веб", href: "/projects/web" },
    { label: "Мобильные", href: "/projects/mobile" },
    { label: "Дизайн", href: "/projects/design" },
  ],
  primaryAction = { label: "Заказать проект" },
  className,
}: AppleSubNavProps) {
  return (
    <div className={cn(
      "apple-sub-nav",
      className
    )}>
      {/* Title */}
      <div className="flex items-center">
        <h2 className="font-sf-display text-apple-tagline font-semibold">
          {title}
        </h2>
      </div>

      {/* Desktop Navigation & CTA */}
      <div className="hidden md:flex items-center gap-6">
        {links.map((link, index) => (
          <a
            key={index}
            href={link.href}
            className="font-sf-text text-apple-button-utility hover:text-apple-primary transition-colors"
          >
            {link.label}
          </a>
        ))}

        {primaryAction && (
          <AppleButton variant="primary" size="small" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </AppleButton>
        )}
      </div>

      {/* Mobile: Only CTA */}
      <div className="md:hidden">
        {primaryAction && (
          <AppleButton variant="primary" size="small" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </AppleButton>
        )}
      </div>
    </div>
  );
}

interface AppleMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links: NavigationLink[];
  children?: ReactNode;
}

export function AppleMobileMenu({ isOpen, onClose, links, children }: AppleMobileMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="absolute right-0 top-0 h-full w-80 bg-apple-canvas shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-apple-hairline">
          <span className="font-sf-text text-apple-body font-semibold">Меню</span>
          <button
            onClick={onClose}
            className="p-2 hover:bg-apple-dividerSoft rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Links */}
        <div className="p-6 space-y-4">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.href}
              className="block font-sf-text text-apple-body hover:text-apple-primary transition-colors py-3"
              onClick={onClose}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Additional content */}
        {children && (
          <div className="p-6 border-t border-apple-hairline">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}