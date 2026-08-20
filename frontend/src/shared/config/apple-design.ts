/**
 * Apple Design System Configuration
 * Based on Design.md analysis of Apple's web design language
 */

export const appleColors = {
  // Brand & Accent
  primary: "#0066cc",
  primaryFocus: "#0071e3",
  primaryOnDark: "#2997ff",

  // Surface
  canvas: "#ffffff",
  canvasParchment: "#f5f5f7",
  surfacePearl: "#fafafc",
  surfaceTile1: "#272729",
  surfaceTile2: "#2a2a2c",
  surfaceTile3: "#252527",
  surfaceBlack: "#000000",
  surfaceChipTranslucent: "rgba(210, 210, 215, 0.64)",

  // Text
  ink: "#1d1d1f",
  body: "#1d1d1f",
  bodyOnDark: "#ffffff",
  bodyMuted: "#cccccc",
  inkMuted80: "#333333",
  inkMuted48: "#7a7a7a",

  // Hairlines & Borders
  dividerSoft: "#f0f0f0",
  hairline: "#e0e0e0",

  // Semantic
  onPrimary: "#ffffff",
  onDark: "#ffffff",
} as const;

export const appleTypography = {
  // Display (SF Pro Display)
  heroDisplay: {
    fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
    fontSize: "56px",
    fontWeight: 600,
    lineHeight: 1.07,
    letterSpacing: "-0.28px",
  },
  displayLg: {
    fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
    fontSize: "40px",
    fontWeight: 600,
    lineHeight: 1.1,
    letterSpacing: "0",
  },
  displayMd: {
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif",
    fontSize: "34px",
    fontWeight: 600,
    lineHeight: 1.47,
    letterSpacing: "-0.374px",
  },
  lead: {
    fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
    fontSize: "28px",
    fontWeight: 400,
    lineHeight: 1.14,
    letterSpacing: "0.196px",
  },
  leadAiry: {
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif",
    fontSize: "24px",
    fontWeight: 300,
    lineHeight: 1.5,
    letterSpacing: "0",
  },
  tagline: {
    fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
    fontSize: "21px",
    fontWeight: 600,
    lineHeight: 1.19,
    letterSpacing: "0.231px",
  },

  // Body (SF Pro Text)
  bodyStrong: {
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif",
    fontSize: "17px",
    fontWeight: 600,
    lineHeight: 1.24,
    letterSpacing: "-0.374px",
  },
  body: {
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif",
    fontSize: "17px",
    fontWeight: 400,
    lineHeight: 1.47,
    letterSpacing: "-0.374px",
  },
  denseLink: {
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif",
    fontSize: "17px",
    fontWeight: 400,
    lineHeight: 2.41,
    letterSpacing: "0",
  },

  // UI Text
  caption: {
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif",
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: 1.43,
    letterSpacing: "-0.224px",
  },
  captionStrong: {
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: 1.29,
    letterSpacing: "-0.224px",
  },
  buttonLarge: {
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif",
    fontSize: "18px",
    fontWeight: 300,
    lineHeight: 1.0,
    letterSpacing: "0",
  },
  buttonUtility: {
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif",
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: 1.29,
    letterSpacing: "-0.224px",
  },
  finePrint: {
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif",
    fontSize: "12px",
    fontWeight: 400,
    lineHeight: 1.0,
    letterSpacing: "-0.12px",
  },
  microLegal: {
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif",
    fontSize: "10px",
    fontWeight: 400,
    lineHeight: 1.3,
    letterSpacing: "-0.08px",
  },
  navLink: {
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif",
    fontSize: "12px",
    fontWeight: 400,
    lineHeight: 1.0,
    letterSpacing: "-0.12px",
  },
} as const;

export const appleSpacing = {
  xxs: "4px",
  xs: "8px",
  sm: "12px",
  md: "17px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
  section: "80px",
} as const;

export const appleRounded = {
  none: "0px",
  xs: "5px",
  sm: "8px",
  md: "11px",
  lg: "18px",
  pill: "9999px",
  full: "9999px",
} as const;

export const appleShadows = {
  // Single shadow - only for product imagery
  productShadow: "rgba(0, 0, 0, 0.22) 3px 5px 30px 0",
  // No other shadows in Apple system
} as const;

export const appleComponents = {
  buttonPrimary: {
    backgroundColor: appleColors.primary,
    textColor: appleColors.onPrimary,
    typography: appleTypography.body,
    rounded: appleRounded.pill,
    padding: "11px 22px",
  },
  buttonSecondaryPill: {
    backgroundColor: appleColors.canvas,
    textColor: appleColors.primary,
    typography: appleTypography.body,
    rounded: appleRounded.pill,
    padding: "11px 22px",
  },
  buttonDarkUtility: {
    backgroundColor: appleColors.ink,
    textColor: appleColors.onDark,
    typography: appleTypography.buttonUtility,
    rounded: appleRounded.sm,
    padding: "8px 15px",
  },
  buttonStoreHero: {
    backgroundColor: appleColors.primary,
    textColor: appleColors.onPrimary,
    typography: appleTypography.buttonLarge,
    rounded: appleRounded.pill,
    padding: "14px 28px",
  },
  buttonPearlCapsule: {
    backgroundColor: appleColors.surfacePearl,
    textColor: appleColors.inkMuted80,
    typography: appleTypography.caption,
    rounded: appleRounded.md,
    padding: "8px 14px",
  },
} as const;

// For non-Apple platforms (Inter font substitute)
export const interTypography = {
  heroDisplay: {
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    fontSize: "56px",
    fontWeight: 600,
    lineHeight: 1.07,
    letterSpacing: "-0.02em",
  },
  displayLg: {
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    fontSize: "40px",
    fontWeight: 600,
    lineHeight: 1.1,
    letterSpacing: "-0.01em",
  },
  body: {
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    fontSize: "17px",
    fontWeight: 400,
    lineHeight: 1.44,
    letterSpacing: "-0.374px",
  },
};

export type AppleColor = keyof typeof appleColors;
export type AppleTypography = keyof typeof appleTypography;
export type AppleSpacing = keyof typeof appleSpacing;
export type AppleRounded = keyof typeof appleRounded;