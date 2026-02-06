// GroveUI - Utilities
//
// This module exports utility functions for the Grove Design System.
//
// Usage:
//   import { cn } from '@groveengine/ui/utils';
//   import { generateTierColors, hexToHsl } from '@groveengine/ui/utils';

export { cn } from "./cn.js";

// Color manipulation utilities
export {
  hexToHsl,
  hslToHex,
  generateTierColors,
  adjustLightness,
  adjustSaturation,
  type HSLColor,
  type TierColors,
  type LogoTierColors,
} from "./color.js";

// Grove term resolution utilities (for non-component contexts)
export { resolveTerm, resolveTermString } from "./grove-term-resolve.js";

export const UTILS_VERSION = "0.2.0";
