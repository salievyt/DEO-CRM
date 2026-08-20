import type { Config } from "tailwindcss";
import { appleColors, appleTypography, appleSpacing, appleRounded, interTypography } from "./src/shared/config/apple-design";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        surface: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
        info: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
        },
        apple: appleColors,
      },
      spacing: {
        ...appleSpacing,
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        ...appleRounded,
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        display: ["Inter", "system-ui", "sans-serif"],
        "sf-display": ["SF Pro Display", "system-ui", "-apple-system", "sans-serif"],
        "sf-text": ["SF Pro Text", "system-ui", "-apple-system", "sans-serif"],
        "inter-display": [interTypography.heroDisplay.fontFamily],
        "inter-text": [interTypography.body.fontFamily],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        "apple-hero": [appleTypography.heroDisplay.fontSize, {
          fontWeight: appleTypography.heroDisplay.fontWeight,
          lineHeight: appleTypography.heroDisplay.lineHeight,
          letterSpacing: appleTypography.heroDisplay.letterSpacing,
        }],
        "apple-display-lg": [appleTypography.displayLg.fontSize, {
          fontWeight: appleTypography.displayLg.fontWeight,
          lineHeight: appleTypography.displayLg.lineHeight,
          letterSpacing: appleTypography.displayLg.letterSpacing,
        }],
        "apple-display-md": [appleTypography.displayMd.fontSize, {
          fontWeight: appleTypography.displayMd.fontWeight,
          lineHeight: appleTypography.displayMd.lineHeight,
          letterSpacing: appleTypography.displayMd.letterSpacing,
        }],
        "apple-lead": [appleTypography.lead.fontSize, {
          fontWeight: appleTypography.lead.fontWeight,
          lineHeight: appleTypography.lead.lineHeight,
          letterSpacing: appleTypography.lead.letterSpacing,
        }],
        "apple-tagline": [appleTypography.tagline.fontSize, {
          fontWeight: appleTypography.tagline.fontWeight,
          lineHeight: appleTypography.tagline.lineHeight,
          letterSpacing: appleTypography.tagline.letterSpacing,
        }],
        "apple-body-strong": [appleTypography.bodyStrong.fontSize, {
          fontWeight: appleTypography.bodyStrong.fontWeight,
          lineHeight: appleTypography.bodyStrong.lineHeight,
          letterSpacing: appleTypography.bodyStrong.letterSpacing,
        }],
        "apple-body": [appleTypography.body.fontSize, {
          fontWeight: appleTypography.body.fontWeight,
          lineHeight: appleTypography.body.lineHeight,
          letterSpacing: appleTypography.body.letterSpacing,
        }],
        "apple-caption": [appleTypography.caption.fontSize, {
          fontWeight: appleTypography.caption.fontWeight,
          lineHeight: appleTypography.caption.lineHeight,
          letterSpacing: appleTypography.caption.letterSpacing,
        }],
        "apple-caption-strong": [appleTypography.captionStrong.fontSize, {
          fontWeight: appleTypography.captionStrong.fontWeight,
          lineHeight: appleTypography.captionStrong.lineHeight,
          letterSpacing: appleTypography.captionStrong.letterSpacing,
        }],
        "apple-button-large": [appleTypography.buttonLarge.fontSize, {
          fontWeight: appleTypography.buttonLarge.fontWeight,
          lineHeight: appleTypography.buttonLarge.lineHeight,
          letterSpacing: appleTypography.buttonLarge.letterSpacing,
        }],
        "apple-button-utility": [appleTypography.buttonUtility.fontSize, {
          fontWeight: appleTypography.buttonUtility.fontWeight,
          lineHeight: appleTypography.buttonUtility.lineHeight,
          letterSpacing: appleTypography.buttonUtility.letterSpacing,
        }],
        "apple-fine-print": [appleTypography.finePrint.fontSize, {
          fontWeight: appleTypography.finePrint.fontWeight,
          lineHeight: appleTypography.finePrint.lineHeight,
          letterSpacing: appleTypography.finePrint.letterSpacing,
        }],
        "inter-hero": [interTypography.heroDisplay.fontSize, {
          fontWeight: interTypography.heroDisplay.fontWeight,
          lineHeight: interTypography.heroDisplay.lineHeight,
          letterSpacing: interTypography.heroDisplay.letterSpacing,
        }],
        "inter-display-lg": [interTypography.displayLg.fontSize, {
          fontWeight: interTypography.displayLg.fontWeight,
          lineHeight: interTypography.displayLg.lineHeight,
          letterSpacing: interTypography.displayLg.letterSpacing,
        }],
        "inter-body": [interTypography.body.fontSize, {
          fontWeight: interTypography.body.fontWeight,
          lineHeight: interTypography.body.lineHeight,
          letterSpacing: interTypography.body.letterSpacing,
        }],
      },
      boxShadow: {
        soft: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        elevated: "0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        modal: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        glass: "0 8px 32px rgb(0 0 0 / 0.08)",
        glow: "0 0 20px rgb(99 102 241 / 0.15)",
        "apple-product": "rgba(0, 0, 0, 0.22) 3px 5px 30px 0",
      },
      backdropBlur: {
        xs: "2px",
        "apple-glass": "20px",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "fade-in-up": "fadeInUp 0.35s ease-out",
        "fade-in-down": "fadeInDown 0.3s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "scale-out": "scaleOut 0.15s ease-in",
        "spin-slow": "spin 3s linear infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "shimmer": "shimmer 1.5s ease-in-out infinite",
        "bounce-gentle": "bounceGentle 1s ease-in-out infinite",
        "apple-press": "applePress 0.2s ease-out",
        "apple-reveal": "appleReveal 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        scaleOut: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.95)", opacity: "0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        bounceGentle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        applePress: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        appleReveal: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "auth-light": "linear-gradient(135deg, #eef2ff 0%, #f8fafc 50%, #f1f5f9 100%)",
        "auth-dark": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%)",
        "brand-gradient": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)",
      },
    },
  },
  plugins: [
    function({ addUtilities, addComponents, theme }: any) {
      addUtilities({
        '.apple-body-text': {
          fontFamily: theme('fontFamily.sf-text'),
          fontSize: theme('fontSize.apple-body[0]'),
          fontWeight: theme('fontSize.apple-body[1].fontWeight'),
          lineHeight: theme('fontSize.apple-body[1].lineHeight'),
          letterSpacing: theme('fontSize.apple-body[1].letterSpacing'),
        },
        '.apple-display-text': {
          fontFamily: theme('fontFamily.sf-display'),
          fontWeight: '600',
          letterSpacing: '-0.02em',
        },
        '.apple-product-shadow': {
          boxShadow: theme('boxShadow.apple-product'),
        },
        '.apple-glass': {
          backdropFilter: 'blur(20px) saturate(180%)',
          backgroundColor: 'rgba(245, 245, 247, 0.8)',
        },
      });

      addComponents({
        '.apple-card-utility': {
          backgroundColor: theme('colors.apple.canvas'),
          border: `1px solid ${theme('colors.apple.hairline')}`,
          borderRadius: theme('borderRadius.lg'),
          padding: theme('spacing.lg'),
        },
      });
    },
  ],
};

export default config;
