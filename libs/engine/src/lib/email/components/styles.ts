/**
 * Grove Email Design System - Colors & Shared Styles
 *
 * These colors match the Grove brand while being email-safe.
 * Email clients have limited CSS support, so we keep it simple.
 */

export const GROVE_EMAIL_COLORS = {
  // Backgrounds
  warmCream: "#fefdfb", // body background
  softGreen: "#f0fdf4", // content card background

  // Text
  barkBrown: "#3d2914", // primary text

  // Accent
  groveGreen: "#16a34a", // buttons, links, highlights
  groveGreenHover: "#15803d", // darker green for emphasis

  // Opacity variants (for use with rgba)
  textMuted: "rgba(61, 41, 20, 0.6)", // signature, tagline
  textSubtle: "rgba(61, 41, 20, 0.4)", // footer links
} as const;

/**
 * Common text styles used across email components
 */
export const TEXT_STYLES = {
  heading: {
    margin: "0 0 16px 0",
    fontSize: "24px",
    color: GROVE_EMAIL_COLORS.barkBrown,
    fontWeight: "normal" as const,
    lineHeight: 1.3,
  },
  subheading: {
    margin: "0 0 12px 0",
    fontSize: "18px",
    color: GROVE_EMAIL_COLORS.barkBrown,
    fontWeight: "normal" as const,
    lineHeight: 1.4,
  },
  body: {
    margin: "0 0 16px 0",
    fontSize: "16px",
    lineHeight: 1.6,
    color: GROVE_EMAIL_COLORS.barkBrown,
  },
  small: {
    margin: "0 0 12px 0",
    fontSize: "14px",
    lineHeight: 1.5,
    color: GROVE_EMAIL_COLORS.barkBrown,
    opacity: 0.8,
  },
} as const;
