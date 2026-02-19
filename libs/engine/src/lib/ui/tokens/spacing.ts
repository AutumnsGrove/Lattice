/**
 * Grove Design System - Spacing & Sizing Tokens
 *
 * Consistent spacing scale for margins, padding, and gaps.
 */

export const spacing = {
  "0": "0",
  px: "1px",
  "0.5": "0.125rem", // 2px
  "1": "0.25rem", // 4px
  "1.5": "0.375rem", // 6px
  "2": "0.5rem", // 8px
  "2.5": "0.625rem", // 10px
  "3": "0.75rem", // 12px
  "3.5": "0.875rem", // 14px
  "4": "1rem", // 16px
  "5": "1.25rem", // 20px
  "6": "1.5rem", // 24px
  "7": "1.75rem", // 28px
  "8": "2rem", // 32px
  "9": "2.25rem", // 36px
  "10": "2.5rem", // 40px
  "11": "2.75rem", // 44px
  "12": "3rem", // 48px
  "14": "3.5rem", // 56px
  "16": "4rem", // 64px
  "18": "4.5rem", // 72px
  "20": "5rem", // 80px
  "22": "5.5rem", // 88px
  "24": "6rem", // 96px
  "30": "7.5rem", // 120px
} as const;

export const containerSizes = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export const contentWidths = {
  prose: "65ch",
  "prose-wide": "75ch",
  "prose-narrow": "55ch",
} as const;

export const sizing = {
  spacing,
  containerSizes,
  contentWidths,
} as const;

export type Spacing = typeof spacing;
export type ContainerSizes = typeof containerSizes;
export type ContentWidths = typeof contentWidths;
export type Sizing = typeof sizing;
