/**
 * Shared types for knowledge base documents.
 *
 * Note on HTML rendering: Document content is rendered using {@html} in Svelte
 * components. This is safe because all markdown files are version-controlled
 * source code in the docs/ directory - they are not user-generated content.
 */

/** Document category */
export type DocCategory =
  | "specs"
  | "help"
  | "legal"
  | "marketing"
  | "patterns"
  | "philosophy"
  | "design"
  | "exhibit";

/** Exhibit wing categories (museum organization) */
export type ExhibitWing =
  | "entrance"
  | "architecture"
  | "nature"
  | "trust"
  | "data"
  | "personalization"
  | "community"
  | "naming";

/** Spec subcategories (mirrors workshop page organization) */
export type SpecCategory =
  | "core-infrastructure"
  | "platform-services"
  | "content-community"
  | "standalone-tools"
  | "operations"
  | "reference";

/** Help Center sections */
export type HelpSection =
  | "getting-started"
  | "how-it-works"
  | "writing-publishing"
  | "customization"
  | "community-social"
  | "account-billing"
  | "privacy-security"
  | "ai-features"
  | "philosophy-vision"
  | "support-resources"
  | "troubleshooting";

/**
 * Frontmatter schema for markdown documents.
 * This is the source of truth for document metadata - lives in each .md file.
 */
export interface DocFrontmatter {
  // === REQUIRED ===
  /** Document title (e.g., "Heartwood — Centralized Authentication") */
  title: string;
  /** Brief description for listings and SEO */
  description: string;
  /** Document category */
  category: DocCategory;

  // === CATEGORY-SPECIFIC (required for that category) ===
  /** Spec subcategory - required for specs only */
  specCategory?: SpecCategory;
  /** Help section - required for help articles only */
  section?: HelpSection;
  /** Exhibit wing - required for exhibit docs only */
  exhibitWing?: ExhibitWing;

  // === OPTIONAL ===
  /** Lucide icon key (matches keys in toolIcons) */
  icon?: string;
  /** Last updated date in ISO format (YYYY-MM-DD) */
  lastUpdated?: string;
  /** Related document slugs */
  related?: string[];
  /** Search keywords */
  keywords?: string[];
  /** Manual sort order (lower = first) */
  order?: number;
  /** Set false to hide from listings (default: true) */
  published?: boolean;

  // === LEGACY (preserved for Obsidian compatibility) ===
  /** Obsidian aliases */
  aliases?: string[];
  /** Obsidian tags */
  tags?: string[];
}

/** Base document metadata (used for listings and static data) */
export interface Doc extends Record<string, unknown> {
  slug: string;
  title: string;
  description?: string;
  excerpt: string;
  category: DocCategory;
  lastUpdated?: string;
  readingTime: number;
  /** Optional icon key for documents (matches keys in toolIcons) */
  icon?: string;
  /** Optional spec subcategory for grouping specs like workshop page */
  specCategory?: SpecCategory;
  /** Optional help section for grouping help articles */
  section?: HelpSection;
  /** Optional exhibit wing for museum organization */
  exhibitWing?: ExhibitWing;
  /** Optional array of related article slugs */
  related?: string[];
  /** Search keywords from frontmatter */
  keywords?: string[];
  /** Sort order from frontmatter */
  order?: number;
}

/** Header extracted from markdown for table of contents */
export interface DocHeader {
  level: number;
  text: string;
  id: string;
}

/** Document with full content loaded (used for individual article pages) */
export interface DocWithContent extends Doc {
  /** Raw markdown content */
  content: string;
  /** Rendered HTML content (safe to use with {@html} - see note above) */
  html: string;
  /** Headers for table of contents */
  headers: DocHeader[];
}
