/**
 * Grove Design System - Typography Tokens
 *
 * Font families, sizes, weights, and line heights.
 */

export const fontFamily = {
  serif: ["Georgia", "Cambria", "Times New Roman", "Times", "serif"],
  sans: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "Noto Sans",
    "sans-serif",
  ],
  mono: [
    "ui-monospace",
    "SFMono-Regular",
    "SF Mono",
    "Menlo",
    "Monaco",
    "Consolas",
    "Liberation Mono",
    "Courier New",
    "monospace",
  ],
} as const;

export const fontSize = {
  "display-lg": "3.5rem", // 56px
  display: "2.5rem", // 40px
  "display-sm": "2rem", // 32px
  "heading-lg": "1.5rem", // 24px
  heading: "1.25rem", // 20px
  "heading-sm": "1.125rem", // 18px
  "body-lg": "1.125rem", // 18px
  body: "1rem", // 16px
  "body-sm": "0.875rem", // 14px
  caption: "0.75rem", // 12px
} as const;

export const lineHeight = {
  display: "1.1",
  heading: "1.35",
  body: "1.75",
  tight: "1.25",
  normal: "1.5",
  relaxed: "1.65",
} as const;

export const letterSpacing = {
  tight: "-0.02em",
  normal: "0",
  wide: "0.025em",
} as const;

export const fontWeight = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const typography = {
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  fontWeight,
} as const;

export type FontFamily = typeof fontFamily;
export type FontSize = typeof fontSize;
export type LineHeight = typeof lineHeight;
export type LetterSpacing = typeof letterSpacing;
export type FontWeight = typeof fontWeight;
export type Typography = typeof typography;
