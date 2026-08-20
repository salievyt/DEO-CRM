import type { Config } from "tailwindcss";
import { appleColors, appleTypography, appleSpacing, appleRounded, interTypography } from "./src/shared/config/apple-design";

// Apple Design System Tailwind Configuration
const appleDesignConfig: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        apple: appleColors,
        // Aliases for easier use
        "action-blue": appleColors.primary,
        "focus-blue": appleColors.primaryFocus,
        "sky-link": appleColors.primaryOnDark,
        "near-black": appleColors.ink,
        "parchment": appleColors.canvasParchment,
        "pearl": appleColors.surfacePearl,
        "tile-1": appleColors.surfaceTile1,
        "tile-2": appleColors.surfaceTile2,
        "tile-3": appleColors.surfaceTile3,
        "chip-gray": appleColors.surfaceChipTranslucent,
        "soft-divider": appleColors.dividerSoft,
      },
      spacing: appleSpacing,
      borderRadius: appleRounded,
      fontFamily: {
        "sf-display": ["SF Pro Display", "system-ui", "-apple-system", "sans-serif"],
        "sf-text": ["SF Pro Text", "system-ui", "-apple-system", "sans-serif"],
        "inter-display": [interTypography.heroDisplay.fontFamily],
        "inter-text": [interTypography.body.fontFamily],
      },
      fontSize: {
        // Apple display sizes
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

        // Apple body sizes
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

        // Inter substitutes for non-Apple platforms
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
        "apple-product": "rgba(0, 0, 0, 0.22) 3px 5px 30px 0",
      },
      backdropBlur: {
        "apple-glass": "20px",
      },
      animation: {
        "apple-press": "applePress 0.2s ease-out",
        "apple-reveal": "appleReveal 0.4s ease-out",
      },
      keyframes: {
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
    },
  },
  plugins: [
    function({ addUtilities, addComponents, theme }: any) {
      // Apple-specific utilities
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

      // Apple component classes
      addComponents({
        // Primary Apple Button (pill)
        '.apple-button-primary': {
          backgroundColor: theme('colors.apple.primary'),
          color: theme('colors.apple.onPrimary'),
          fontFamily: theme('fontFamily.sf-text'),
          fontSize: theme('fontSize.apple-body[0]'),
          fontWeight: '400',
          borderRadius: theme('borderRadius.pill'),
          padding: '11px 22px',
          border: 'none',
          cursor: 'pointer',
          transition: 'transform 0.2s ease-out',
          '&:active': {
            transform: 'scale(0.95)',
          },
          '&:focus-visible': {
            outline: `2px solid ${theme('colors.apple.primaryFocus')}`,
            outlineOffset: '2px',
          },
        },

        // Secondary Pill Button
        '.apple-button-secondary-pill': {
          backgroundColor: 'transparent',
          color: theme('colors.apple.primary'),
          border: `1px solid ${theme('colors.apple.primary')}`,
          fontFamily: theme('fontFamily.sf-text'),
          fontSize: theme('fontSize.apple-body[0]'),
          fontWeight: '400',
          borderRadius: theme('borderRadius.pill'),
          padding: '11px 22px',
          cursor: 'pointer',
          transition: 'transform 0.2s ease-out',
          '&:active': {
            transform: 'scale(0.95)',
          },
        },

        // Dark Utility Button
        '.apple-button-dark-utility': {
          backgroundColor: theme('colors.apple.ink'),
          color: theme('colors.apple.onDark'),
          fontFamily: theme('fontFamily.sf-text'),
          fontSize: theme('fontSize.apple-button-utility[0]'),
          fontWeight: '400',
          borderRadius: theme('borderRadius.sm'),
          padding: '8px 15px',
          border: 'none',
          cursor: 'pointer',
          transition: 'transform 0.2s ease-out',
          '&:active': {
            transform: 'scale(0.95)',
          },
        },

        // Product Tile (light)
        '.apple-tile-light': {
          backgroundColor: theme('colors.apple.canvas'),
          color: theme('colors.apple.ink'),
          padding: theme('spacing.section'),
          width: '100%',
          '& h1': {
            fontFamily: theme('fontFamily.sf-display'),
            fontSize: theme('fontSize.apple-display-lg[0]'),
            fontWeight: '600',
            lineHeight: theme('fontSize.apple-display-lg[1].lineHeight'),
            letterSpacing: '0',
            marginBottom: theme('spacing.md'),
          },
          '& p': {
            fontFamily: theme('fontFamily.sf-display'),
            fontSize: theme('fontSize.apple-lead[0]'),
            fontWeight: '400',
            lineHeight: theme('fontSize.apple-lead[1].lineHeight'),
            marginBottom: theme('spacing.lg'),
          },
        },

        // Product Tile (dark)
        '.apple-tile-dark': {
          backgroundColor: theme('colors.apple.tile-1'),
          color: theme('colors.apple.bodyOnDark'),
          padding: theme('spacing.section'),
          width: '100%',
          '& h1': {
            fontFamily: theme('fontFamily.sf-display'),
            fontSize: theme('fontSize.apple-display-lg[0]'),
            fontWeight: '600',
            lineHeight: theme('fontSize.apple-display-lg[1].lineHeight'),
            letterSpacing: '0',
            marginBottom: theme('spacing.md'),
          },
          '& p': {
            fontFamily: theme('fontFamily.sf-display'),
            fontSize: theme('fontSize.apple-lead[0]'),
            fontWeight: '400',
            lineHeight: theme('fontSize.apple-lead[1].lineHeight'),
            marginBottom: theme('spacing.lg'),
          },
          '& a': {
            color: theme('colors.apple.primaryOnDark'),
          },
        },

        // Store Utility Card
        '.apple-card-utility': {
          backgroundColor: theme('colors.apple.canvas'),
          border: `1px solid ${theme('colors.apple.hairline')}`,
          borderRadius: theme('borderRadius.lg'),
          padding: theme('spacing.lg'),
          '& h3': {
            fontFamily: theme('fontFamily.sf-text'),
            fontSize: theme('fontSize.apple-body-strong[0]'),
            fontWeight: '600',
            lineHeight: theme('fontSize.apple-body-strong[1].lineHeight'),
            marginBottom: theme('spacing.xs'),
          },
          '& p': {
            fontFamily: theme('fontFamily.sf-text'),
            fontSize: theme('fontSize.apple-body[0]'),
            fontWeight: '400',
            lineHeight: theme('fontSize.apple-body[1].lineHeight'),
            color: theme('colors.apple.ink'),
          },
        },

        // Global Navigation
        '.apple-global-nav': {
          backgroundColor: theme('colors.apple.surfaceBlack'),
          color: theme('colors.apple.bodyOnDark'),
          height: '44px',
          fontFamily: theme('fontFamily.sf-text'),
          fontSize: theme('fontSize.apple-fine-print[0]'),
          fontWeight: '400',
          letterSpacing: '-0.12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${theme('spacing.lg')}`,
        },

        // Sub Navigation (frosted glass)
        '.apple-sub-nav': {
          backgroundColor: 'rgba(245, 245, 247, 0.8)',
          backdropFilter: 'blur(20px) saturate(180%)',
          height: '52px',
          fontFamily: theme('fontFamily.sf-display'),
          fontSize: theme('fontSize.apple-tagline[0]'),
          fontWeight: '600',
          letterSpacing: '0.231px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${theme('spacing.lg')}`,
        },

        // Search Input (pill)
        '.apple-search-input': {
          backgroundColor: theme('colors.apple.canvas'),
          color: theme('colors.apple.ink'),
          fontFamily: theme('fontFamily.sf-text'),
          fontSize: theme('fontSize.apple-body[0]'),
          fontWeight: '400',
          borderRadius: theme('borderRadius.pill'),
          padding: '12px 20px',
          height: '44px',
          border: `1px solid rgba(0, 0, 0, 0.08)`,
          '&:focus': {
            outline: 'none',
            borderColor: theme('colors.apple.primary'),
          },
        },
      });
    },
  ],
};

export default appleDesignConfig;