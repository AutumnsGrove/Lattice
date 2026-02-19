/**
 * Grove Design System - Effect Tokens
 *
 * Borders, shadows, and visual effects.
 */

export const borderRadius = {
  none: "0",
  sm: "0.125rem", // 2px
  DEFAULT: "0.25rem", // 4px
  md: "0.375rem", // 6px
  lg: "0.5rem", // 8px
  grove: "0.75rem", // 12px - Primary Grove radius
  "grove-lg": "1rem", // 16px
  "grove-xl": "1.5rem", // 24px
  full: "9999px",
} as const;

export const borderWidth = {
  DEFAULT: "1px",
  "0": "0",
  "2": "2px",
  "4": "4px",
} as const;

export const boxShadow = {
  "grove-sm": "0 1px 2px 0 rgb(61 41 20 / 0.05)",
  grove:
    "0 2px 8px -2px rgb(61 41 20 / 0.08), 0 1px 2px -1px rgb(61 41 20 / 0.04)",
  "grove-md":
    "0 4px 12px -4px rgb(61 41 20 / 0.1), 0 2px 4px -2px rgb(61 41 20 / 0.05)",
  "grove-lg":
    "0 8px 24px -8px rgb(61 41 20 / 0.12), 0 4px 8px -4px rgb(61 41 20 / 0.06)",
  "grove-xl":
    "0 16px 48px -16px rgb(61 41 20 / 0.15), 0 8px 16px -8px rgb(61 41 20 / 0.08)",
  "grove-inner": "inset 0 1px 2px 0 rgb(61 41 20 / 0.05)",
  "grove-glow": "0 0 0 3px rgb(22 163 74 / 0.15)",
  focus: "0 0 0 2px #fefdfb, 0 0 0 4px #22c55e",
  "focus-error": "0 0 0 2px #fefdfb, 0 0 0 4px #dc2626",
} as const;

export const blur = {
  grove: "8px",
  "grove-lg": "16px",
} as const;

export const opacity = {
  "0": "0",
  "5": "0.05",
  "10": "0.1",
  "20": "0.2",
  "25": "0.25",
  "30": "0.3",
  "40": "0.4",
  "50": "0.5",
  "60": "0.6",
  "70": "0.7",
  "75": "0.75",
  "80": "0.8",
  "90": "0.9",
  "95": "0.95",
  "100": "1",
} as const;

export const effects = {
  borderRadius,
  borderWidth,
  boxShadow,
  blur,
  opacity,
} as const;

export type BorderRadius = typeof borderRadius;
export type BorderWidth = typeof borderWidth;
export type BoxShadow = typeof boxShadow;
export type Blur = typeof blur;
export type Opacity = typeof opacity;
export type Effects = typeof effects;
