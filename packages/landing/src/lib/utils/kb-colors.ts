/**
 * Knowledge Base Seasonal Color Palette
 *
 * Maps each documentation category to a seasonal color theme.
 * This creates visual consistency across the knowledge base while
 * tying into Grove's seasonal design system.
 *
 * Color Mapping:
 * - Help Center: Summer (Grove green) - emerald
 * - Legal Documents: Autumn (harvest, warmth) - orange
 * - Technical Specs: Midnight Bloom (deep night, focus) - violet
 * - Philosophy: Midnight Bloom (contemplative depth) - violet
 * - Design: Spring (cherry blossoms, fresh creativity) - rose
 * - Patterns: Amber (golden architecture) - amber
 * - Marketing: Summer (growth, outreach) - emerald
 * - Art Exhibit: Midnight Bloom (museum at night, contemplative) - violet
 */

import type { DocCategory } from "$lib/types/docs";

/**
 * Tailwind color classes for each knowledge base category
 * Organized by usage context for easy application
 */
export interface CategoryColors {
  /** Background for icon containers (light mode) */
  iconBg: string;
  /** Background for icon containers (dark mode) */
  iconBgDark: string;
  /** Icon/text color (light mode) */
  text: string;
  /** Icon/text color (dark mode) */
  textDark: string;
  /** Hover text color (light mode) */
  textHover: string;
  /** Hover text color (dark mode) */
  textHoverDark: string;
  /** Badge/pill background (light mode) */
  badgeBg: string;
  /** Badge/pill background (dark mode) */
  badgeBgDark: string;
  /** Badge text color (light mode) */
  badgeText: string;
  /** Badge text color (dark mode) */
  badgeTextDark: string;
  /** CTA section background (light mode) */
  ctaBg: string;
  /** CTA section background (dark mode) */
  ctaBgDark: string;
  /** CTA border color (light mode) */
  ctaBorder: string;
  /** CTA border color (dark mode) */
  ctaBorderDark: string;
  /** Button background */
  buttonBg: string;
  /** Button hover background */
  buttonHover: string;
  /** Card item background (for grids) */
  cardBg: string;
  /** Card item background dark */
  cardBgDark: string;
  /** Seasonal label for the category */
  season: string;
}

/**
 * Complete color definitions for each category
 */
export const kbCategoryColors: Record<DocCategory, CategoryColors> = {
  // Help Center - Summer (Grove green / emerald)
  help: {
    iconBg: "bg-emerald-100",
    iconBgDark: "dark:bg-emerald-900/30",
    text: "text-emerald-600",
    textDark: "dark:text-emerald-400",
    textHover: "hover:text-emerald-700",
    textHoverDark: "dark:hover:text-emerald-300",
    badgeBg: "bg-emerald-100",
    badgeBgDark: "dark:bg-emerald-900/30",
    badgeText: "text-emerald-800",
    badgeTextDark: "dark:text-emerald-300",
    ctaBg: "bg-emerald-50",
    ctaBgDark: "dark:bg-emerald-900/20",
    ctaBorder: "border-emerald-200",
    ctaBorderDark: "dark:border-emerald-800",
    buttonBg: "bg-emerald-600 dark:bg-emerald-500",
    buttonHover: "hover:bg-emerald-700 dark:hover:bg-emerald-600",
    cardBg: "bg-emerald-50",
    cardBgDark: "dark:bg-emerald-900/20",
    season: "Summer",
  },

  // Legal Documents - Autumn (rust, deep harvest warmth)
  // Uses orange-800 (#9a3412) which matches Grove's autumn.rust palette value
  legal: {
    iconBg: "bg-orange-100",
    iconBgDark: "dark:bg-orange-900/30",
    text: "text-orange-700",
    textDark: "dark:text-orange-400",
    textHover: "hover:text-orange-800",
    textHoverDark: "dark:hover:text-orange-300",
    badgeBg: "bg-orange-100",
    badgeBgDark: "dark:bg-orange-900/30",
    badgeText: "text-orange-800",
    badgeTextDark: "dark:text-orange-300",
    ctaBg: "bg-orange-50",
    ctaBgDark: "dark:bg-orange-900/20",
    ctaBorder: "border-orange-200",
    ctaBorderDark: "dark:border-orange-800",
    buttonBg: "bg-orange-700 dark:bg-orange-600",
    buttonHover: "hover:bg-orange-800 dark:hover:bg-orange-700",
    cardBg: "bg-orange-50",
    cardBgDark: "dark:bg-orange-900/20",
    season: "Autumn",
  },

  // Technical Specs - Midnight Bloom (deep purple / violet)
  specs: {
    iconBg: "bg-violet-100",
    iconBgDark: "dark:bg-violet-900/30",
    text: "text-violet-600",
    textDark: "dark:text-violet-400",
    textHover: "hover:text-violet-700",
    textHoverDark: "dark:hover:text-violet-300",
    badgeBg: "bg-violet-100",
    badgeBgDark: "dark:bg-violet-900/30",
    badgeText: "text-violet-800",
    badgeTextDark: "dark:text-violet-300",
    ctaBg: "bg-violet-50",
    ctaBgDark: "dark:bg-violet-900/20",
    ctaBorder: "border-violet-200",
    ctaBorderDark: "dark:border-violet-800",
    buttonBg: "bg-violet-600 dark:bg-violet-500",
    buttonHover: "hover:bg-violet-700 dark:hover:bg-violet-600",
    cardBg: "bg-violet-50",
    cardBgDark: "dark:bg-violet-900/20",
    season: "Midnight",
  },

  // Philosophy - Midnight Bloom (contemplative depth / violet)
  philosophy: {
    iconBg: "bg-violet-100",
    iconBgDark: "dark:bg-violet-900/30",
    text: "text-violet-600",
    textDark: "dark:text-violet-400",
    textHover: "hover:text-violet-700",
    textHoverDark: "dark:hover:text-violet-300",
    badgeBg: "bg-violet-100",
    badgeBgDark: "dark:bg-violet-900/30",
    badgeText: "text-violet-800",
    badgeTextDark: "dark:text-violet-300",
    ctaBg: "bg-violet-50",
    ctaBgDark: "dark:bg-violet-900/20",
    ctaBorder: "border-violet-200",
    ctaBorderDark: "dark:border-violet-800",
    buttonBg: "bg-violet-600 dark:bg-violet-500",
    buttonHover: "hover:bg-violet-700 dark:hover:bg-violet-600",
    cardBg: "bg-violet-50",
    cardBgDark: "dark:bg-violet-900/20",
    season: "Midnight",
  },

  // Design - Spring (cherry blossoms, fresh / rose)
  design: {
    iconBg: "bg-rose-100",
    iconBgDark: "dark:bg-rose-900/30",
    text: "text-rose-600",
    textDark: "dark:text-rose-400",
    textHover: "hover:text-rose-700",
    textHoverDark: "dark:hover:text-rose-300",
    badgeBg: "bg-rose-100",
    badgeBgDark: "dark:bg-rose-900/30",
    badgeText: "text-rose-700",
    badgeTextDark: "dark:text-rose-300",
    ctaBg: "bg-rose-50",
    ctaBgDark: "dark:bg-rose-900/20",
    ctaBorder: "border-rose-200",
    ctaBorderDark: "dark:border-rose-800/30",
    buttonBg: "bg-rose-600 dark:bg-rose-500",
    buttonHover: "hover:bg-rose-700 dark:hover:bg-rose-600",
    cardBg: "bg-rose-50",
    cardBgDark: "dark:bg-rose-900/20",
    season: "Spring",
  },

  // Patterns - Amber (golden architecture)
  // Using amber-700 for better contrast accessibility (4.5:1 ratio on white)
  patterns: {
    iconBg: "bg-amber-100",
    iconBgDark: "dark:bg-amber-900/30",
    text: "text-amber-700",
    textDark: "dark:text-amber-400",
    textHover: "hover:text-amber-800",
    textHoverDark: "dark:hover:text-amber-300",
    badgeBg: "bg-amber-100",
    badgeBgDark: "dark:bg-amber-900/30",
    badgeText: "text-amber-800",
    badgeTextDark: "dark:text-amber-300",
    ctaBg: "bg-amber-100/50",
    ctaBgDark: "dark:bg-amber-950/25",
    ctaBorder: "border-amber-300",
    ctaBorderDark: "dark:border-amber-800/30",
    buttonBg: "bg-amber-500",
    buttonHover: "hover:bg-amber-600",
    cardBg: "bg-amber-50",
    cardBgDark: "dark:bg-amber-900/20",
    season: "Amber",
  },

  // Marketing - Summer (growth, outreach / emerald)
  marketing: {
    iconBg: "bg-emerald-100",
    iconBgDark: "dark:bg-emerald-900/30",
    text: "text-emerald-600",
    textDark: "dark:text-emerald-400",
    textHover: "hover:text-emerald-700",
    textHoverDark: "dark:hover:text-emerald-300",
    badgeBg: "bg-emerald-100",
    badgeBgDark: "dark:bg-emerald-900/30",
    badgeText: "text-emerald-800",
    badgeTextDark: "dark:text-emerald-300",
    ctaBg: "bg-emerald-50",
    ctaBgDark: "dark:bg-emerald-900/20",
    ctaBorder: "border-emerald-200",
    ctaBorderDark: "dark:border-emerald-800",
    buttonBg: "bg-emerald-600 dark:bg-emerald-500",
    buttonHover: "hover:bg-emerald-700 dark:hover:bg-emerald-600",
    cardBg: "bg-emerald-50",
    cardBgDark: "dark:bg-emerald-900/20",
    season: "Summer",
  },

  // Art Exhibit - Midnight Bloom (museum at night, contemplative depth)
  // Deep violet evokes the museum after hours - curated, thoughtful, dreamy
  exhibit: {
    iconBg: "bg-violet-100",
    iconBgDark: "dark:bg-violet-900/30",
    text: "text-violet-600",
    textDark: "dark:text-violet-400",
    textHover: "hover:text-violet-700",
    textHoverDark: "dark:hover:text-violet-300",
    badgeBg: "bg-violet-100",
    badgeBgDark: "dark:bg-violet-900/30",
    badgeText: "text-violet-800",
    badgeTextDark: "dark:text-violet-300",
    ctaBg: "bg-violet-50",
    ctaBgDark: "dark:bg-violet-900/20",
    ctaBorder: "border-violet-200",
    ctaBorderDark: "dark:border-violet-800",
    buttonBg: "bg-violet-600 dark:bg-violet-500",
    buttonHover: "hover:bg-violet-700 dark:hover:bg-violet-600",
    cardBg: "bg-violet-50",
    cardBgDark: "dark:bg-violet-900/20",
    season: "Midnight",
  },
};

/**
 * Human-readable category labels
 */
export const categoryLabels: Record<DocCategory, string> = {
  help: "Help Center",
  legal: "Legal & Policies",
  specs: "Technical Specifications",
  philosophy: "Philosophy",
  design: "Design",
  patterns: "Architecture Patterns",
  marketing: "Marketing & Launch",
  exhibit: "Art Exhibit",
};
