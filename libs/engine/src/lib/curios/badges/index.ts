/**
 * Badges Curio v2
 *
 * Glass ornaments — collectible achievement badges celebrating personal milestones.
 * Translucent, precious, catches the light. Collectible treasures displayed
 * in your personal cabinet of wonders.
 *
 * Features:
 * - System badges (auto-awarded based on activity)
 * - Community badges (Wayfinder-awarded)
 * - Custom badges (Oak+, tenant-created)
 * - Pre-built badge library (retro web, pride, seasonal, achievement)
 * - Showcase system (pick badges to display prominently)
 * - 5 rarity levels with glass clarity + glow + depth
 * - 3 wall layouts (pinboard, shadow box, journal page)
 * - 3 showcase styles (glowing shelf, pinned to header, larger + centered)
 * - User-selectable badge sizes (small, medium, large)
 * - Badge icon registry for swappable artwork
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Badge category — groups badges by origin/theme
 */
export type BadgeCategory =
  | "achievement"
  | "community"
  | "custom"
  | "retro-web"
  | "pride"
  | "seasonal";

/**
 * Badge rarity — determines glass clarity, glow, and depth
 *
 * | Rarity    | Glass clarity       | Glow                             | Depth                   |
 * |-----------|---------------------|----------------------------------|-------------------------|
 * | common    | Cloudy/frosted      | None                             | Simple flat pane        |
 * | uncommon  | Clearer             | Soft warm edge glow              | Slight depth            |
 * | rare      | Crystal clear       | Visible aura, rainbow refraction | Noticeable depth        |
 * | epic      | Deep, gemstone-like | Gentle pulse                     | Visible internal layers |
 * | legendary | Prismatic, alive    | Inner light, radiance            | Multiple depth layers   |
 */
export type BadgeRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary";

/**
 * Badge shape — derived from category
 */
export type BadgeShape = "rectangle" | "shield" | "leaf" | "star";

/**
 * Wall layout — how the badge collection is arranged
 */
export type WallLayout = "pinboard" | "shadow-box" | "journal-page";

/**
 * Showcase style — how showcased badges are emphasized
 */
export type ShowcaseStyle =
  | "glowing-shelf"
  | "pinned-to-header"
  | "larger-centered";

/**
 * Badge size — user-selectable display size
 */
export type BadgeSize = "small" | "medium" | "large";

/**
 * Badge definition record (from database)
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
 * Earned badge record (from database)
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
 * Custom badge record (from database)
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
 * Badges display configuration (from database)
 */
export interface BadgesConfigRecord {
  tenantId: string;
  wallLayout: WallLayout;
  showcaseStyle: ShowcaseStyle;
  badgeSize: BadgeSize;
  createdAt: string;
  updatedAt: string;
}

/**
 * Badge for public display — combines definition + earned metadata
 */
export interface BadgeDisplay {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  shape: BadgeShape;
  earnedAt: string;
  isShowcased: boolean;
}

/**
 * Config for public display
 */
export interface BadgesDisplayConfig {
  wallLayout: WallLayout;
  showcaseStyle: ShowcaseStyle;
  badgeSize: BadgeSize;
}

/**
 * Pre-built badge definition (used in library, not DB)
 */
export interface PrebuiltBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
}

// =============================================================================
// Constants — Display Options
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
  { value: "retro-web", label: "Retro Web" },
  { value: "pride", label: "Pride & Identity" },
  { value: "seasonal", label: "Seasonal & Nature" },
  { value: "custom", label: "Custom" },
];

/**
 * Badge rarity options — grove palette colors
 *
 * Moved from generic bronze/silver/gold to grove-feel:
 * bark, leaf, crystal, amethyst, amber
 */
export const BADGE_RARITY_OPTIONS: {
  value: BadgeRarity;
  label: string;
  color: string;
  glowColor: string;
}[] = [
  {
    value: "common",
    label: "Common",
    color: "#8B7355",
    glowColor: "transparent",
  },
  {
    value: "uncommon",
    label: "Uncommon",
    color: "#5A9E6F",
    glowColor: "rgba(90, 158, 111, 0.3)",
  },
  {
    value: "rare",
    label: "Rare",
    color: "#6BA3BE",
    glowColor: "rgba(107, 163, 190, 0.4)",
  },
  {
    value: "epic",
    label: "Epic",
    color: "#9B7DB8",
    glowColor: "rgba(155, 125, 184, 0.5)",
  },
  {
    value: "legendary",
    label: "Legendary",
    color: "#D4A056",
    glowColor: "rgba(212, 160, 86, 0.6)",
  },
];

/**
 * Wall layout options
 */
export const WALL_LAYOUT_OPTIONS: {
  value: WallLayout;
  label: string;
  description: string;
}[] = [
  {
    value: "shadow-box",
    label: "Shadow Box",
    description: "Neat grid, glass case. Museum-like but cozy.",
  },
  {
    value: "pinboard",
    label: "Pinboard",
    description: "Organic scatter, cork warmth, slightly rotated badges.",
  },
  {
    value: "journal-page",
    label: "Journal Page",
    description: "Cream background, scattered like diary stickers.",
  },
];

/**
 * Showcase style options
 */
export const SHOWCASE_STYLE_OPTIONS: {
  value: ShowcaseStyle;
  label: string;
  description: string;
}[] = [
  {
    value: "glowing-shelf",
    label: "Glowing Shelf",
    description: "Glass shelf above wall, badges float with soft glow.",
  },
  {
    value: "pinned-to-header",
    label: "Pinned to Header",
    description: "Badges near site name/bio, like lapel pins.",
  },
  {
    value: "larger-centered",
    label: "Larger & Centered",
    description: "Inline with wall but emphasized with shimmer.",
  },
];

/**
 * Badge size options
 */
export const BADGE_SIZE_OPTIONS: {
  value: BadgeSize;
  label: string;
  px: number;
}[] = [
  { value: "small", label: "Small", px: 56 },
  { value: "medium", label: "Medium", px: 88 },
  { value: "large", label: "Large", px: 140 },
];

/**
 * Default config values
 */
export const DEFAULT_CONFIG: BadgesDisplayConfig = {
  wallLayout: "shadow-box",
  showcaseStyle: "glowing-shelf",
  badgeSize: "medium",
};

/**
 * Category to shape mapping
 */
export const CATEGORY_SHAPES: Record<BadgeCategory, BadgeShape> = {
  "retro-web": "rectangle",
  pride: "shield",
  seasonal: "leaf",
  achievement: "star",
  community: "star",
  custom: "rectangle",
};

// =============================================================================
// Constants — Badge Library
// =============================================================================

/**
 * Badge icon registry — maps badge IDs to Lucide icon names.
 * One swap in registry, all badges update.
 *
 * Strategy: Lucide (now) → AI-generated (next) → custom SVG (goal)
 */
export const BADGE_ICON_REGISTRY: Record<string, string> = {
  // System / Achievement
  badge_early_adopter: "sprout",
  badge_first_post: "pen-line",
  badge_prolific_writer: "book-open",
  badge_centurion: "crown",
  badge_night_owl: "moon",
  badge_early_bird: "sun",
  badge_consistent: "calendar",
  badge_gallery_keeper: "camera",
  badge_guestbook_star: "message-circle",
  badge_webring_walker: "link-2",
  badge_curator: "bookmark",
  badge_seasonal: "leaf",

  // Community
  badge_beta_tester: "flask-conical",
  badge_bug_hunter: "search-code",
  badge_pathfinder: "compass",
  badge_seedling_nurturer: "heart",

  // Retro Web
  badge_made_with_grove: "trees",
  badge_powered_by_svelte: "zap",
  badge_best_viewed_firefox: "globe",
  badge_handmade: "hammer",
  badge_no_algorithms: "shield-off",
  badge_indie_web_citizen: "flag",
  badge_webgardener: "flower-2",
  badge_html_first_language: "code",
  badge_rss_not_dead: "rss",
  badge_no_cookies: "cookie",
  badge_under_construction_retro: "hard-hat",

  // Pride & Identity
  badge_pride_rainbow: "rainbow",
  badge_pride_trans: "heart",
  badge_pride_bi: "heart",
  badge_pride_pan: "heart",
  badge_pride_ace: "heart",
  badge_pride_aro: "heart",
  badge_pride_nonbinary: "heart",
  badge_pride_lesbian: "heart",
  badge_pride_gay: "heart",
  badge_pride_genderqueer: "heart",
  badge_pride_genderfluid: "heart",
  badge_pride_intersex: "heart",
  badge_pride_polyamorous: "heart",
  badge_pride_agender: "heart",
  badge_pride_demisexual: "heart",
  badge_pride_progress: "heart",
  badge_pronouns_he: "user",
  badge_pronouns_she: "user",
  badge_pronouns_they: "user",
  badge_pronouns_hethey: "user",
  badge_pronouns_shethey: "user",
  badge_pronouns_any: "user",
  badge_pronouns_ask: "help-circle",
  badge_queer_site: "sparkles",
  badge_safe_space: "shield-check",
  badge_allies_welcome: "hand-heart",

  // Seasonal & Nature
  badge_spring_blossom: "flower-2",
  badge_summer_sun: "sun",
  badge_autumn_leaf: "leaf",
  badge_winter_frost: "snowflake",
  badge_mushroom_collector: "tree-pine",
  badge_stargazer: "star",
  badge_rain_lover: "cloud-rain",
  badge_firefly_catcher: "sparkles",
  badge_forest_dweller: "trees",
  badge_moonchild: "moon",
};

/**
 * Resolve icon for a badge ID — returns the registry icon or a fallback
 */
export function getBadgeIcon(badgeId: string): string {
  return BADGE_ICON_REGISTRY[badgeId] ?? "award";
}

/**
 * System badge definitions — auto-awarded milestones
 */
export const SYSTEM_BADGES: {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  criteria: string;
}[] = [
  {
    id: "badge_early_adopter",
    name: "Early Adopter",
    description: "Joined during the beta period",
    icon: "sprout",
    category: "achievement",
    rarity: "rare",
    criteria: "signup_during_beta",
  },
  {
    id: "badge_first_post",
    name: "First Post",
    description: "Published your first blog post",
    icon: "pen-line",
    category: "achievement",
    rarity: "common",
    criteria: "posts_count_gte_1",
  },
  {
    id: "badge_prolific_writer",
    name: "Prolific Writer",
    description: "Published 50 or more posts",
    icon: "book-open",
    category: "achievement",
    rarity: "uncommon",
    criteria: "posts_count_gte_50",
  },
  {
    id: "badge_centurion",
    name: "Centurion",
    description: "Published 100 or more posts",
    icon: "crown",
    category: "achievement",
    rarity: "rare",
    criteria: "posts_count_gte_100",
  },
  {
    id: "badge_night_owl",
    name: "Night Owl",
    description: "Over half your posts published between 10pm and 4am",
    icon: "moon",
    category: "achievement",
    rarity: "uncommon",
    criteria: "night_posts_majority",
  },
  {
    id: "badge_early_bird",
    name: "Early Bird",
    description: "Over half your posts published between 5am and 9am",
    icon: "sun",
    category: "achievement",
    rarity: "uncommon",
    criteria: "morning_posts_majority",
  },
  {
    id: "badge_consistent",
    name: "Consistent",
    description: "Posted every week for 4 or more weeks",
    icon: "calendar",
    category: "achievement",
    rarity: "uncommon",
    criteria: "weekly_streak_gte_4",
  },
  {
    id: "badge_gallery_keeper",
    name: "Gallery Keeper",
    description: "Uploaded 50 or more gallery images",
    icon: "camera",
    category: "achievement",
    rarity: "uncommon",
    criteria: "gallery_count_gte_50",
  },
  {
    id: "badge_guestbook_star",
    name: "Guestbook Star",
    description: "Received 100 or more guestbook signatures",
    icon: "message-circle",
    category: "achievement",
    rarity: "rare",
    criteria: "guestbook_count_gte_100",
  },
  {
    id: "badge_webring_walker",
    name: "Webring Walker",
    description: "Member of 3 or more webrings",
    icon: "link-2",
    category: "achievement",
    rarity: "uncommon",
    criteria: "webring_count_gte_3",
  },
  {
    id: "badge_curator",
    name: "Curator",
    description: "Added 25 or more links to Link Gardens",
    icon: "bookmark",
    category: "achievement",
    rarity: "common",
    criteria: "links_count_gte_25",
  },
  {
    id: "badge_seasonal",
    name: "Seasonal",
    description: "Active during all four seasons",
    icon: "leaf",
    category: "achievement",
    rarity: "rare",
    criteria: "active_all_seasons",
  },
];

/**
 * Community badge definitions — Wayfinder-awarded
 */
export const COMMUNITY_BADGES: {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
}[] = [
  {
    id: "badge_beta_tester",
    name: "Beta Tester",
    description: "Participated in beta testing",
    icon: "flask-conical",
    rarity: "uncommon",
  },
  {
    id: "badge_bug_hunter",
    name: "Bug Hunter",
    description: "Found and reported a bug",
    icon: "search-code",
    rarity: "uncommon",
  },
  {
    id: "badge_pathfinder",
    name: "Pathfinder",
    description: "Appointed community guide",
    icon: "compass",
    rarity: "rare",
  },
  {
    id: "badge_seedling_nurturer",
    name: "Seedling Nurturer",
    description: "Helped new members get started",
    icon: "heart",
    rarity: "uncommon",
  },
];

/**
 * Pre-built badge library — retro web badges
 */
export const RETRO_WEB_BADGES: PrebuiltBadge[] = [
  {
    id: "badge_made_with_grove",
    name: "Made with Grove",
    description: "Built on the Grove platform",
    icon: "trees",
    category: "retro-web",
    rarity: "common",
  },
  {
    id: "badge_powered_by_svelte",
    name: "Powered by Svelte",
    description: "Built with SvelteKit under the hood",
    icon: "zap",
    category: "retro-web",
    rarity: "common",
  },
  {
    id: "badge_best_viewed_firefox",
    name: "Best Viewed in Firefox",
    description: "A nod to the browsers we love",
    icon: "globe",
    category: "retro-web",
    rarity: "common",
  },
  {
    id: "badge_handmade",
    name: "This Site is Handmade",
    description: "Crafted with care, not generated",
    icon: "hammer",
    category: "retro-web",
    rarity: "common",
  },
  {
    id: "badge_no_algorithms",
    name: "No Algorithms Here",
    description: "Just content, no manipulation",
    icon: "shield-off",
    category: "retro-web",
    rarity: "common",
  },
  {
    id: "badge_indie_web_citizen",
    name: "Indie Web Citizen",
    description: "Part of the independent web",
    icon: "flag",
    category: "retro-web",
    rarity: "common",
  },
  {
    id: "badge_webgardener",
    name: "Webgardener",
    description: "Tending the digital garden",
    icon: "flower-2",
    category: "retro-web",
    rarity: "common",
  },
  {
    id: "badge_html_first_language",
    name: "HTML Was My First Language",
    description: "Started from the source",
    icon: "code",
    category: "retro-web",
    rarity: "common",
  },
  {
    id: "badge_rss_not_dead",
    name: "RSS is Not Dead",
    description: "Long live syndication",
    icon: "rss",
    category: "retro-web",
    rarity: "common",
  },
  {
    id: "badge_no_cookies",
    name: "No Cookies (Just Vibes)",
    description: "Privacy-first, tracking-free",
    icon: "cookie",
    category: "retro-web",
    rarity: "common",
  },
  {
    id: "badge_under_construction_retro",
    name: "Under Construction",
    description: "Forever building, never done",
    icon: "hard-hat",
    category: "retro-web",
    rarity: "common",
  },
];

/**
 * Pride flag color definitions — glass IS the flag
 * Frosted glass pane tinted with flag colors, like stained glass segments.
 */
export const PRIDE_FLAG_COLORS: Record<string, string[]> = {
  badge_pride_rainbow: [
    "#E40303",
    "#FF8C00",
    "#FFED00",
    "#008026",
    "#004DFF",
    "#750787",
  ],
  badge_pride_trans: ["#5BCEFA", "#F5A9B8", "#FFFFFF", "#F5A9B8", "#5BCEFA"],
  badge_pride_bi: ["#D60270", "#9B4F96", "#0038A8"],
  badge_pride_pan: ["#FF218C", "#FFD800", "#21B1FF"],
  badge_pride_ace: ["#000000", "#A3A3A3", "#FFFFFF", "#800080"],
  badge_pride_aro: ["#3DA542", "#A7D379", "#FFFFFF", "#A9A9A9", "#000000"],
  badge_pride_nonbinary: ["#FCF434", "#FFFFFF", "#9C59D1", "#2C2C2C"],
  badge_pride_lesbian: [
    "#D52D00",
    "#EF7627",
    "#FF9A56",
    "#FFFFFF",
    "#D162A4",
    "#B55690",
    "#A30262",
  ],
  badge_pride_gay: [
    "#078D70",
    "#26CEAA",
    "#98E8C1",
    "#FFFFFF",
    "#7BADE2",
    "#5049CC",
    "#3D1A78",
  ],
  badge_pride_genderqueer: ["#B57EDC", "#FFFFFF", "#4A8123"],
  badge_pride_genderfluid: [
    "#FF76A4",
    "#FFFFFF",
    "#C011A7",
    "#000000",
    "#2F3CBE",
  ],
  badge_pride_intersex: ["#FFD800", "#7902AA"],
  badge_pride_polyamorous: ["#0000FF", "#FF0000", "#000000"],
  badge_pride_agender: [
    "#000000",
    "#BCC4C7",
    "#FFFFFF",
    "#B7F684",
    "#FFFFFF",
    "#BCC4C7",
    "#000000",
  ],
  badge_pride_demisexual: ["#000000", "#6E0071", "#D2D2D2", "#FFFFFF"],
  badge_pride_progress: [
    "#E40303",
    "#FF8C00",
    "#FFED00",
    "#008026",
    "#004DFF",
    "#750787",
    "#FFFFFF",
    "#F5A9B8",
    "#5BCEFA",
    "#613915",
    "#000000",
  ],
};

/**
 * Pre-built badge library — pride & identity badges
 */
export const PRIDE_BADGES: PrebuiltBadge[] = [
  {
    id: "badge_pride_rainbow",
    name: "Rainbow Pride",
    description: "LGBTQ+ pride",
    icon: "rainbow",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pride_trans",
    name: "Trans Pride",
    description: "Transgender pride",
    icon: "heart",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pride_bi",
    name: "Bi Pride",
    description: "Bisexual pride",
    icon: "heart",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pride_pan",
    name: "Pan Pride",
    description: "Pansexual pride",
    icon: "heart",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pride_ace",
    name: "Ace Pride",
    description: "Asexual pride",
    icon: "heart",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pride_aro",
    name: "Aro Pride",
    description: "Aromantic pride",
    icon: "heart",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pride_nonbinary",
    name: "Nonbinary Pride",
    description: "Nonbinary pride",
    icon: "heart",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pride_lesbian",
    name: "Lesbian Pride",
    description: "Lesbian pride",
    icon: "heart",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pride_gay",
    name: "Gay Pride",
    description: "Gay pride",
    icon: "heart",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pride_genderqueer",
    name: "Genderqueer Pride",
    description: "Genderqueer pride",
    icon: "heart",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pride_genderfluid",
    name: "Genderfluid Pride",
    description: "Genderfluid pride",
    icon: "heart",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pride_intersex",
    name: "Intersex Pride",
    description: "Intersex pride",
    icon: "heart",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pride_polyamorous",
    name: "Polyamorous Pride",
    description: "Polyamorous pride",
    icon: "heart",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pride_agender",
    name: "Agender Pride",
    description: "Agender pride",
    icon: "heart",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pride_demisexual",
    name: "Demisexual Pride",
    description: "Demisexual pride",
    icon: "heart",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pride_progress",
    name: "Progress Pride",
    description: "Inclusive progress pride",
    icon: "heart",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pronouns_he",
    name: "He/Him",
    description: "Pronoun badge",
    icon: "user",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pronouns_she",
    name: "She/Her",
    description: "Pronoun badge",
    icon: "user",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pronouns_they",
    name: "They/Them",
    description: "Pronoun badge",
    icon: "user",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pronouns_hethey",
    name: "He/They",
    description: "Pronoun badge",
    icon: "user",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pronouns_shethey",
    name: "She/They",
    description: "Pronoun badge",
    icon: "user",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pronouns_any",
    name: "Any Pronouns",
    description: "Pronoun badge",
    icon: "user",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_pronouns_ask",
    name: "Ask Me",
    description: "Ask me my pronouns",
    icon: "help-circle",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_queer_site",
    name: "This Site is Queer",
    description: "Proudly queer space",
    icon: "sparkles",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_safe_space",
    name: "Safe Space",
    description: "A welcoming, safe environment",
    icon: "shield-check",
    category: "pride",
    rarity: "common",
  },
  {
    id: "badge_allies_welcome",
    name: "Allies Welcome",
    description: "Open arms for supporters",
    icon: "hand-heart",
    category: "pride",
    rarity: "common",
  },
];

/**
 * Pre-built badge library — seasonal & nature badges
 */
export const SEASONAL_BADGES: PrebuiltBadge[] = [
  {
    id: "badge_spring_blossom",
    name: "Spring Blossom",
    description: "The grove awakens",
    icon: "flower-2",
    category: "seasonal",
    rarity: "common",
  },
  {
    id: "badge_summer_sun",
    name: "Summer Sun",
    description: "Warm days, long light",
    icon: "sun",
    category: "seasonal",
    rarity: "common",
  },
  {
    id: "badge_autumn_leaf",
    name: "Autumn Leaf",
    description: "Golden change",
    icon: "leaf",
    category: "seasonal",
    rarity: "common",
  },
  {
    id: "badge_winter_frost",
    name: "Winter Frost",
    description: "Quiet, crystalline rest",
    icon: "snowflake",
    category: "seasonal",
    rarity: "common",
  },
  {
    id: "badge_mushroom_collector",
    name: "Mushroom Collector",
    description: "Finding treasures in the undergrowth",
    icon: "tree-pine",
    category: "seasonal",
    rarity: "uncommon",
  },
  {
    id: "badge_stargazer",
    name: "Stargazer",
    description: "Eyes on the night sky",
    icon: "star",
    category: "seasonal",
    rarity: "uncommon",
  },
  {
    id: "badge_rain_lover",
    name: "Rain Lover",
    description: "Finding peace in the downpour",
    icon: "cloud-rain",
    category: "seasonal",
    rarity: "common",
  },
  {
    id: "badge_firefly_catcher",
    name: "Firefly Catcher",
    description: "Collecting tiny lights",
    icon: "sparkles",
    category: "seasonal",
    rarity: "uncommon",
  },
  {
    id: "badge_forest_dweller",
    name: "Forest Dweller",
    description: "At home among the trees",
    icon: "trees",
    category: "seasonal",
    rarity: "common",
  },
  {
    id: "badge_moonchild",
    name: "Moonchild",
    description: "Drawn to the silver light",
    icon: "moon",
    category: "seasonal",
    rarity: "uncommon",
  },
];

/**
 * All pre-built badges combined
 */
export const ALL_PREBUILT_BADGES: PrebuiltBadge[] = [
  ...RETRO_WEB_BADGES,
  ...PRIDE_BADGES,
  ...SEASONAL_BADGES,
];

/**
 * Get all pre-built badges grouped by category
 */
export function getPrebuiltBadgesByCategory(): Record<string, PrebuiltBadge[]> {
  const grouped: Record<string, PrebuiltBadge[]> = {};
  for (const badge of ALL_PREBUILT_BADGES) {
    if (!grouped[badge.category]) grouped[badge.category] = [];
    grouped[badge.category].push(badge);
  }
  return grouped;
}

// =============================================================================
// Valid Sets
// =============================================================================

export const VALID_CATEGORIES = new Set<string>(
  BADGE_CATEGORY_OPTIONS.map((c) => c.value),
);
export const VALID_RARITIES = new Set<string>(
  BADGE_RARITY_OPTIONS.map((r) => r.value),
);
export const VALID_WALL_LAYOUTS = new Set<string>(
  WALL_LAYOUT_OPTIONS.map((l) => l.value),
);
export const VALID_SHOWCASE_STYLES = new Set<string>(
  SHOWCASE_STYLE_OPTIONS.map((s) => s.value),
);
export const VALID_BADGE_SIZES = new Set<string>(
  BADGE_SIZE_OPTIONS.map((s) => s.value),
);

// =============================================================================
// Limits
// =============================================================================

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
 * Validate wall layout
 */
export function isValidWallLayout(layout: string): layout is WallLayout {
  return VALID_WALL_LAYOUTS.has(layout);
}

/**
 * Validate showcase style
 */
export function isValidShowcaseStyle(style: string): style is ShowcaseStyle {
  return VALID_SHOWCASE_STYLES.has(style);
}

/**
 * Validate badge size
 */
export function isValidBadgeSize(size: string): size is BadgeSize {
  return VALID_BADGE_SIZES.has(size);
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
  return opt?.color ?? "#8B7355";
}

/**
 * Get rarity glow color
 */
export function getRarityGlowColor(rarity: BadgeRarity): string {
  const opt = BADGE_RARITY_OPTIONS.find((r) => r.value === rarity);
  return opt?.glowColor ?? "transparent";
}

/**
 * Get badge shape from category
 */
export function getBadgeShape(category: BadgeCategory): BadgeShape {
  return CATEGORY_SHAPES[category] ?? "rectangle";
}

/**
 * Get badge size in pixels
 */
export function getBadgeSizePx(size: BadgeSize): number {
  const opt = BADGE_SIZE_OPTIONS.find((s) => s.value === size);
  return opt?.px ?? 88;
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
 * Get pride flag colors for a badge ID, or null if not a pride badge
 */
export function getPrideFlagColors(badgeId: string): string[] | null {
  return PRIDE_FLAG_COLORS[badgeId] ?? null;
}

/**
 * Transform DB records to display badge
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
    icon: getBadgeIcon(definition.id),
    category: definition.category,
    rarity: definition.rarity,
    shape: getBadgeShape(definition.category),
    earnedAt: earned.earnedAt,
    isShowcased: earned.isShowcased,
  };
}

/**
 * Format earned date for display
 */
export function formatEarnedDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
