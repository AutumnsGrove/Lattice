/**
 * Badges Curio
 *
 * Collectible achievement badges celebrating personal milestones.
 * Badges celebrate what you've done, not pressure you into doing more.
 *
 * Features:
 * - System badges (auto-awarded based on activity)
 * - Community badges (Wayfinder-awarded)
 * - Custom badges (Oak+, tenant-created)
 * - Showcase system (pick badges to display prominently)
 * - Rarity levels: common, uncommon, rare
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Badge category
 */
export type BadgeCategory = "achievement" | "community" | "custom";

/**
 * Badge rarity
 */
export type BadgeRarity = "common" | "uncommon" | "rare";

/**
 * Badge definition record
 */
export interface BadgeDefinitionRecord {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  autoCriteria: string | null;
  isSystem: boolean;
  createdAt: string;
}

/**
 * Earned badge record
 */
export interface TenantBadgeRecord {
  id: string;
  tenantId: string;
  badgeId: string;
  earnedAt: string;
  displayOrder: number;
  isShowcased: boolean;
}

/**
 * Custom badge record
 */
export interface CustomBadgeRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  iconUrl: string;
  createdAt: string;
}

/**
 * Badge for public display
 */
export interface BadgeDisplay {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  earnedAt: string;
  isShowcased: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Badge category options
 */
export const BADGE_CATEGORY_OPTIONS: {
  value: BadgeCategory;
  label: string;
}[] = [
  { value: "achievement", label: "Achievement" },
  { value: "community", label: "Community" },
  { value: "custom", label: "Custom" },
];

/**
 * Badge rarity options
 */
export const BADGE_RARITY_OPTIONS: {
  value: BadgeRarity;
  label: string;
  color: string;
}[] = [
  { value: "common", label: "Common", color: "#cd7f32" },
  { value: "uncommon", label: "Uncommon", color: "#c0c0c0" },
  { value: "rare", label: "Rare", color: "#ffd700" },
];

/**
 * System badge definitions
 */
export const SYSTEM_BADGES: {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  criteria: string;
}[] = [
  {
    id: "badge_early_adopter",
    name: "Early Adopter",
    description: "Joined during the beta period",
    category: "achievement",
    rarity: "rare",
    criteria: "signup_during_beta",
  },
  {
    id: "badge_first_post",
    name: "First Post",
    description: "Published your first blog post",
    category: "achievement",
    rarity: "common",
    criteria: "posts_count_gte_1",
  },
  {
    id: "badge_prolific_writer",
    name: "Prolific Writer",
    description: "Published 50 or more posts",
    category: "achievement",
    rarity: "uncommon",
    criteria: "posts_count_gte_50",
  },
  {
    id: "badge_centurion",
    name: "Centurion",
    description: "Published 100 or more posts",
    category: "achievement",
    rarity: "rare",
    criteria: "posts_count_gte_100",
  },
  {
    id: "badge_night_owl",
    name: "Night Owl",
    description: "Over half your posts published between 10pm and 4am",
    category: "achievement",
    rarity: "uncommon",
    criteria: "night_posts_majority",
  },
  {
    id: "badge_early_bird",
    name: "Early Bird",
    description: "Over half your posts published between 5am and 9am",
    category: "achievement",
    rarity: "uncommon",
    criteria: "morning_posts_majority",
  },
  {
    id: "badge_consistent",
    name: "Consistent",
    description: "Posted every week for 4 or more weeks",
    category: "achievement",
    rarity: "uncommon",
    criteria: "weekly_streak_gte_4",
  },
  {
    id: "badge_gallery_keeper",
    name: "Gallery Keeper",
    description: "Uploaded 50 or more gallery images",
    category: "achievement",
    rarity: "uncommon",
    criteria: "gallery_count_gte_50",
  },
  {
    id: "badge_guestbook_star",
    name: "Guestbook Star",
    description: "Received 100 or more guestbook signatures",
    category: "achievement",
    rarity: "rare",
    criteria: "guestbook_count_gte_100",
  },
  {
    id: "badge_webring_walker",
    name: "Webring Walker",
    description: "Member of 3 or more webrings",
    category: "achievement",
    rarity: "uncommon",
    criteria: "webring_count_gte_3",
  },
  {
    id: "badge_curator",
    name: "Curator",
    description: "Added 25 or more links to Link Gardens",
    category: "achievement",
    rarity: "common",
    criteria: "links_count_gte_25",
  },
  {
    id: "badge_seasonal",
    name: "Seasonal",
    description: "Active during all four seasons",
    category: "achievement",
    rarity: "rare",
    criteria: "active_all_seasons",
  },
];

/**
 * Community badge definitions
 */
export const COMMUNITY_BADGES: {
  id: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
}[] = [
  {
    id: "badge_beta_tester",
    name: "Beta Tester",
    description: "Participated in beta testing",
    rarity: "uncommon",
  },
  {
    id: "badge_bug_hunter",
    name: "Bug Hunter",
    description: "Found and reported a bug",
    rarity: "uncommon",
  },
  {
    id: "badge_pathfinder",
    name: "Pathfinder",
    description: "Appointed community guide",
    rarity: "rare",
  },
  {
    id: "badge_seedling_nurturer",
    name: "Seedling Nurturer",
    description: "Helped new members get started",
    rarity: "uncommon",
  },
];

/**
 * Valid sets
 */
export const VALID_CATEGORIES = new Set<string>(
  BADGE_CATEGORY_OPTIONS.map((c) => c.value),
);
export const VALID_RARITIES = new Set<string>(
  BADGE_RARITY_OPTIONS.map((r) => r.value),
);

/**
 * Limits
 */
export const MAX_BADGE_NAME_LENGTH = 50;
export const MAX_BADGE_DESCRIPTION_LENGTH = 200;
export const MAX_ICON_URL_LENGTH = 2048;
export const MAX_SHOWCASE_BADGES = 5;
export const MAX_CUSTOM_BADGES = 10;

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/**
 * Generate a badge ID
 */
export function generateBadgeId(): string {
  return `badge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate a tenant badge ID
 */
export function generateTenantBadgeId(): string {
  return `tb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate a custom badge ID
 */
export function generateCustomBadgeId(): string {
  return `cb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Validate badge category
 */
export function isValidCategory(category: string): category is BadgeCategory {
  return VALID_CATEGORIES.has(category);
}

/**
 * Validate badge rarity
 */
export function isValidRarity(rarity: string): rarity is BadgeRarity {
  return VALID_RARITIES.has(rarity);
}

/**
 * Sanitize badge name
 */
export function sanitizeBadgeName(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_BADGE_NAME_LENGTH)
    return cleaned.slice(0, MAX_BADGE_NAME_LENGTH);
  return cleaned;
}

/**
 * Sanitize badge description
 */
export function sanitizeBadgeDescription(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_BADGE_DESCRIPTION_LENGTH)
    return cleaned.slice(0, MAX_BADGE_DESCRIPTION_LENGTH);
  return cleaned;
}

/**
 * Validate icon URL
 */
export function isValidIconUrl(url: string): boolean {
  if (!url || url.length > MAX_ICON_URL_LENGTH) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Get rarity color
 */
export function getRarityColor(rarity: BadgeRarity): string {
  const opt = BADGE_RARITY_OPTIONS.find((r) => r.value === rarity);
  return opt?.color ?? "#cd7f32";
}

/**
 * Get system badge by ID
 */
export function getSystemBadge(
  id: string,
): (typeof SYSTEM_BADGES)[number] | undefined {
  return SYSTEM_BADGES.find((b) => b.id === id);
}

/**
 * Transform to display badge
 */
export function toDisplayBadge(
  definition: BadgeDefinitionRecord,
  earned: TenantBadgeRecord,
): BadgeDisplay {
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    iconUrl: definition.iconUrl,
    category: definition.category,
    rarity: definition.rarity,
    earnedAt: earned.earnedAt,
    isShowcased: earned.isShowcased,
  };
}
