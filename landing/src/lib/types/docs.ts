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
  | "developer";

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
  | "writing-publishing"
  | "customization"
  | "community-social"
  | "account-billing"
  | "privacy-security"
  | "ai-features"
  | "philosophy-vision"
  | "support-resources"
  | "troubleshooting";

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
  /** Optional array of related article slugs */
  related?: string[];
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
